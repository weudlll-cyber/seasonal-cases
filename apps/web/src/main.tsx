/**
 * @file   apps/web/src/main.tsx
 * @brief  The client's entry: mounts the app into #root.
 *
 * Depends on:     react-dom, ./App.js
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App.js';

const root = document.getElementById('root');
if (root === null) throw new Error('#root is missing from index.html');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
