// Web stand-in for @react-native-firebase/firestore.
// The Firebase JS "compat" API has the same shape (firestore().collection().doc().onSnapshot(), FieldValue,
// Timestamp, batch ...), so the Android app's services run unchanged.
import firebase from './firebaseApp';
import 'firebase/compat/firestore';

let db: firebase.firestore.Firestore | undefined;

function getDb(): firebase.firestore.Firestore {
  if (!db) {
    db = firebase.firestore();
    // Same offline cache the Android app has. It has to be switched on before the first read/write.
    db.enablePersistence({ synchronizeTabs: true }).catch(() => undefined);
  }
  return db;
}

const firestore = Object.assign(() => getDb(), {
  FieldValue: firebase.firestore.FieldValue,
  FieldPath: firebase.firestore.FieldPath,
  Timestamp: firebase.firestore.Timestamp,
});

export default firestore;

export declare namespace FirebaseFirestoreTypes {
  type DocumentData = firebase.firestore.DocumentData;
  type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
  type QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;
  type QuerySnapshot = firebase.firestore.QuerySnapshot;
  type Query = firebase.firestore.Query;
  type DocumentReference = firebase.firestore.DocumentReference;
  type CollectionReference = firebase.firestore.CollectionReference;
  type Timestamp = firebase.firestore.Timestamp;
  type WriteBatch = firebase.firestore.WriteBatch;
  type FirestoreError = firebase.firestore.FirestoreError;
}
