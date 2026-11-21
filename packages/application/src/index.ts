/**
 * @file   packages/application/src/index.ts
 * @brief  Public entry of @sc/application: the use cases of a show.
 *
 * Responsibility: name what the server may import from the application layer.
 * Depends on:     ./createShow.js
 */
export { checkSetup } from './createShow.js';
