/**
 * @file   apps/server/src/main.ts
 * @brief  Starts the server on 127.0.0.1 at its port (CONCEPT §11: 3970).
 *
 * Responsibility: read the settings from the environment, rebuild the shows from the event
 *                 log, listen, and say where and in which mode.
 * Depends on:     ./app.js, ./config.js
 */
import { buildServer } from './app.js';
import { configFrom } from './config.js';

const config = configFrom(process.env);
const { app } = await buildServer(config);
await app.listen({ host: '127.0.0.1', port: config.port });
const mode = config.dev ? 'development (dev sign-in on)' : 'no development features';
console.log(`Seasonal Cases server on http://127.0.0.1:${String(config.port)}, ${mode}`);
