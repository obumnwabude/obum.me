# [obum.me](https://obum.me)

A simple URL shortener for links to articles I've written, my profiles, and videos I've made.

## How it works

### Frontend
This URL shortener has two frontends, the [public](./public) facing site (the shortener itself)  and the [admin](./admin) site.

#### Public

All routes to the public _obum.me_ are sent to the backend. There if the short link exists, the backend redirects to the saved long link. If the given short link route has not been set, _obum.me_ displays a custom [404](./public/404.html) page.

However, visiting [obum.me](https://obum.me) redirects you to my portfolio website at [obumnwabude.com](https://obumnwabude.com).

#### Admin

I shorten links in this admin dashboard. In itself, it is accessible to the public as a subdomain, that is, [admin.obum.me](https://admin.obum.me). There, all shortened links are displayed out to the public.

However, access to editing the links is only via the admin account set with [Firebase Authentication](https://firebase.google.com/products/auth).

### Backend
This URL shortener is entirely built on [Firebase](https://firebase.google.com):
* The short and long links are stored in [Firestore](https://firebase.google.com/products/firestore) database.
* [Cloud Functions](https://firebase.google.com/products/functions) do the actual checking of shortened URLs and redirect as necessary.
