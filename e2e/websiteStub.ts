/**
 * @file   e2e/websiteStub.ts
 * @brief  Journey 4's stand-in for the Seasonal Entertainment website and its proxy, on 5485.
 *
 * Responsibility: one node:http process that answers as the website and its nginx do for this
 *                 game (AUTH.md "Embedded games", EMBED.md), after the pattern of Mini Games'
 *                 e2e/websiteStub.ts:
 *                 - `/login?next=` signs a member in (cookie `se.sid`; the cookie `stub-as` names
 *                   which, else Ana) and goes back to `next`;
 *                 - `<base>auth/website…` is the proxy's protected route: the browser's identity
 *                   headers are dropped, the website's answer for the `se.sid` member (or
 *                   `X-Acting-Guest: true`) and the proxy secret are added, then it is forwarded;
 *                 - `<base>api…` and `<base>socket.io…` are forwarded to the game server without
 *                   the website's cookie (GAME-INTEGRATION §3);
 *                 - every other `<base>` path is the client, Vite in middleware mode;
 *                 - `/embed/chat` a minimal chat page speaking the embed's `ready` message,
 *                   `/media/step-icons/…` a step icon, `/games` the games page.
 *                 Test only: never part of an install.
 * Depends on:     node:http, node:net (types), vite, ./stubShared.ts
 */
import {
  createServer as httpServer,
  request,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import type { Socket } from 'node:net';
import { fileURLToPath } from 'node:url';

import { createServer as viteServer } from 'vite';

import { GAME_PORT, MEMBERS, STUB_PORT, STUB_PROXY_SECRET, type StubMember } from './stubShared.js';

const BASE = '/games/cases/';
const IDENTITY = /^x-acting-|^x-sc-proxy-secret$/;

function memberHeaders(m: StubMember): Record<string, string> {
  return {
    'x-acting-user-id': String(m.id),
    'x-acting-user': m.name,
    'x-acting-user-roles': 'member',
    'x-acting-user-email-verified': 'true',
    'x-acting-user-can-host': String(m.canHost),
    'x-acting-user-steps': Buffer.from(JSON.stringify(m.steps)).toString('base64url'),
  };
}

const cookie = (req: IncomingMessage, name: string): string | null =>
  new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(req.headers.cookie ?? '')?.[1] ?? null;

/** The request's headers for the game: no identity from the browser, no website cookie. */
function forwardHeaders(req: IncomingMessage, extra: Record<string, string>) {
  const headers: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined || IDENTITY.test(k)) continue;
    headers[k] = k === 'cookie' ? String(v).replace(/(^|;\s*)se\.sid=[^;]*/g, '') : v;
  }
  return { ...headers, ...extra };
}

function forward(req: IncomingMessage, res: ServerResponse, extra: Record<string, string> = {}) {
  const upstream = request(
    {
      host: '127.0.0.1',
      port: GAME_PORT,
      path: req.url,
      method: req.method,
      headers: forwardHeaders(req, extra),
    },
    (answer) => {
      res.writeHead(answer.statusCode ?? 502, answer.headers);
      answer.pipe(res);
    },
  );
  upstream.on('error', (e) => {
    console.error(`stand-in: forward ${String(req.url)} failed: ${e.message}`);
    res.writeHead(502).end();
  });
  req.pipe(upstream);
}

/** The website's authorize answer for the browser's website session (never 401). */
function authorize(req: IncomingMessage): Record<string, string> {
  const id = Number(cookie(req, 'se.sid'));
  const member = MEMBERS.find((m) => m.id === id);
  const identity = member === undefined ? { 'x-acting-guest': 'true' } : memberHeaders(member);
  return { ...identity, 'x-sc-proxy-secret': STUB_PROXY_SECRET };
}

const CHAT_PAGE = `<!doctype html><title>Chat (stand-in)</title><p>Chat (stand-in): room cases</p>
<script>parent.postMessage({ source: 'seasonal-chat', type: 'ready', room: 'cases', signedIn: true }, location.origin);</script>`;
// The smallest valid WebP: one transparent pixel.
const ICON = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64');

function website(req: IncomingMessage, res: ServerResponse): boolean {
  const url = new URL(req.url ?? '/', 'http://stub');
  if (url.pathname === '/login') {
    const as = Number(cookie(req, 'stub-as') ?? MEMBERS[0]?.id);
    res.writeHead(302, {
      location: url.searchParams.get('next') ?? BASE,
      'set-cookie': `se.sid=${String(as)}; Path=/`,
    });
    res.end();
    return true;
  }
  if (url.pathname === '/embed/chat')
    res.writeHead(200, { 'content-type': 'text/html' }).end(CHAT_PAGE);
  else if (url.pathname.startsWith('/media/step-icons/'))
    res.writeHead(200, { 'content-type': 'image/webp' }).end(ICON);
  else if (url.pathname === '/games')
    res.writeHead(200, { 'content-type': 'text/html' }).end('<h1>Games</h1>');
  else return false;
  return true;
}

const vite = await viteServer({
  root: fileURLToPath(new URL('../apps/web/', import.meta.url)),
  configFile: fileURLToPath(new URL('../apps/web/vite.config.ts', import.meta.url)),
  server: { middlewareMode: true, hmr: false },
  appType: 'spa',
});

const server = httpServer((req, res) => {
  const path = req.url ?? '/';
  if (website(req, res)) return;
  if (path.startsWith(`${BASE}auth/website`)) forward(req, res, authorize(req));
  else if (path.startsWith(`${BASE}api`) || path.startsWith(`${BASE}socket.io`)) forward(req, res);
  else if (path.startsWith(BASE)) vite.middlewares(req, res);
  else res.writeHead(404).end();
});

// The socket's upgrade goes to the game as it came, without the website's cookie.
server.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
  const upstream = request({
    host: '127.0.0.1',
    port: GAME_PORT,
    path: req.url,
    headers: forwardHeaders(req, {}),
  });
  upstream.on('upgrade', (answer, game, gameHead: Buffer) => {
    const lines = Object.entries(answer.headers).map(([k, v]) => `${k}: ${String(v)}`);
    socket.write(`HTTP/1.1 101 Switching Protocols\r\n${lines.join('\r\n')}\r\n\r\n`);
    // The game's first frames may arrive with its 101 answer (socket.io's open packet): they
    // come as \`gameHead\` and must reach the browser, or the client waits for them forever.
    if (gameHead.length > 0) socket.write(gameHead);
    game.write(head);
    game.pipe(socket).pipe(game);
  });
  // A refused upgrade is answered as it came, so the client retries at once instead of waiting
  // for its connect timeout; the status is logged for the run's output.
  upstream.on('response', (answer) => {
    console.error(`stand-in: upgrade ${String(req.url)} refused with ${String(answer.statusCode)}`);
    socket.end(`HTTP/1.1 ${String(answer.statusCode ?? 502)} Refused\r\nconnection: close\r\n\r\n`);
  });
  upstream.on('error', (e) => {
    console.error(`stand-in: upgrade ${String(req.url)} failed: ${e.message}`);
    socket.destroy();
  });
  upstream.end();
});

server.listen(STUB_PORT, '127.0.0.1', () => {
  console.log(`stand-in website on http://127.0.0.1:${String(STUB_PORT)}`);
});
