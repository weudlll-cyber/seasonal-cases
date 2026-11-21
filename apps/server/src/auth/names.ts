/**
 * @file   apps/server/src/auth/names.ts
 * @brief  The key two account names are compared by: equal keys look alike.
 *
 * Responsibility: one rule for every place a name must be unique (security pass, "Names"; SC-N3
 *                 piece 1): NFKC normalisation (full-width and compatibility forms), case folding
 *                 (upper then lower case, so "ß" and "SS" meet), the removal of diacritics (NFD,
 *                 then no combining marks) and of all whitespace. "Ólga", "OLGA" and "o l g a"
 *                 share the key "olga". Letters of different scripts that only look alike (a
 *                 Cyrillic "О") stay different: that needs a confusables table (the owner's word,
 *                 BACKLOG 30). Used by registration and `pnpm sc admin promote`.
 * Depends on:     nothing
 */

const COMBINING = /\p{M}/gu;
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
