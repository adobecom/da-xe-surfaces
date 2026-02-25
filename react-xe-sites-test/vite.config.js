import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

export default defineConfig({
  plugins: [react()],
  root: __dirname,
  resolve: {
    alias: {
      // Use local xe-sites from repo root (Option 1: bundler)
      '@adobecom/da-xe-surfaces': path.join(repoRoot, 'init.js'),
      // init.js lives outside this app, so resolve its deps from this app's node_modules
      'lit': path.join(__dirname, 'node_modules/lit'),
      '@spectrum-web-components/theme': path.join(__dirname, 'node_modules/@spectrum-web-components/theme'),
      '@spectrum-web-components/button': path.join(__dirname, 'node_modules/@spectrum-web-components/button'),
    },
  },
  server: {
    port: 5174,
  },
});
