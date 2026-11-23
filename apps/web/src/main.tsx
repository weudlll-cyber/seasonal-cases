/**
 * @file   apps/web/src/main.tsx
 * @brief  The client's entry: the stylesheets in order, then the app into #root.
 *
 * Responsibility: the kit's CSS first (fonts, tokens, motion, fit floors with the cases' own,
 *                 shell, frames, bar, dock, call slot), then the client's own (CLAUDE.md "The
 *                 kit").
 * Depends on:     react-dom, @seasonal/kit CSS entries,
 *                 ./shell/*.css, ./stage/*.css, ./board/board.css, ./screens/*.css, ./App.js
 */
import '@seasonal/kit/fonts.css';
import '@seasonal/kit/tokens.css';
import '@seasonal/kit/motion.css';
import '@seasonal/kit/fit.css';
import '@seasonal/kit/shell.css';
import '@seasonal/kit/frames.css';
import '@seasonal/kit/bar.css';
import '@seasonal/kit/dock.css';
import '@seasonal/kit/call.css';
import './shell/fonts.css';
import './shell/shell.css';
import './stage/artifact.css';
import './stage/stage.css';
import './stage/front.css';
import './stage/stageParts.css';
import './stage/scoreboard.css';
import './stage/moments.css';
import './board/board.css';
import './screens/screens.css';
import './screens/result.css';

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
