/**
 * @file   packages/contracts/src/index.ts
 * @brief  Public entry of @sc/contracts: every shape shared across the wire.
 *
 * Responsibility: name what the server, the domain and the client may import from the
 *                 contracts.
 * Depends on:     ./show.js, ./artifact.js, ./view.js, ./api.js, ./socket.js, ./accounts.js
 */
export * from './show.js';
export * from './artifact.js';
export * from './view.js';
export * from './api.js';
export * from './socket.js';
export * from './accounts.js';
