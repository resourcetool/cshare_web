// Web stand-in for @react-native-community/netinfo, built on the browser's online/offline events.
interface NetState {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
}

const current = (): NetState => {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine;
  return { isConnected: online, isInternetReachable: online };
};

const NetInfo = {
  addEventListener(listener: (state: NetState) => void): () => void {
    const handle = () => listener(current());
    window.addEventListener('online', handle);
    window.addEventListener('offline', handle);
    listener(current());
    return () => {
      window.removeEventListener('online', handle);
      window.removeEventListener('offline', handle);
    };
  },
  fetch: async (): Promise<NetState> => current(),
};

export default NetInfo;
