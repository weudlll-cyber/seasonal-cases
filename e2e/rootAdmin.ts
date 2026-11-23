/**
 * @file   e2e/rootAdmin.ts
 * @brief  The standalone admins the browser tests' server seeds (./server.ts) for journey 6: one
 *         per browser project.
 *
 * Responsibility: one place for their names, e-mails and password, read by the server that
 *                 seeds them and by the journey that signs in with one. Journey 6 sets up its
 *                 admin's two-factor sign-in, which lives as long as the e2e server; a run of
 *                 several projects shares one server, so each project signs in as its own admin
 *                 (BACKLOG 40). The password is for the e2e server's memory only.
 * Depends on:     nothing
 */
export interface RootAdmin {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly password: string;
}

// The browser projects of ./playwright.config.ts that run journey 6.
export const ROOT_PROJECTS = [
  'chromium',
  'firefox',
  'chromium-mobile',
  'firefox-mobile',
  'webkit',
  'webkit-mobile',
] as const;

/** The admin of one browser project. */
export function rootFor(project: string): RootAdmin {
  return {
    id: `e2e-root-${project}`,
    name: `Root-${project}`,
    email: `root.${project}@example.org`,
    password: 'root password, e2e only',
  };
}
