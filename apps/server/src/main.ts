/**
 * @file   apps/server/src/main.ts
 * @brief  Starts the server on 127.0.0.1 at its port (CONCEPT §11: 3970).
 *
 * Responsibility: read the port from SC_PORT (the browser tests pass 3980), listen, log the
 *                 address.
 * Depends on:     ./app.js
 */
import { buildApp } from './app.js';

const PORT = Number(process.env['SC_PORT'] ?? 3970);

const app = buildApp();
await app.listen({ host: '127.0.0.1', port: PORT });
console.log(`Seasonal Cases server on http://127.0.0.1:${String(PORT)}`);
