/**
 * @file   apps/server/src/index.ts
 * @brief  Public entry of @sc/server for its tests and its start script.
 *
 * Responsibility: name the server's builder, its settings, and what the browser tests' server
 *                 needs to seed a standalone admin (the memory stores, the password hash);
 *                 ./main.ts starts it.
 * Depends on:     ./app.js, ./auth/*, ./config.js
 */
export { buildServer, type BuiltServer } from './app.js';
export { memoryAccounts } from './auth/accounts.js';
export { memoryCredentials } from './auth/credentials.js';
export { hashPassword } from './auth/passwords.js';
export { configFrom, type ServerConfig } from './config.js';
