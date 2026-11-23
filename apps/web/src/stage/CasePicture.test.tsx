/**
 * @file   apps/web/src/stage/CasePicture.test.tsx
 * @brief  Tests the case's picture (D49): the closed and the open case, the artifact only as the
 *         caller's child, the opened cases on the stage, the reduced-motion contract of
 *         ./caseOpening.css (every opening keyframe starts closed, the base styles are the end
 *         state), and the straight rise (D50): the rules that keep the artifact's x on the case's
 *         centre. jsdom lays nothing out, so the measured centres at 55, 70 and 100 % are checked
 *         in the browser (e2e/openingFrames.spec.ts).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ANA, liveView } from '../testing/views.js';
import { CasePicture } from './CasePicture.js';
import { Stage } from './Stage.js';

afterEach(cleanup);

// A path, not a URL object: jsdom replaces the URL class, which node:fs does not take.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(path.join(HERE, 'caseOpening.css'), 'utf8');
const PICTURE_CSS = readFileSync(path.join(HERE, 'case.css'), 'utf8');

/** The declarations of the first rule whose selector is exactly `selector`. */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`
${selector} {`);
  expect(start).toBeGreaterThan(-1);
  return css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
}

const direct = () => Promise.resolve({ ok: true as const });

describe('the case picture', () => {
  it('draws a closed case: body, walls, lid with handle and lip, two latches, its number', () => {
    const { container } = render(<CasePicture state="closed" number={12} />);
    const root = container.querySelector('.case-picture');
    expect(root?.getAttribute('data-state')).toBe('closed');
    expect(root?.className).toContain('is-closed');
    for (const part of ['cp-back', 'cp-left', 'cp-right', 'cp-floor', 'cp-front', 'cp-lid']) {
      expect(container.querySelector(`.${part}`)).not.toBeNull();
    }
    expect(container.querySelectorAll('.cp-latch')).toHaveLength(2);
    expect(container.querySelector('.cp-lid .cp-handle svg')).not.toBeNull();
    expect(container.querySelector('.cp-lid .cp-lid-inner')).not.toBeNull();
    expect(container.querySelector('.cp-lid .cp-lid-lip')).not.toBeNull();
    expect(container.querySelector('.cp-number')?.textContent).toBe('12');
    expect(container.querySelector('.cp-content')).toBeNull();
  });

  it('shows what it is given inside, risen above the rim or sitting in the case', () => {
    const risen = render(
      <CasePicture state="open" risen>
        <span className="sample">gem</span>
      </CasePicture>,
    );
    expect(risen.container.querySelector('.case-picture')?.className).toContain('is-risen');
    expect(risen.container.querySelector('.cp-content .sample')).not.toBeNull();
    cleanup();
    const inside = render(
      <CasePicture state="open">
        <span className="sample">gem</span>
      </CasePicture>,
    );
    expect(inside.container.querySelector('.case-picture')?.className).toContain('is-inside');
  });

  it('shows the opened cases on the stage open with their artifact, the closed ones closed', () => {
    const { container } = render(
      <Stage show={liveView('idle')} organiser={null} me={ANA} direct={direct} />,
    );
    const tokens = [...container.querySelectorAll('.case-token')];
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      const state = token.querySelector('.case-picture')?.getAttribute('data-state');
      const opened = token.className.includes('is-opened');
      expect(state).toBe(opened ? 'open' : 'closed');
      expect(token.querySelector('.cp-content .artifact') !== null).toBe(opened);
    }
  });
});

describe('reduced motion (the kit switches every animation off)', () => {
  // Each animated part of the opening, its keyframes, and what its end state sets.
  const PARTS = [
    ['cp-latch', 'cp-latch', 'transform'],
    ['cp-lid', 'cp-lid-open', 'transform'],
    ['cp-glow', 'cp-glow', 'opacity'],
  ] as const;

  it('leaves the end state as the base style, so the open case shows at once', () => {
    for (const [part, keyframes, property] of PARTS) {
      const opening = `\\.case-picture\\.is-opening \\.${part}`;
      const open = `\\.case-picture\\.is-open \\.${part}`;
      expect(CSS).toMatch(new RegExp(`${opening},\\s*${open} \\{[^}]*${property}:`));
      expect(CSS).toMatch(new RegExp(`${opening} \\{\\s*animation: ${keyframes} `));
    }
  });

  it('animates only from the closed case: every opening keyframe is a single "from"', () => {
    for (const name of ['cp-latch', 'cp-lid-open', 'cp-glow', 'cp-rise']) {
      const block = new RegExp(`@keyframes ${name} \\{\\s*from \\{[^}]*\\}\\s*\\}`);
      expect(CSS).toMatch(block);
    }
    // The artifact is hidden for the whole wait before its phase, not just transparent.
    expect(CSS).toMatch(/@keyframes cp-rise \{\s*from \{\s*visibility: hidden;/);
  });
});

describe('the straight rise (D50)', () => {
  it('centres the artifact with the translate property, outside the rise’s scale', () => {
    const box = rule(PICTURE_CSS, '.cp-content');
    expect(box).toMatch(/left: 50%;/);
    expect(box).toMatch(/width: max-content;/);
    expect(box).toMatch(/translate: -50% 0;/);
    expect(box).toMatch(/transform-origin: 50% 100%;/);
    // Nothing horizontal inside `transform`, where the scale would shrink it.
    expect(box).not.toMatch(/translateX/);
  });

  it('moves the artifact only up and grows it: the rise keeps x at -50%', () => {
    const rise = /@keyframes cp-rise \{\s*from \{([^}]*)\}/.exec(CSS)?.[1] ?? '';
    expect(rise).toMatch(/translate: -50% /);
    expect(rise).toMatch(/scale: [\d.]+;/);
    expect(rise).not.toMatch(/\b(left|right|transform|translateX):/);
  });
});
