import type { Env, LinkRef } from './env';

/** Link-preview fetchers, crawlers and scripts. Their hits are logged but not counted as clicks. */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|whatsapp|telegram|discord|slack|skype|embedly|preview|pinterest|vkshare|quora link|headless|lighthouse|python-requests|python-urllib|curl\/|wget|httpclient|go-http|okhttp|axios|node-fetch|java\//i;

export type Device = 'mobile' | 'tablet' | 'desktop' | 'bot';

export function deviceOf(userAgent: string): Device {
  if (!userAgent || BOT_PATTERN.test(userAgent)) return 'bot';
  if (/iPad|Tablet|PlayBook|Silk|Kindle/i.test(userAgent)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod|Opera Mini|IEMobile/i.test(userAgent)) return 'mobile';
  return 'desktop';
}

export function referrerHost(referer: string | null): string {
  if (!referer) return '(direct)';
  try {
    return new URL(referer).hostname.replace(/^www\./, '') || '(direct)';
  } catch {
    return '(unknown)';
  }
}

export type Outcome = 'hit' | 'miss' | 'home';

/**
 * Analytics Engine row layout (keep in sync with api.ts queries):
 *   index1  = slug
 *   blob1   = slug          blob2 = outcome (hit | miss | home)
 *   blob3   = country       blob4 = referrer host
 *   blob5   = device        blob6 = city
 *   blob7   = colo          blob8 = link document id
 *   double1 = 1
 */
export function writeDataPoint(env: Env, request: Request, slug: string, outcome: Outcome, link: LinkRef | null, device: Device): void {
  if (!env.CLICKS) return;
  const cf = (request.cf ?? {}) as { country?: string; city?: string; colo?: string };
  try {
    env.CLICKS.writeDataPoint({
      indexes: [slug || '/'],
      blobs: [
        slug || '/',
        outcome,
        cf.country ?? 'XX',
        referrerHost(request.headers.get('referer')),
        device,
        cf.city ?? '',
        cf.colo ?? '',
        link?.id ?? '',
      ],
      doubles: [1],
    });
  } catch (error) {
    console.error('Analytics Engine write failed', error);
  }
}
