# obum.me Worker

The Cloudflare Worker behind https://obum.me. It replaces the old Firebase Cloud Functions.

- `obum.me/` → 301 to https://obumnwabude.com/
- `obum.me/<short>` → looks the short name up in Firestore (`links` where `short == <short>`), caches it at the edge for 2 minutes, and 302-redirects. Unknown names get the branded 404 page.
- `www.obum.me/*` → 301 to `obum.me/*`
- Every visit is logged like the old function did: a doc in `requests` (headers, timestamp, url) and `counters/requests.count += 1`.
- Real clicks (not link-preview bots) also bump `links/<id>.clicks` and `lastClickedAt`, and write a data point to Workers Analytics Engine (`obum_me_clicks`) with country, city, referrer and device.
- `/_api/health` (public), `/_api/overview`, `/_api/stats?short=…`, `/_api/purge` (admin only: Firebase ID token with the `admin` claim) serve the admin dashboard.

## Secrets

```sh
pnpm wrangler secret put FIREBASE_SERVICE_ACCOUNT   # paste the whole service-account JSON
pnpm wrangler secret put CF_API_TOKEN               # API token with "Account Analytics: Read"
```

Without `FIREBASE_SERVICE_ACCOUNT`, redirects still work (links are publicly readable) but nothing is logged to Firestore. Without `CF_API_TOKEN`, the admin can't show charts.

## Develop and deploy

```sh
pnpm install
pnpm dev          # http://localhost:8787
pnpm deploy
pnpm tail         # live logs
```
