import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // For Electron
  build: {
    rollupOptions: {
      external: [
        'mock-aws-s3',
        'aws-sdk',
        'nock',
        'fs',
        'path',
        'crypto',
        'events',
        'util',
        'url',
        'os',
        'assert',
        'stream',
        'child_process',
        'better-sqlite3',
        'bcrypt',
        '@mapbox/node-pre-gyp'
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      'better-sqlite3',
      'bcrypt',
      '@mapbox/node-pre-gyp'
    ]
  }
});

// vite.config.js