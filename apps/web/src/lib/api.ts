/**
 * @file   apps/web/src/lib/api.ts
 * @brief  The client's HTTP calls to the server, through the page's own origin.
 *
 * Responsibility: one GET and one POST helper that send the session cookie, parse JSON and turn
 *                 a refusal into an Error with the server's sentence.
 * Depends on:     @sc/contracts (types)
 */
import type { ApiError } from '@sc/contracts';

async function answer<T>(response: Response): Promise<T> {
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const error = (body as Partial<ApiError>).error;
    throw new Error(error ?? `the server answered ${String(response.status)}`);
  }
  return body as T;
}

export async function getJson<T>(path: string): Promise<T> {
  return answer<T>(await fetch(path, { credentials: 'same-origin' }));
}

export async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return answer<T>(response);
}
