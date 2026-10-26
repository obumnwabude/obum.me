/** Same page the old Cloud Function served for unknown short links. */
export const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="robots" content="nofollow,noindex" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/404.css" />
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <title>Page Not Found | Obumuneme Nwabude</title>
  </head>
  <body>
    <main>
      <img src="/obum.jpg" alt="" obum />
      <div>
        <h1 heading>Hi there 👋</h1>
        <div message>
          <p>This is <span bold obum>Obum</span></p>
          <p>You've got a <span bold>404</span> error</p>
          <p>Seems like you've landed on an invalid short link</p>
          <p>No worries! You can go back to the home page</p>
          <p><a href="/" button>Home</a></p>
          <p>OR please let me know what link you are trying to visit 🤷‍♂️</p>
          <p>
            <a
              href="https://api.whatsapp.com/send/?phone=2347033777385&text=Hi%20Obum%20%F0%9F%91%8B%0A%0AI%20came%20from%20an%20obum.me%20invalid%20short%20link.%0AI%20am%20"
              button
              >Contact Me</a
            >
          </p>
        </div>
      </div>
    </main>
  </body>
</html>`;

export const unavailableHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="robots" content="nofollow,noindex" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/404.css" />
    <title>Try again in a moment | obum.me</title>
  </head>
  <body>
    <main>
      <div>
        <h1 heading>This link couldn't load right now</h1>
        <div message>
          <p>The link database didn't respond. Refresh the page in a few seconds.</p>
        </div>
      </div>
    </main>
  </body>
</html>`;
