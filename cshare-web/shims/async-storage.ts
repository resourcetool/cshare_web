// Web stand-in for @react-native-async-storage/async-storage, on top of localStorage.
const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

const AsyncStorage = {
  getItem: async (key: string): Promise<string | null> => safe(() => window.localStorage.getItem(key), null),
  setItem: async (key: string, value: string): Promise<void> => {
    safe(() => window.localStorage.setItem(key, value), undefined);
  },
  removeItem: async (key: string): Promise<void> => {
    safe(() => window.localStorage.removeItem(key), undefined);
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    keys.forEach(k => safe(() => window.localStorage.removeItem(k), undefined));
  },
  getAllKeys: async (): Promise<string[]> => safe(() => Object.keys(window.localStorage), []),
  clear: async (): Promise<void> => {
    safe(() => window.localStorage.clear(), undefined);
  },
};

export default AsyncStorage;
