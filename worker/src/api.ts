import { verifyAdmin } from './auth';
import type { Env } from './env';
import { linkCacheKey } from './links';

const SLUG_PATTERN = /^[\w\-.~]{1,120}$/;

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('origin') ?? '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map((value) => value.trim());
  if (!allowed.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
}

function json(request: Request, env: Env, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...corsHeaders(request, env) },
  });
}

function clampDays(raw: string | null): number {
  const days = Number.parseInt(raw ?? '30', 10);
  return Number.isFinite(days) ? Math.min(Math.max(days, 1), 90) : 30;
}

type Row = Record<string, string | number>;

/** Runs a query against Workers Analytics Engine's SQL API. A dataset with no writes yet returns []. */
async function sql(env: Env, query: string): Promise<Row[]> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.CF_API_TOKEN}` },
    body: `${query} FORMAT JSON`,
  });
  const text = await response.text();
  if (!response.ok) {
    if (/unknown table|does not exist|not found/i.test(text)) return [];
    throw new Error(`Analytics query failed (${response.status}): ${text}`);
  }
  return (JSON.parse(text) as { data: Row[] }).data;
}

const num = (value: string | number | undefined) => Number(value ?? 0);
const day = (value: string | number) => String(value).slice(0, 10);

async function overview(env: Env, days: number) {
  const table = env.ANALYTICS_DATASET;
  const since = `timestamp > NOW() - INTERVAL '${days}' DAY`;
  const [daily, misses, bots] = await Promise.all([
    sql(
      env,
      `SELECT blob1 AS slug, toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, SUM(_sample_interval) AS clicks
       FROM ${table} WHERE blob2 = 'hit' AND blob5 != 'bot' AND ${since}
       GROUP BY slug, day ORDER BY day`,
    ),
    sql(
      env,
      `SELECT blob1 AS slug, SUM(_sample_interval) AS hits
       FROM ${table} WHERE blob2 = 'miss' AND blob5 != 'bot' AND ${since}
       GROUP BY slug ORDER BY hits DESC LIMIT 20`,
    ),
    sql(env, `SELECT SUM(_sample_interval) AS hits FROM ${table} WHERE blob5 = 'bot' AND ${since}`),
  ]);

  const perLink: Record<string, { total: number; daily: Record<string, number> }> = {};
  for (const row of daily) {
    const slug = String(row.slug);
    perLink[slug] ??= { total: 0, daily: {} };
    perLink[slug].total += num(row.clicks);
    perLink[slug].daily[day(row.day)] = num(row.clicks);
  }
  return {
    days,
    perLink,
    misses: misses.map((row) => ({ slug: String(row.slug), hits: num(row.hits) })),
    botHits: num(bots[0]?.hits),
  };
}

async function linkStats(env: Env, slug: string, days: number) {
  const table = env.ANALYTICS_DATASET;
  const where = `index1 = '${slug}' AND blob2 = 'hit' AND timestamp > NOW() - INTERVAL '${days}' DAY`;
  const human = `${where} AND blob5 != 'bot'`;
  const [daily, countries, referrers, devices, cities] = await Promise.all([
    sql(env, `SELECT toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day, SUM(_sample_interval) AS clicks FROM ${table} WHERE ${human} GROUP BY day ORDER BY day`),
    sql(env, `SELECT blob3 AS name, SUM(_sample_interval) AS clicks FROM ${table} WHERE ${human} GROUP BY name ORDER BY clicks DESC LIMIT 8`),
    sql(env, `SELECT blob4 AS name, SUM(_sample_interval) AS clicks FROM ${table} WHERE ${human} GROUP BY name ORDER BY clicks DESC LIMIT 8`),
    sql(env, `SELECT blob5 AS name, SUM(_sample_interval) AS clicks FROM ${table} WHERE ${where} GROUP BY name ORDER BY clicks DESC`),
    sql(env, `SELECT blob6 AS name, SUM(_sample_interval) AS clicks FROM ${table} WHERE ${human} AND blob6 != '' GROUP BY name ORDER BY clicks DESC LIMIT 8`),
  ]);
  const breakdown = (rows: Row[]) => rows.map((row) => ({ name: String(row.name), clicks: num(row.clicks) }));
  return {
    slug,
    days,
    daily: daily.map((row) => ({ day: day(row.day), clicks: num(row.clicks) })),
    countries: breakdown(countries),
    referrers: breakdown(referrers),
    devices: breakdown(devices),
    cities: breakdown(cities),
  };
}

/** Handles everything under /_api/. Only /_api/health is public. */
export async function handleApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });

  if (url.pathname === '/_api/health') {
    return json(request, env, {
      ok: true,
      clickLogging: Boolean(env.FIREBASE_SERVICE_ACCOUNT),
      analyticsWrites: Boolean(env.CLICKS),
      analyticsReads: Boolean(env.CF_API_TOKEN),
    });
  }

  const admin = await verifyAdmin(request, env);
  if (!admin) return json(request, env, { error: 'Sign in as the admin to use this endpoint.' }, 401);

  try {
    if (url.pathname === '/_api/purge' && request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { shorts?: unknown };
      const shorts = Array.isArray(body.shorts) ? body.shorts.filter((s): s is string => typeof s === 'string').slice(0, 20) : [];
      await Promise.all(shorts.map((short) => caches.default.delete(linkCacheKey(short))));
      return json(request, env, { purged: shorts });
    }

    if (!env.CF_API_TOKEN) {
      return json(request, env, { error: 'Analytics reads are not set up yet: add the CF_API_TOKEN secret to the Worker.' }, 503);
    }

    if (url.pathname === '/_api/overview' && request.method === 'GET') {
      return json(request, env, await overview(env, clampDays(url.searchParams.get('days'))));
    }

    if (url.pathname === '/_api/stats' && request.method === 'GET') {
      const slug = url.searchParams.get('short') ?? '';
      if (!SLUG_PATTERN.test(slug)) return json(request, env, { error: 'Pass a valid ?short= value.' }, 400);
      return json(request, env, await linkStats(env, slug, clampDays(url.searchParams.get('days'))));
    }
  } catch (error) {
    console.error(error);
    return json(request, env, { error: error instanceof Error ? error.message : 'Unexpected error' }, 502);
  }

  return json(request, env, { error: 'Not found' }, 404);
}
