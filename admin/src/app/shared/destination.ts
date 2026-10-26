export interface Destination {
  /** Group name used for filter chips, e.g. "Google Slides". */
  label: string;
  /** Hostname without "www.", e.g. "docs.google.com". */
  host: string;
  /** Path + query, for display under the slug. */
  rest: string;
}

const REFERRAL = /(^|\.)pxf\.io$|aff\.php|[?&]aff=|^go\.zoho\.com$|[?&]ref=/i;

function labelFor(host: string, url: URL): string {
  const path = url.pathname;
  if (host === 'docs.google.com') {
    if (path.startsWith('/presentation')) return 'Google Slides';
    if (path.startsWith('/spreadsheets')) return 'Google Sheets';
    if (path.startsWith('/forms')) return 'Google Forms';
    return 'Google Docs';
  }
  if (host === 'drive.google.com') return 'Google Drive';
  if (host === 'forms.gle') return 'Google Forms';
  if (host === 'obumnwabude.com') return 'Portfolio';
  if (host === 'stories.obumnwabude.com' || host === 'medium.com' || host.endsWith('.medium.com')) return 'Medium';
  if (host === 'blog.obumnwabude.com' || host.endsWith('hashnode.dev')) return 'Blog';
  if (host.endsWith('.obumnwabude.com')) return 'My sites';
  if (host.endsWith('notion.site') || host.endsWith('notion.so')) return 'Notion';
  if (host === 'github.com' || host.endsWith('.github.io')) return 'GitHub';
  if (host.endsWith('linkedin.com') || host === 'lnkd.in') return 'LinkedIn';
  if (host.endsWith('youtube.com') || host === 'youtu.be') return 'YouTube';
  if (host === 'x.com' || host === 'twitter.com' || host === 't.co') return 'X';
  if (host.endsWith('freecodecamp.org')) return 'freeCodeCamp';
  if (host === 'dev.to') return 'DEV';
  if (host === 'g.dev' || host === 'developers.google.com') return 'Google Developers';
  if (host.endsWith('cloudfunctions.net') || host.endsWith('run.app') || host.endsWith('web.app') || host.endsWith('firebaseapp.com')) {
    return 'Firebase & Cloud';
  }
  if (host === 'web.archive.org') return 'Web Archive';
  if (REFERRAL.test(host) || REFERRAL.test(url.search) || REFERRAL.test(path)) return 'Referral links';
  return host;
}

export function destinationOf(long: string): Destination {
  try {
    const url = new URL(long);
    const host = url.hostname.replace(/^www\./, '');
    const rest = `${url.pathname === '/' ? '' : url.pathname}${url.search}`;
    return { label: labelFor(host, url), host, rest };
  } catch {
    return { label: 'Other', host: long, rest: '' };
  }
}

export const faviconUrl = (host: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;

/** Proposes a short name from a destination URL: the last meaningful path segment, or the site name. */
export function suggestShort(long: string): string {
  try {
    const url = new URL(long);
    const ignore = new Set(['edit', 'view', 'preview', 'present', 'u', 'd', 'presentation', 'document', 'p', 'posts', 'watch', 'pub']);
    const segments = url.pathname
      .split('/')
      .map((segment) => decodeURIComponent(segment))
      .filter((segment) => segment && !ignore.has(segment.toLowerCase()) && !/^[A-Za-z0-9_-]{25,}$/.test(segment));
    const candidate = segments.at(-1) ?? url.hostname.replace(/^www\./, '').split('.')[0];
    return candidate
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, '')
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
  } catch {
    return '';
  }
}
