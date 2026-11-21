/**
 * @file   apps/web/src/main.tsx
 * @brief  The client's entry: the stylesheets in order, then the app into #root.
 *
 * Responsibility: the kit's CSS first (fonts, tokens, motion, fit floors, shell), then the
 *                 cases' pending floors, then the client's own (CLAUDE.md "The kit").
 * Depends on:     react-dom, @seasonal/kit CSS entries, @sc/ui pending/fit-cases.css,
 *                 ./shell/*.css, ./stage/*.css, ./board/board.css, ./screens/screens.css,
 *                 ./App.js
 */
import '@seasonal/kit/fonts.css';
import '@seasonal/kit/tokens.css';
import '@seasonal/kit/motion.css';
import '@seasonal/kit/fit.css';
import '@seasonal/kit/shell.css';
import '@sc/ui/pending/fit-cases.css';
import './shell/fonts.css';
import './shell/shell.css';
import './stage/artifact.css';
import './stage/stage.css';
import './stage/stageParts.css';
import './stage/scoreboard.css';
import './board/board.css';
import './screens/screens.css';

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
