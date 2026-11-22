/**
 * @file   apps/web/src/screens/startCard.test.ts
 * @brief  Tests the start card's count of taken cases: the picks while registration is open
 *         (the owners are not set yet), the owners after the close.
 */
import { describe, expect, it } from 'vitest';

import { liveView, registrationView } from '../testing/views.js';
import { takenText } from './StartPage.js';

describe('takenText', () => {
  it('counts the held cases on an open board, though no case has an owner yet', () => {
    const open = registrationView();
    expect(open.cases.every((c) => c.ownerName === null)).toBe(true);
    expect(takenText(open)).toBe('2 picked');
  });

  it('counts the owners once there is no board', () => {
    const live = liveView('idle');
    const owned = live.cases.filter((c) => c.ownerName !== null).length;
    expect(takenText(live)).toBe(`${String(owned)} owners`);
  });
});
