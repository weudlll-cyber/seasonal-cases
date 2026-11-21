/**
 * @file   apps/server/src/db/box.ts
 * @brief  Encryption at rest: what the database must not hold in the clear, sealed with the
 *         server's data key (SC_DATA_KEY).
 *
 * Responsibility: AES-256-GCM with a fresh 12-byte nonce per value; the box is
 *                 `v1.<nonce>.<tag>.<ciphertext>` in base64url. A changed box or a wrong key
 *                 fails to open, never answers garbage. Used for a sealed show's assignment and
 *                 secret (CONCEPT §3.3, §8) and for the TOTP secrets.
 * Depends on:     node:crypto
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const KEY_BYTES = 32;

/** The key from its 64 hex digits; anything else refuses to start the server. */
export function dataKey(hex: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('SC_DATA_KEY must be 64 hex digits');
  return Buffer.from(hex, 'hex');
}

export function seal(key: Buffer, plain: string): string {
  if (key.length !== KEY_BYTES) throw new Error('the data key must be 32 bytes');
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const parts = [nonce, cipher.getAuthTag(), body].map((b) => b.toString('base64url'));
  return `v1.${parts.join('.')}`;
}

export function open(key: Buffer, box: string): string {
  const [version, nonce, tag, body] = box.split('.');
  if (version !== 'v1' || nonce === undefined || tag === undefined || body === undefined) {
    throw new Error('not a sealed value');
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  const plain = Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]);
  return plain.toString('utf8');
}
