/**
 * @file   apps/server/src/auth/names.test.ts
 * @brief  Tests the name rule (D36) and the look-alike rule for account names.
 */
import { describe, expect, it } from 'vitest';

import { nameAllowed, nameKey } from './names.js';

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

describe('nameAllowed', () => {
  it('takes 3 to 32 Latin letters with diacritics, digits, - and _', () => {
    for (const name of ['Ana', 'Ólga_99', 'Straße', 'Łukasz-2', 'émile', 'x'.repeat(32)]) {
      expect(nameAllowed(name)).toBe(true);
    }
  });

  it('refuses other scripts, mixed scripts, compatibility forms, spaces and other signs', () => {
    for (const name of [
      'An',
      'x'.repeat(33),
      'Олга',
      'Оlga',
      'Ｏｌｇａ',
      'ﬁona',
      'ana lee',
      'ana.lee',
      'ana@x',
      '٣٣٣',
      // Latin-script look-alikes of plain letters (security pass 3, finding 3).
      'ɡame',
      'ǀeo',
      'ɑdmin',
      'ᴀdmin',
      'admɪn',
      'ꜱam',
      'ɩvo',
    ]) {
      expect(nameAllowed(name)).toBe(false);
    }
  });
});
