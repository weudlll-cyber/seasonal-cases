/**
 * @file   packages/ui/src/index.ts
 * @brief  Public entry of @sc/ui: the client's shared pieces.
 *
 * Responsibility: name what the client may import from @sc/ui. Pieces the kit lacks live under
 *                 ./pending/ until the kit has them (CLAUDE.md "The kit").
 * Depends on:     ./format.js
 */
export { shortCommitment } from './format.js';
