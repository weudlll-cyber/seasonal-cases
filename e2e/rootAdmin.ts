/**
 * @file   e2e/rootAdmin.ts
 * @brief  The standalone admin the browser tests' server seeds (./server.ts) for journey 6.
 *
 * Responsibility: one place for its name, e-mail and password, read by the server that seeds it
 *                 and by the journey that signs in with it. The password is for the e2e server's
 *                 memory only.
 * Depends on:     nothing
 */
export const ROOT = {
  id: 'e2e-root',
  name: 'Root',
  email: 'root@example.org',
  password: 'root password, e2e only',
} as const;
