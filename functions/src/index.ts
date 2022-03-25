import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as path from 'path';
admin.initializeApp();

export const app = functions.https.onRequest(async (req, res) => {
  if (['/404.css', '/favicon.ico', '/obum.jpg'].includes(req.path)) {
    return res.sendFile(path.join(__dirname, `../404/assets${req.path}`));
  }

  await admin
    .firestore()
    .collection('requests')
    .add({
      headers: req.headers,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      url: req.url
    })
    .catch((e) => console.error(e));

  await admin
    .firestore()
    .doc('/counters/requests')
    .set({ count: admin.firestore.FieldValue.increment(1) }, { merge: true })
    .catch((e) => console.error(e));

  const snap = await admin
    .firestore()
    .collection('links')
    .where('short', '==', req.path.split('/')[1])
    .get()
    .catch((e) => console.error(e));

  if (!snap || snap.size === 0) {
    res.status(404).sendFile(path.join(__dirname, '../404/404.html'));
  } else {
    res.redirect(snap.docs[0].data().long);
  }
});
