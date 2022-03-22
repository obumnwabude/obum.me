import * as functions from 'firebase-functions';
import * as path from 'path';

export const app = functions.https.onRequest((req, res) => {
  console.log(req.path);
  if (req.path === '/home') res.redirect('https://obumnwabude.com');
  else res.status(404).sendFile(path.join(__dirname, '../404.html'));
});
