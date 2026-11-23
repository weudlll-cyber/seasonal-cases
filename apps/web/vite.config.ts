/**
 * @file   apps/web/vite.config.ts
 * @brief  Vite config for the client: one address for the game and /admin (CONCEPT §11), under
 *         the base path of its mode.
 *
 * Responsibility: run the React dev server on 0.0.0.0:5470, so the owner's phone reaches it over
 *                 the LAN, and proxy `<base>api`, `<base>socket.io` and `<base>auth` to the
 *                 server on 127.0.0.1:3970. The base path is `/` locally and `/games/cases/` in
 *                 website mode (SC_MODE, GAME-INTEGRATION §1). A browser-test run passes its own
 *                 port and server in SC_WEB_PORT and SC_SERVER. Pages may frame only this site
 *                 and, in local development, the website's chat origin (`frame-src`,
 *                 GAME-INTEGRATION §5; SC_CHAT_ORIGIN, default http://localhost:5380). The kit's
 *                 `themeInit()` serves the early theme script. As the Vitest project config it
 *                 runs the component tests in jsdom.
 * Depends on:     vite, @vitejs/plugin-react, @seasonal/kit/vite
 */
/// <reference types="vitest/config" />
import { themeInit } from '@seasonal/kit/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const PORT = Number(process.env['SC_WEB_PORT'] ?? 5470);
const SERVER = process.env['SC_SERVER'] ?? 'http://127.0.0.1:3970';
const WEBSITE = process.env['SC_MODE'] === 'website';
const BASE = WEBSITE ? '/games/cases/' : '/';
const CHAT_ORIGIN = WEBSITE ? '' : (process.env['SC_CHAT_ORIGIN'] ?? 'http://localhost:5380');

export default defineConfig({
  base: BASE,
  plugins: [react(), themeInit()],
  server: {
    host: '0.0.0.0',
    port: PORT,
    strictPort: true,
    headers: { 'content-security-policy': `frame-src 'self' ${CHAT_ORIGIN}`.trim() },
    // The client talks to the server through its own origin, so the session cookie is
    // first-party and the socket's Origin matches its Host (apps/server/src/app.ts).
    proxy: {
      [`${BASE}api`]: { target: SERVER, changeOrigin: false },
      [`${BASE}socket.io`]: { target: SERVER, ws: true, changeOrigin: false },
      [`${BASE}auth`]: { target: SERVER, changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
