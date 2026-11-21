/**
 * @file   apps/web/vite.config.ts
 * @brief  Vite config for the client: one address for the game and /admin (CONCEPT §11).
 *
 * Responsibility: run the React dev server on 0.0.0.0:5470, so the owner's phone reaches it over
 *                 the LAN, and proxy /api and /socket.io to the server on 127.0.0.1:3970. A
 *                 browser-test run passes its own port and server in SC_WEB_PORT and SC_SERVER
 *                 (5480 and 3980). As the Vitest project config it runs the component tests in
 *                 jsdom.
 * Depends on:     vite, @vitejs/plugin-react
 */
/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const PORT = Number(process.env['SC_WEB_PORT'] ?? 5470);
const SERVER = process.env['SC_SERVER'] ?? 'http://127.0.0.1:3970';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: PORT,
    strictPort: true,
    // The client talks to the server through its own origin, so the session cookie is
    // first-party and the socket's Origin is this port.
    proxy: {
      '/api': { target: SERVER, changeOrigin: false },
      '/socket.io': { target: SERVER, ws: true, changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
