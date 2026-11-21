/**
 * @file   apps/server/src/auth/names.test.ts
 * @brief  Tests the look-alike rule for account names.
 */
import { describe, expect, it } from 'vitest';

import { nameKey } from './names.js';

describe('nameKey', () => {
  it('lets look-alike names meet: case, diacritics, width, whitespace', () => {
    const olga = nameKey('olga');
    for (const twin of ['Olga', 'OLGA', 'Ólga', 'Olgá', 'Ｏｌｇａ', 'o l g a', 'Oĺga']) {
      expect(nameKey(twin)).toBe(olga);
    }
    expect(nameKey('Straße')).toBe(nameKey('STRASSE'));
  });

  it('keeps different names apart', () => {
    expect(nameKey('Olga')).not.toBe(nameKey('Olge'));
    expect(nameKey('ana_1')).not.toBe(nameKey('ana-1'));
  });
});
