import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from 'firebase/firestore';

// Public Firebase web configuration supplied by the CSHARE owner.
const firebaseConfig = {
  apiKey: 'AIzaSyBbdYzeL_DKsgSHRoSeDVcfTsAgwvUhO74',
  authDomain: 'cshare-2fac4.firebaseapp.com',
  projectId: 'cshare-2fac4',
  storageBucket: 'cshare-2fac4.firebasestorage.app',
  messagingSenderId: '102240826607',
  appId: '1:102240826607:web:e9418dec69a10e9cd1d71a'
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
let db;
try {
  db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
} catch {
  db = getFirestore(app);
}
export const firestore = db;
