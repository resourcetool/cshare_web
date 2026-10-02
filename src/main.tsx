import { AppRegistry } from 'react-native-web';
import App from './App';

AppRegistry.registerComponent('CSHARE', () => App);
AppRegistry.runApplication('CSHARE', { rootTag: document.getElementById('root') });

// Offline app shell + web push (reminders and assignment notices).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[CSHARE] service worker', e));
  });
}
