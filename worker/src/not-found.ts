const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

const EMAIL = 'contact@obum.me';
const HOME = 'https://obumnwabude.com/';

/** Broken chain link: two links pulled apart, with small sparks where they snapped. */
const brokenLinkSvg = `
<svg class="chain" viewBox="0 0 48 48" aria-hidden="true">
  <g class="link-a"><path d="M20.5 27.5 15 33a6 6 0 0 1-8.5-8.5l5.5-5.5a6 6 0 0 1 7.6-.7" /></g>
  <g class="link-b"><path d="M27.5 20.5 33 15a6 6 0 0 1 8.5 8.5L36 29a6 6 0 0 1-7.6.7" /></g>
  <g class="sparks"><path d="M22 14v-5M28 39v-5M14 22H9M39 28h-5" /></g>
</svg>`;

/** Shared look for the Worker's pages: obumnwabude.com's blues, glass card, light and dark. */
const styles = `
:root {
  --bg: #f8fafd; --text: #0b1329; --gray: #5b6b82; --primary: #101e9f; --primary-fg: #fff; --cyan: #0284c7;
  --card: rgb(255 255 255 / 72%); --border: rgb(16 30 159 / 10%); --shadow: rgb(16 30 159 / 10%); --dot: rgb(16 30 159 / 9%);
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #07090e; --text: #f1f5f9; --gray: #94a3b8; --primary: #60a5fa; --primary-fg: #060911; --cyan: #38bdf8;
    --card: rgb(13 20 36 / 62%); --border: rgb(255 255 255 / 9%); --shadow: rgb(0 0 0 / 45%); --dot: rgb(255 255 255 / 6%);
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
html { height: 100%; }
body {
  margin: 0; min-height: 100%; display: grid; place-items: center; padding: 32px 16px;
  background:
    radial-gradient(52vmax 40vmax at 0% -10%, color-mix(in srgb, var(--primary) 16%, transparent), transparent 70%),
    radial-gradient(44vmax 32vmax at 105% 110%, color-mix(in srgb, var(--cyan) 12%, transparent), transparent 70%),
    var(--bg);
  color: var(--text);
  font: 16px/1.6 Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
/* A faint dot grid that fades out toward the edges. */
body::before {
  content: ''; position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background-image: radial-gradient(var(--dot) 1.2px, transparent 1.2px); background-size: 22px 22px;
  mask-image: radial-gradient(ellipse at center, #000 20%, transparent 70%);
}
main {
  width: min(540px, 100%); padding: 48px 40px 36px; text-align: center;
  border: 1px solid var(--border); border-radius: 32px; background: var(--card);
  backdrop-filter: blur(20px) saturate(150%); -webkit-backdrop-filter: blur(20px) saturate(150%);
  box-shadow: 0 32px 64px -28px var(--shadow);
}
.portrait { position: relative; width: 128px; height: 128px; margin: 0 auto 28px; }
.portrait img {
  width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;
  padding: 4px; background: linear-gradient(135deg, var(--cyan), var(--primary));
}
.badge {
  position: absolute; right: -6px; bottom: -2px; width: 52px; height: 52px; display: grid; place-items: center;
  border-radius: 50%; border: 1px solid var(--border); background: var(--bg);
  box-shadow: 0 8px 20px -8px var(--shadow);
}
.chain { width: 30px; height: 30px; overflow: visible; }
.chain path { fill: none; stroke: var(--primary); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }
.chain .sparks path { stroke: var(--cyan); stroke-width: 2.4; }
.link-a, .link-b { transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
.sparks { opacity: 0; transition: opacity 0.4s ease 0.35s; }
.ready .link-a { transform: translate(-2px, 2px); }
.ready .link-b { transform: translate(2px, -2px); }
.ready .sparks { opacity: 1; }
.hello { margin: 0 0 8px; color: var(--gray); font-size: 15px; }
h1 { margin: 0; font-size: clamp(26px, 6vw, 32px); line-height: 1.15; font-weight: 700; letter-spacing: -0.03em; }
.tried {
  display: inline-block; max-width: 100%; margin: 20px 0 0; padding: 8px 16px; border-radius: 999px;
  border: 1px dashed color-mix(in srgb, var(--primary) 40%, transparent);
  background: color-mix(in srgb, var(--primary) 6%, transparent);
  font-size: 17px; overflow-wrap: anywhere;
}
.tried .host { color: var(--gray); }
.tried .slug { color: var(--primary); font-weight: 700; text-decoration: line-through; text-decoration-thickness: 1.5px; text-decoration-color: color-mix(in srgb, var(--primary) 45%, transparent); }
p.note { max-width: 40ch; margin: 20px auto 0; color: var(--gray); }
.actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-top: 32px; }
.button {
  display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 14px;
  border: 1px solid var(--border); color: var(--text); text-decoration: none; font-weight: 600; font-size: 15px;
  transition: border-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;
}
.button svg { width: 18px; height: 18px; flex: none; }
.button:hover { border-color: var(--primary); transform: translateY(-1px); }
.button.primary {
  background: var(--primary); border-color: var(--primary); color: var(--primary-fg);
  box-shadow: 0 10px 22px -10px color-mix(in srgb, var(--primary) 70%, transparent);
}
a:focus-visible { outline: 2px solid var(--primary); outline-offset: 3px; }
footer { margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--border); color: var(--gray); font-size: 13px; }
footer a { color: inherit; }
@media (max-width: 480px) { main { padding: 36px 22px 28px; border-radius: 26px; } .button { width: 100%; justify-content: center; } }
@media (prefers-reduced-motion: reduce) { .link-a, .link-b, .sparks, .button { transition: none; } }
`;

const arrowIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>`;
const mailIcon = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/></svg>`;

function page(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="robots" content="noindex, nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f8fafd" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#07090e" media="(prefers-color-scheme: dark)" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
    <title>${title}</title>
    <style>${styles}</style>
  </head>
  <body>
    <main>${body}</main>
    <script>requestAnimationFrame(() => setTimeout(() => document.body.classList.add('ready'), 250));</script>
  </body>
</html>`;
}

const portrait = `
<div class="portrait">
  <img src="/obum-384.webp" srcset="/obum-384.webp 384w, /obum-768.webp 768w" sizes="128px" width="128" height="128" alt="Obumuneme Nwabude" />
  <span class="badge">${brokenLinkSvg}</span>
</div>`;

/** The page for a short link that doesn't exist. Shows the exact link the visitor tried. */
export function notFoundPage(slug: string): string {
  const shown = escapeHtml(slug.length > 80 ? `${slug.slice(0, 80)}…` : slug);
  const subject = `obum.me/${slug} doesn't work`;
  const body = `Hi Obum 👋\n\nI tried https://obum.me/${slug} but it doesn't work.\nI was looking for: \n\nI am `;
  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return page(
    'Link not found | obum.me',
    `${portrait}
    <p class="hello">Hi there 👋 I'm Obum.</p>
    <h1>This short link doesn't go anywhere</h1>
    <div class="tried"><span class="host">obum.me/</span><span class="slug">${shown}</span></div>
    <p class="note">It may have a typo, or I may have retired it. Head to my website, or tell me which link you were after and I'll sort it out.</p>
    <div class="actions">
      <a class="button primary" href="${HOME}">Go to obumnwabude.com ${arrowIcon}</a>
      <a class="button" href="${escapeHtml(mailto)}">${mailIcon} Email me</a>
    </div>
    <footer>obum.me is the link shortener of <a href="${HOME}">Obumuneme Nwabude</a>. You can also write to <a href="mailto:${EMAIL}">${EMAIL}</a>.</footer>`,
  );
}

/** Shown when Firestore can't be reached, so the visitor knows to retry rather than assume the link is dead. */
export function unavailablePage(slug: string): string {
  return page(
    'Try again in a moment | obum.me',
    `${portrait}
    <p class="hello">Hi there 👋 I'm Obum.</p>
    <h1>This link couldn't load just now</h1>
    <div class="tried"><span class="host">obum.me/</span><span class="slug" style="text-decoration:none">${escapeHtml(slug)}</span></div>
    <p class="note">The link database didn't answer in time. Wait a few seconds and try again.</p>
    <div class="actions">
      <a class="button primary" href="/${encodeURIComponent(slug)}">Try again</a>
      <a class="button" href="${HOME}">Go to obumnwabude.com ${arrowIcon}</a>
    </div>`,
  );
}
