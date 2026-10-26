# [obum.me](https://obum.me)

A simple URL shortener for links to articles I've written, my profiles, and videos I've made.

## How it works

| Part | Where it runs | Folder |
| --- | --- | --- |
| `obum.me/<short>` redirects, 404 page, click logging, analytics API | Cloudflare Worker | [`worker`](./worker) |
| [admin.obum.me](https://admin.obum.me) dashboard | Firebase Hosting | [`admin`](./admin) |
| Links, request logs, counters | Firestore | [`firestore.rules`](./firestore.rules) |
| Sign-in for the dashboard | Firebase Authentication (Google) | |

- Visiting [obum.me](https://obum.me) redirects to my portfolio at [obumnwabude.com](https://obumnwabude.com).
- `obum.me/<short>` looks up `<short>` in the `links` collection and redirects to its `long` URL. Unknown short names show a custom 404 page.
- Every visit is logged to the `requests` collection. Real clicks (not link-preview bots) also bump the link's `clicks` count and go to Cloudflare Workers Analytics Engine for per-day, country, referrer and device stats.
- Anyone can browse the links at admin.obum.me. Only the account with the `admin` custom claim can create, edit or delete links and see analytics.

[`admin_old`](./admin_old) is the previous Angular 13 dashboard, kept for reference.

## Deploy

```sh
# Worker (needs the zone obum.me on Cloudflare)
cd worker && pnpm install && pnpm deploy

# Admin + Firestore rules
cd admin && pnpm install && pnpm build && cd ..
firebase deploy --only hosting:admin,firestore:rules
```
