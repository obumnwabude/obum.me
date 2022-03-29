import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as path from 'path';
admin.initializeApp();

export const app = functions.https.onRequest(async (req, res) => {
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

  if (req.path === '/') return res.redirect('https://obumnwabude.com');

  const snap = await admin
    .firestore()
    .collection('links')
    .where('short', '==', req.path.split('/')[1])
    .get()
    .catch((e) => console.error(e));

  if (!snap || snap.size === 0) {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
  } else {
    res.redirect(snap.docs[0].data().long);
  }
});

export const incrementLinkCount = functions.firestore
  .document('/links/{linkId}')
  .onCreate(async () => {
    await admin
      .firestore()
      .doc('/counters/links')
      .set({ count: admin.firestore.FieldValue.increment(1) }, { merge: true })
      .catch((e) => console.error(e));
  });
