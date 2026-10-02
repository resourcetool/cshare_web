// Web stand-in for @react-native-firebase/auth (same namespaced API, signed-in state kept in IndexedDB).
import firebase from './firebaseApp';
import 'firebase/compat/auth';

const auth = () => firebase.auth();

export default auth;
