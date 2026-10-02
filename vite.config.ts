import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shims = path.join(here, 'shims');

// `.web.*` first, so any react-native library that ships a web variant uses it.
const extensions = ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'];

export default defineConfig(({ mode }) => ({
  root: here,
  plugins: [react()],
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
    global: 'globalThis',
  },
  resolve: {
    extensions,
    dedupe: ['react', 'react-dom', 'react-native-web'],
    alias: [
      // Native-only packages the app imports are replaced by small web versions in ./shims.
      { find: /^react-native$/, replacement: path.join(shims, 'react-native.tsx') },
      { find: /^@react-native-firebase\/firestore$/, replacement: path.join(shims, 'firestore.ts') },
      { find: /^@react-native-firebase\/auth$/, replacement: path.join(shims, 'auth.ts') },
      { find: /^@react-native-community\/netinfo$/, replacement: path.join(shims, 'netinfo.ts') },
      { find: /^@react-native-async-storage\/async-storage$/, replacement: path.join(shims, 'async-storage.ts') },
      { find: /^@web\/(.*)$/, replacement: `${shims}/$1` },
    ],
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: extensions,
      loader: { '.js': 'jsx' },
      define: { global: 'globalThis' },
    },
  },
  build: {
    outDir: 'dist',
    target: ['es2020', 'safari15'],
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true, port: 5173 },
}));
