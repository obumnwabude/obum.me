import { handleApi } from './api';
import type { Env, LinkRef } from './env';
import { logVisit } from './firestore';
import { resolveLink } from './links';
import { notFoundPage, unavailablePage } from './not-found';
import { deviceOf, writeDataPoint, type Outcome } from './visit';

function slugOf(pathname: string): string {
  const segment = pathname.split('/')[1] ?? '';
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

const html = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    // www.obum.me/anything -> obum.me/anything
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith('/_api/')) return handleApi(request, env);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
    }

    const slug = slugOf(url.pathname);
    const device = deviceOf(request.headers.get('user-agent') ?? '');
    const record = (outcome: Outcome, link: LinkRef | null) => {
      writeDataPoint(env, request, slug, outcome, link, device);
      ctx.waitUntil(
        logVisit(env, { request, path: url.pathname + url.search, link, isBot: device === 'bot' }).catch((error) =>
          console.error('Visit logging failed', error),
        ),
      );
    };

    if (!slug) {
      record('home', null);
      return Response.redirect(env.HOME_URL, 301);
    }

    let link: LinkRef | null;
    try {
      link = await resolveLink(slug, env, ctx);
    } catch (error) {
      console.error(error);
      return html(unavailablePage(slug), 503);
    }

    record(link ? 'hit' : 'miss', link);
    if (!link) return html(notFoundPage(slug), 404);
    return new Response(null, { status: 302, headers: { location: link.long, 'cache-control': 'no-store' } });
  },
} satisfies ExportedHandler<Env>;
