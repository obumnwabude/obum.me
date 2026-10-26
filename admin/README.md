# admin.obum.me

The dashboard for obum.me short links. Angular 22 (standalone components, signals, zoneless) with Angular Material 3, styled after obumnwabude.com.

- Anyone can browse the links. Signing in with Google as an account carrying the `admin` custom claim unlocks creating, editing, deleting and click analytics.
- Links live in Firestore (`links` collection). The list updates live.
- Click analytics come from the Cloudflare Worker's `/_api` (see `../worker`).

## Develop

```sh
pnpm install
pnpm start        # http://localhost:4200, uses the live Firestore
```

## Deploy (Firebase Hosting, target `admin`)

```sh
pnpm build                                   # outputs dist/admin/browser
cd .. && firebase deploy --only hosting:admin
```

## Keyboard

- `/` search, `N` new link (admin), `⌘K` / `Ctrl K` jump to any link or action, `Esc` close the panel.
