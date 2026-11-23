/**
 * @file   packages/application/src/index.ts
 * @brief  Public entry of @sc/application: the use cases of a show and their ports.
 *
 * Responsibility: name what the server may import from the application layer.
 * Depends on:     ./shows.js, ./ports.js, ./eventLog.js, ./season.js
 */
export {
  createShowService,
  type Outcome,
  type ShowDeps,
  type ShowService,
  type ShowSetup,
} from './shows.js';
export type { Clock, EventStore, IdSource, RandomSource } from './ports.js';
export { jsonlStore, memoryStore } from './eventLog.js';
export { seasonOf } from './season.js';
