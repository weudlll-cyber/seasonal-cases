/**
 * @file   e2e/stubShared.ts
 * @brief  What the stand-in website, the website-mode game server and journey 4 share.
 *
 * Responsibility: the stand-in's address and proxy secret (test values, never a real secret),
 *                 and the members it knows: their website ids, names, hosting rights and steps
 *                 (member 9: a 32-character name and three steps, for the header's run).
 * Depends on:     nothing
 */

export const STUB_PORT = 5485;
export const STUB_ORIGIN = `http://127.0.0.1:${String(STUB_PORT)}`;
export const GAME_PORT = 3990;
export const STUB_PROXY_SECRET = 'e2e-proxy-secret-not-for-production';

export const STEP_ICON = '/media/step-icons/0123456789abcdef0123456789abcdef.webp';
const icon = (hex: string) => `/media/step-icons/${hex.repeat(32)}.webp`;

// Exactly the longest name a member can have (the game's NAME_MAX).
export const LONG_NAME = 'Wolfgang Amadeus Mozart-Schubert';

export interface StubMember {
  readonly id: number;
  readonly name: string;
  readonly canHost: boolean;
  readonly steps: readonly { ladder: string; name: string; icon: string | null }[];
}

// Who signs in at the stand-in's /login: the cookie `stub-as` names the id, else Ana.
export const MEMBERS: readonly StubMember[] = [
  {
    id: 7,
    name: 'Ana',
    canHost: false,
    steps: [{ ladder: 'holder', name: 'Golden', icon: STEP_ICON }],
  },
  { id: 8, name: 'Olga', canHost: true, steps: [] },
  // The header's longest case (D65): a 32-character name and the three steps a member can have.
  {
    id: 9,
    name: LONG_NAME,
    canHost: false,
    steps: [
      { ladder: 'holder', name: 'Golden', icon: icon('a') },
      { ladder: 'farmer', name: 'Sower', icon: icon('b') },
      { ladder: 'investor', name: 'Backer', icon: icon('c') },
    ],
  },
];
