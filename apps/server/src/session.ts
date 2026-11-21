/**
 * @file   apps/server/src/session.ts
 * @brief  The session cookie and the signed-in user of a request or a socket.
 *
 * Responsibility: the cookie `sc_session` holds the session's random token, signed
 *                 (@fastify/cookie), http-only, same-site lax, scoped to the base path, secure in
 *                 website mode, for 7 days (GAME-INTEGRATION §3). `signIn` rotates the session:
 *                 the browser's old one ends and a new one opens. The user comes from the account
 *                 behind a live session; a deleted account signs nobody in.
 * Depends on:     fastify, @fastify/cookie, @seasonal/kit/server (SessionEnds), @sc/contracts,
 *                 ./auth/accounts.js, ./auth/sessions.js
 */
import type { SessionEnds } from '@seasonal/kit/server';
import type { Me } from '@sc/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { meOf, type Account, type AccountStore, type Directory } from './auth/accounts.js';
import {
  findSession,
  openSession,
  SESSION_MS,
  type Session,
  type SessionStore,
} from './auth/sessions.js';

export const SESSION_COOKIE = 'sc_session';

export interface Auth {
  readonly accounts: AccountStore;
  readonly sessions: SessionStore;
  readonly directory: Directory;
  readonly ends: SessionEnds;
  readonly cookiePath: string;
  readonly secure: boolean;
  readonly now: () => number;
}

export interface SignedIn {
  readonly me: Me;
  readonly session: Session;
}

function tokenFrom(app: FastifyInstance, signed: string | undefined): string | null {
  if (signed === undefined) return null;
  const unsigned = app.unsignCookie(signed);
  return unsigned.valid ? unsigned.value : null;
}

async function signedInBy(auth: Auth, token: string | null): Promise<SignedIn | null> {
  if (token === null) return null;
  const session = await findSession(auth.sessions, token, auth.now());
  if (session === null) return null;
  const account = await auth.accounts.byId(session.accountId);
  if (account === undefined || account.deleted) return null;
  return { me: meOf(account), session };
}

/** The signed-in user of a request, or null. */
export function sessionOf(
  app: FastifyInstance,
  auth: Auth,
  request: FastifyRequest,
): Promise<SignedIn | null> {
  return signedInBy(auth, tokenFrom(app, request.cookies[SESSION_COOKIE]));
}

/** The signed-in user of a raw Cookie header (the socket's handshake), or null. */
export function sessionFromHeader(
  app: FastifyInstance,
  auth: Auth,
  header: string | undefined,
): Promise<SignedIn | null> {
  if (header === undefined) return Promise.resolve(null);
  return signedInBy(auth, tokenFrom(app, app.parseCookie(header)[SESSION_COOKIE]));
}

/** Ends the request's session, if any, and tells the socket side. */
export async function signOut(
  app: FastifyInstance,
  auth: Auth,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const current = await sessionOf(app, auth, request);
  if (current !== null) {
    await auth.sessions.remove(current.session.id);
    void auth.ends.end([current.session.id]);
  }
  reply.clearCookie(SESSION_COOKIE, { path: auth.cookiePath });
}

/** A fresh session for the account in place of the browser's old one (rotation). */
export async function signIn(
  { app, auth }: { readonly app: FastifyInstance; readonly auth: Auth },
  request: FastifyRequest,
  reply: FastifyReply,
  account: Account,
): Promise<Me> {
  await signOut(app, auth, request, reply);
  auth.directory.update(account);
  const { token } = await openSession(auth.sessions, account.id, auth.now());
  reply.setCookie(SESSION_COOKIE, token, {
    signed: true,
    httpOnly: true,
    sameSite: 'lax',
    secure: auth.secure,
    path: auth.cookiePath,
    maxAge: Math.floor(SESSION_MS / 1000),
  });
  return meOf(account);
}
