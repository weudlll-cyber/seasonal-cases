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
 *                 Latin letters (with diacritics), digits, `-` and `_` (DECISIONS D36), so no
 *                 name mixes scripts. Compatibility forms (full-width "Ａ", ligatures) are refused
 *                 too: they are what NFKC would change. Used by registration and
 *                 `pnpm sc admin promote`; names made before the rule are not changed.
 * Depends on:     nothing
 */

const ALLOWED = /^[\p{Script=Latin}0-9_-]{3,32}$/u;
const COMBINING = /\p{M}/gu;

/** Whether a name meets the rule (D36); `name` as typed, trimmed. */
export function nameAllowed(name: string): boolean {
  const composed = name.normalize('NFC');
  return composed === composed.normalize('NFKC') && ALLOWED.test(composed);
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
