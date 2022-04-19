import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as path from 'path';
admin.initializeApp();
const db = admin.firestore();

export const app = functions.https.onRequest(async (req, res) => {
  await db
    .collection('requests')
    .add({
      headers: req.headers,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      url: req.url
    })
    .catch((e) => console.error(e));

  await db
    .doc('/counters/requests')
    .set({ count: admin.firestore.FieldValue.increment(1) }, { merge: true })
    .catch((e) => console.error(e));

  if (req.path === '/') return res.redirect('https://obumnwabude.com');

  const snap = await db
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

export const onCreateLink = functions.firestore
  .document('/links/{linkId}')
  .onCreate(async (_, context) => {
    await db
      .doc('/counters/links')
      .set({ count: admin.firestore.FieldValue.increment(1) }, { merge: true })
      .catch((e) => console.error(e));

    await db
      .doc(`/links/${context.params['linkId']}`)
      .set({ id: context.params['linkId'] }, { merge: true })
      .catch((error) => console.error(error));
  });

export const reduceLinkCount = functions.firestore
  .document('/links/{linkId}')
  .onDelete(async () => {
    await db
      .doc('/counters/links')
      .set({ count: admin.firestore.FieldValue.increment(-1) }, { merge: true })
      .catch((e) => console.error(e));
  });
