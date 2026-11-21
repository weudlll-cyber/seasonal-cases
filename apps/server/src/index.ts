/**
 * @file   apps/server/src/index.ts
 * @brief  Public entry of @sc/server for its tests and its start script.
 *
 * Responsibility: name the server's builder and its settings; ./main.ts starts it.
 * Depends on:     ./app.js, ./config.js
 */
export { buildServer, type BuiltServer } from './app.js';
export { configFrom, type ServerConfig } from './config.js';
