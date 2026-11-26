/**
 * @file   e2e/stubShared.ts
 * @brief  What the stand-in website, the website-mode game server and its browser tests share.
 *
 * Responsibility: the website-mode ports and proxy secret (test values, never a real secret), and
 *                 the members the stand-in knows: their website ids, names, hosting rights and
 *                 steps (member 9: a 32-character name and three steps, for the header's run).
 * Depends on:     @seasonal/kit/testing (types)
 */
import type { StandInMember } from '@seasonal/kit/testing';

export const GAME_PORT = 3990;
// The website-mode client (Vite), which the stand-in website serves under /games/cases/; the game
// server is told this address as its website's.
export const APP_PORT = 5485;
export const APP_ORIGIN = `http://127.0.0.1:${String(APP_PORT)}`;
export const STUB_PROXY_SECRET = 'e2e-proxy-secret-not-for-production';

export const STEP_ICON = '/media/step-icons/0123456789abcdef0123456789abcdef.webp';
const icon = (hex: string) => `/media/step-icons/${hex.repeat(32)}.webp`;

// Exactly the longest name a member can have (the game's NAME_MAX).
export const LONG_NAME = 'Wolfgang Amadeus Mozart-Schubert';

export const MEMBERS: readonly StandInMember[] = [
  {
    id: 7,
    name: 'Ana',
    role: 'member',
    steps: [{ ladder: 'holder', name: 'Golden', icon: STEP_ICON }],
  },
  { id: 8, name: 'Olga', role: 'member', canHost: true },
  // The header's longest case (D65): a 32-character name and the three steps a member can have.
  {
    id: 9,
    name: LONG_NAME,
    role: 'member',
    steps: [
      { ladder: 'holder', name: 'Golden', icon: icon('a') },
      { ladder: 'farmer', name: 'Sower', icon: icon('b') },
      { ladder: 'investor', name: 'Backer', icon: icon('c') },
    ],
  },
];
