/**
 * @file   apps/server/src/auth/names.ts
 * @brief  The name rule of a new account, and the key two account names are compared by: equal
 *         keys look alike.
 *
 * Responsibility: one rule for every place a name must be unique (security pass, "Names"; SC-N3
 *                 piece 1): NFKC normalisation (full-width and compatibility forms), case folding
 *                 (upper then lower case, so "ß" and "SS" meet), the removal of diacritics (NFD,
 *                 then no combining marks) and of all whitespace. "Ólga", "OLGA" and "o l g a"
 *                 share the key "olga". Letters of different scripts that only look alike (a
 *                 Cyrillic "О") stay different, and the name rule keeps them out: a name is 3 to 32
 *                 Latin letters (with diacritics), digits, `-` and `_` (DECISIONS D36), with at
 *                 least one letter (D43, so `---` or `123` is no name), and no name mixes scripts. Compatibility forms (full-width "Ａ", ligatures) are refused
 *                 too: they are what NFKC would change. Used by registration and
 *                 `pnpm sc admin promote`; names made before the rule are not changed.
 * Depends on:     nothing
 */

// The Latin letters with their diacritics, by block: Basic Latin, Latin-1 (without × and ÷),
// Extended-A, Extended-B (without the click letters ǀ ǁ ǂ ǃ) and Extended Additional. The rest of
// the Latin script (IPA, small capitals, Extended-C and -D) holds look-alikes of plain letters
// (ɡ, ɑ, ᴀ, ɪ, ꜱ: security pass 3, finding 3) and stays out.
const ALLOWED =
  /^[A-Za-z0-9_\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u01BF\u01C4-\u024F\u1E00-\u1EFF-]{3,32}$/u;
const COMBINING = /\p{M}/gu;
// Every allowed character that is not a digit, `-` or `_` is a letter (D43).
const LETTER = /\p{L}/u;

/** Whether a name meets the rule (D36); `name` as typed, trimmed. */
export function nameAllowed(name: string): boolean {
  const composed = name.normalize('NFC');
  return composed === composed.normalize('NFKC') && ALLOWED.test(composed) && LETTER.test(composed);
}

const SPACE = /\s/gu;

export function nameKey(name: string): string {
  return name
    .normalize('NFKC')
    .toUpperCase()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING, '')
    .replace(SPACE, '');
}
