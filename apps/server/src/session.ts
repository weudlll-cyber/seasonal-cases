/**
 * @file   apps/server/src/session.ts
 * @brief  The development session: the signed-in user in a signed cookie.
 *
 * Responsibility: write and read the session cookie `sc_session` (signed, http-only,
 *                 same-site lax). Its value is the user as JSON in base64url; the signature
 *                 (@fastify/cookie) makes it tamper-proof. Read from a request, or from a raw
 *                 Cookie header for the socket's handshake.
 * Depends on:     fastify, @fastify/cookie, @sc/contracts
 */
import { MeSchema, type Me } from '@sc/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export const SESSION_COOKIE = 'sc_session';

const encode = (me: Me): string => Buffer.from(JSON.stringify(me), 'utf8').toString('base64url');

function decode(app: FastifyInstance, signed: string | undefined): Me | null {
  if (signed === undefined) return null;
  const unsigned = app.unsignCookie(signed);
  if (!unsigned.valid) return null;
  try {
    const parsed = MeSchema.safeParse(
      JSON.parse(Buffer.from(unsigned.value, 'base64url').toString('utf8')),
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function setSession(reply: FastifyReply, me: Me): void {
  reply.setCookie(SESSION_COOKIE, encode(me), {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
}

export function clearSession(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

/** The signed-in user of a request, or null. */
export function sessionOf(app: FastifyInstance, request: FastifyRequest): Me | null {
  return decode(app, request.cookies[SESSION_COOKIE]);
}

/** The signed-in user of a raw Cookie header (the socket's handshake), or null. */
export function sessionFromHeader(app: FastifyInstance, header: string | undefined): Me | null {
  if (header === undefined) return null;
  return decode(app, app.parseCookie(header)[SESSION_COOKIE]);
}
