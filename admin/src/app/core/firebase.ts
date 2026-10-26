import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/** Public web config of the `obumshortener` Firebase project (safe to commit). */
export const firebaseConfig = {
  apiKey: 'AIzaSyA6p9OtP4xjtAsI9KjAdT1A36eiT2Ca-ws',
  authDomain: 'obumshortener.firebaseapp.com',
  projectId: 'obumshortener',
  storageBucket: 'obumshortener.appspot.com',
  messagingSenderId: '309484946343',
  appId: '1:309484946343:web:900e67ee10f6b9f2062c82',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

/** The public short-link host, and the Cloudflare Worker API that runs on it. */
export const SHORT_HOST = 'obum.me';
export const API_BASE = 'https://obum.me/_api';

export const shortUrl = (short: string) => `https://${SHORT_HOST}/${short}`;
