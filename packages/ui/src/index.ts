/**
 * @file   packages/ui/src/index.ts
 * @brief  Public entry of @sc/ui: the client's shared pieces.
 *
 * Responsibility: name what the client may import from @sc/ui. Pieces the kit lacks live under
 *                 ./pending/ until the kit has them (CLAUDE.md "The kit"); the stylesheet
 *                 `pending/fit-cases.css` is imported by path (package.json "exports").
 * Depends on:     ./format.js, ./pending/useDockReserve.js
 */
export { formatTime, shortCommitment } from './format.js';
export { useDockReserve } from './pending/useDockReserve.js';
