/**
 * @file   packages/contracts/src/index.ts
 * @brief  Public entry of @sc/contracts: every shape shared across the wire.
 *
 * Responsibility: name what the server and the client may import from the contracts.
 * Depends on:     ./show.js
 */
export { SHOW_STATES, ShowStateSchema, type ShowState } from './show.js';
