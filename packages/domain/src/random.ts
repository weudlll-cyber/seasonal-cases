/**
 * @file   packages/domain/src/random.ts
 * @brief  The random port and the seeded deterministic generator of test mode.
 *
 * Responsibility: every random value in the domain comes through `RandomPort` (CLAUDE.md: no
 *                 randomness except injected ports). Production injects a secure port from the
 *                 server (node:crypto); test mode injects `seededRandom(seed)`, so a Quick Test
 *                 seed reproduces the same bots and the same sealing (CONCEPT §8).
 * Depends on:     node:crypto (sha256, pure computation)
 */
import { createHash } from 'node:crypto';

export interface RandomPort {
  /** A uniform whole number in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** `bytes` uniform bytes as lower-case hex. */
  hex(bytes: number): string;
}

// 2^32: one draw is a 32-bit word of the stream.
const WORD = 0x1_0000_0000;

/**
 * A deterministic stream: block i is sha256(seed ":" i), read 4 bytes at a time. Uniform
 * integers by rejection sampling, so no value is favoured.
 */
export function seededRandom(seed: string): RandomPort {
  let counter = 0;
  let block = Buffer.alloc(0);
  let offset = 0;
  const nextByte = (): number => {
    if (offset >= block.length) {
      block = createHash('sha256')
        .update(`${seed}:${String(counter)}`)
        .digest();
      counter += 1;
      offset = 0;
    }
    const byte = block[offset] ?? 0;
    offset += 1;
    return byte;
  };
  const nextWord = (): number =>
    ((nextByte() << 24) | (nextByte() << 16) | (nextByte() << 8) | nextByte()) >>> 0;
  return {
    int(maxExclusive) {
      if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > WORD) {
        throw new RangeError('maxExclusive must be a whole number from 1 to 2^32');
      }
      // The largest multiple of maxExclusive below 2^32; draws above it are thrown away.
      const limit = WORD - (WORD % maxExclusive);
      for (;;) {
        const word = nextWord();
        if (word < limit) return word % maxExclusive;
      }
    },
    hex(bytes) {
      return Array.from({ length: bytes }, () => nextByte().toString(16).padStart(2, '0')).join('');
    },
  };
}
