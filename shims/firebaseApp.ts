import firebase from 'firebase/compat/app';

// The Firebase *web app* config (Firebase console > Project settings > Your apps > Web).
// Supplied at build time as VITE_FIREBASE_CONFIG (JSON) - see web/README.md.
function readConfig() {
  const raw = import.meta.env.VITE_FIREBASE_CONFIG as string | undefined;
  if (!raw) throw new Error('VITE_FIREBASE_CONFIG is missing. See web/README.md, step 1.');
  return JSON.parse(raw);
}

if (!firebase.apps.length) firebase.initializeApp(readConfig());

export default firebase;
