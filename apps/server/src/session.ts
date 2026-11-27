/**
 * @file   apps/server/src/session.ts
 * @brief  The session cookie and the signed-in user of a request or a socket.
 *
 * Responsibility: the session cookie, named and attributed by the kit (`sessionCookie`: `sc_session`
 *                 on plain http under the base path, `__Host-sc_session` at the root of its own
 *                 host, `__Secure-sc_session` under the website's path; D69), holds the session's random token, signed
 *                 (@fastify/cookie), http-only, same-site lax, secure in website mode and behind
 *                 https, for 7 days as the session itself (GAME-INTEGRATION §3). `signIn` rotates the session:
 *                 the browser's old one ends and a new one opens. The user comes from the account
 *                 behind a live session; a deleted account signs nobody in, nor does a development
 *                 account once the development features are off.
 * Depends on:     fastify, @fastify/cookie, @seasonal/kit/server, @sc/contracts,
 *                 ./auth/accounts.js, ./auth/sessions.js, ./auth/twoFactor.js (types)
 */
import { sessionCookieOptions, type SessionCookie, type SessionEnds } from '@seasonal/kit/server';
import type { Me } from '@sc/contracts';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { meOf, type Account, type AccountStore, type Directory } from './auth/accounts.js';
import type { TwoFactorStore } from './auth/twoFactor.js';
import {
  findSession,
  openSession,
  SESSION_DAYS,
  type Session,
  type SessionStore,
} from './auth/sessions.js';

export interface Auth {
  readonly accounts: AccountStore;
  readonly sessions: SessionStore;
  readonly twoFactor: TwoFactorStore;
  // The recovery codes' HMAC key (./config.ts).
  readonly recoveryKey: Buffer;
  readonly directory: Directory;
  readonly ends: SessionEnds;
  readonly cookie: SessionCookie;
  // Whether development accounts may sign in: only while the development features are on, so
  // a database that once ran in development keeps no back door (security pass, finding 12).
  readonly devAccounts: boolean;
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
  if (account.kind === 'dev' && !auth.devAccounts) return null;
  return { me: meOf(account), session };
}

/** The signed-in user of a request, or null. */
export function sessionOf(
  app: FastifyInstance,
  auth: Auth,
  request: FastifyRequest,
): Promise<SignedIn | null> {
  return signedInBy(auth, tokenFrom(app, request.cookies[auth.cookie.name]));
}

/** The signed-in user of a raw Cookie header (the socket's handshake), or null. */
export function sessionFromHeader(
  app: FastifyInstance,
  auth: Auth,
  header: string | undefined,
): Promise<SignedIn | null> {
  if (header === undefined) return Promise.resolve(null);
  return signedInBy(auth, tokenFrom(app, app.parseCookie(header)[auth.cookie.name]));
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
  reply.clearCookie(auth.cookie.name, sessionCookieOptions(auth.cookie));
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
  reply.setCookie(auth.cookie.name, token, {
    ...sessionCookieOptions(auth.cookie, SESSION_DAYS),
    signed: true,
  });
  return meOf(account);
}
