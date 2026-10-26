import type { Env, LinkRef } from './env';
import { findLinkBySlug } from './firestore';

/** How long a resolved link stays in this data center's cache. Admin saves purge it right away. */
const FOUND_TTL_SECONDS = 120;
const MISSING_TTL_SECONDS = 30;

export const linkCacheKey = (slug: string) => new Request(`https://obum.me/_cache/link/${encodeURIComponent(slug)}`);

/** Looks the slug up in the edge cache first, then Firestore. Throws if Firestore is unreachable. */
export async function resolveLink(slug: string, env: Env, ctx: ExecutionContext): Promise<LinkRef | null> {
  const key = linkCacheKey(slug);
  const cached = await caches.default.match(key);
  if (cached) return ((await cached.json()) as { link: LinkRef | null }).link;

  const link = await findLinkBySlug(slug, env);
  const ttl = link ? FOUND_TTL_SECONDS : MISSING_TTL_SECONDS;
  ctx.waitUntil(
    caches.default.put(
      key,
      new Response(JSON.stringify({ link }), {
        headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${ttl}` },
      }),
    ),
  );
  return link;
}
