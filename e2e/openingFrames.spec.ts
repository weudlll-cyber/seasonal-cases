/**
 * @file   e2e/openingFrames.spec.ts
 * @brief  The case's opening frame by frame (DECISIONS D49), for the owner and the planning chat,
 *         into .local/screens/opening-frames/ (never into git).
 *
 * Responsibility: delete the topic's previous pictures, then on the development page
 *                 `/dev/opening` play the opening and hold every animation at the borders of its
 *                 phases (./../apps/web/src/stage/motion.ts: 0, 30, 55, 70, 85 and 100 %, and 60 %
 *                 just after the artifact's start), at a PC and a phone size in both themes. At
 *                 each frame it checks that nothing of the artifact shows until 55 % has passed,
 *                 that the meaning shows last, and that the gem, its name and the meaning stand
 *                 on the case's horizontal centre (D50); once more at quarter speed. Under reduced
 *                 motion it checks that no animation runs and the open end state shows at once.
 *                 Runs only as the project `screens`.
 * Depends on:     @playwright/test, node:fs
 */
import { mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

const DIR = fileURLToPath(new URL('../.local/screens/opening-frames/', import.meta.url));
const SIZES = [
  [1280, 720],
  [390, 844],
] as const;
const THEMES = ['light', 'dark'] as const;
// The borders of the phases, and 60 % just after the artifact's start (task SC-P7).
const SHARES = [0, 0.3, 0.55, 0.6, 0.7, 0.85, 1] as const;
// The default opening takes 1.6 s; at quarter speed 6.4 s.
const OPEN_MS = 1600;
// The artifact's, its name's and the meaning's centres may differ from the case's by this much.
const CENTRE_PX = 1;

/**
 * Every animation of the page held at `ms` from its start: whether artifact and meaning show,
 * and how far the gem, the name and the meaning are off the case's horizontal centre (px).
 */
async function holdAt(page: Page, ms: number) {
  return page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = t;
    }
    const shown = (selector: string) => {
      const el = document.querySelector(selector);
      if (el === null) return false;
      const style = getComputedStyle(el);
      return style.visibility !== 'hidden' && Number(style.opacity) > 0;
    };
    const centre = (selector: string) => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box === undefined ? Number.NaN : box.left + box.width / 2;
    };
    const front = centre('.centre .cp-front');
    const parts = ['.centre .artifact-gem', '.centre .artifact-name', '.centre-meaning'];
    const off = Math.max(0, ...parts.map((s) => Math.abs(centre(s) - front)).filter((d) => d >= 0));
    return { artifact: shown('.centre .cp-content'), meaning: shown('.centre-meaning'), off };
  }, ms);
}

/** The artifact on the case's centre at 55, 70 and 100 % of an opening of `openMs`. */
async function expectCentred(page: Page, openMs: number): Promise<void> {
  for (const share of [0.55, 0.7, 1]) {
    expect((await holdAt(page, share * openMs)).off).toBeLessThanOrEqual(CENTRE_PX);
  }
}

test('the opening, frame by frame, and under reduced motion', async ({ page }) => {
  test.setTimeout(600_000);
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  const play = page.getByRole('button', { name: 'Play the opening' });
  for (const theme of THEMES) {
    await page.emulateMedia({ colorScheme: theme });
    for (const [width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      await page.goto('/dev/opening');
      await play.click();
      for (const share of SHARES) {
        const seen = await holdAt(page, share * OPEN_MS);
        // Nothing of the artifact until its phase has begun; the meaning only in the last one;
        // the artifact straight above the case's centre in every frame (D50).
        expect(seen.artifact).toBe(share > 0.55);
        expect(seen.meaning).toBe(share > 0.85);
        expect(seen.off).toBeLessThanOrEqual(CENTRE_PX);
        const pct = String(Math.round(share * 100)).padStart(3, '0');
        await page.screenshot({
          path: `${DIR}opening-${pct}-${String(width)}x${String(height)}-${theme}.png`,
          // The whole page: on a phone the front case sits below the controls.
          fullPage: true,
        });
      }
    }
  }
  // At quarter speed (the page's slowest) the rise stays on the centre as well.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/dev/opening');
  await page.getByLabel('Speed').selectOption({ label: 'Quarter speed' });
  await play.click();
  await expectCentred(page, OPEN_MS * 4);
  // Reduced motion: no animation at all, the lid open and the artifact out at once.
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dev/opening');
  await play.click();
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
  // Open at 195° about X: the lid's y axis points up and back (m22 < 0); closed (90°) it is 0.
  const m22 = await page
    .locator('.centre .cp-lid')
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m22);
  expect(m22).toBeLessThan(-0.5);
  await expect(page.locator('.centre .artifact')).toBeVisible();
  await expect(page.locator('.centre-meaning')).toBeVisible();
  await page.screenshot({ path: `${DIR}opening-reduced-390x844-light.png`, fullPage: true });
});
