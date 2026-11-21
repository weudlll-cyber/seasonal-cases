# Night runs

The morning sheets of the unattended night chains, newest first.

## Night chain SC-N1 (2026-11-21)

Repository, standards and the playable prototype. Branch of the prototype: `proto/cases-v1`
(nothing merged; the owner looks at the branch first).

### Final report

Written when the chain ends.

### Pieces

| Piece                                      | Done                                                                            | Running | Open                            | Needs the owner's word                        | Commits                    | CI run ids                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------- | ------- | ------------------------------- | --------------------------------------------- | -------------------------- | ---------------------------------------------- |
| 1 Repository and standards                 | standards, skeleton, CI, kit v0.5.0, docs; repository created; master protected | —       | Renovate onboarding (see below) | kit tag v0.5.0 vs. the concept's v0.4.1 (D15) | master `0aee998`…`2bf720c` | CI 44850888611 green; CodeQL 44850888453 green |
| 2 Contracts, domain, server                | —                                                                               | —       | all                             | —                                             | —                          | —                                              |
| 3 The client                               | —                                                                               | —       | all                             | —                                             | —                          | —                                              |
| 4 Play-through, browser tests, screenshots | —                                                                               | —       | all                             | —                                             | —                          | —                                              |

### Piece 1 report

- **Commits on master:** `0aee998` standards, `dd65fe2` skeleton, `40a8543` CI, `4b3c5c9` kit,
  `2bf720c` docs. `gh repo create` pushed them; CI run 44850888611 (verify 36 s, security 24 s,
  docs 14 s) and CodeQL run 44850888453 are green.
- **Protection:** `PUT …/branches/master/protection` accepted: required checks `verify`,
  `security`, `docs` (GitHub Actions, strict), admins included, a pull request with 0 approvals,
  no force push, no deletion, linear history not required. The browser job `e2e` (piece 4) is not
  a required check; adding it changes the protection, which needs the owner's word.
- **Reused (copied as pattern, adapted):** Mini Games' package.json scripts, pnpm-workspace.yaml,
  .npmrc, .nvmrc, the three tsconfigs, eslint.config.js with boundaries, prettier, lefthook,
  .editorconfig, .gitattributes, .gitignore (plus `.local/`), renovate.json, SECURITY.md,
  CONTRIBUTING.md, the setup action and the three workflows with their SHAs and digests. The
  kit's `scripts/gitleaks-staged.sh` (Docker answered, so the pre-commit gitleaks step is on).
  The minimatch override from the kit's pnpm-workspace.yaml.
- **Dependencies:** Mini Games' root dev tools at its versions (ESLint 10.13.0, typescript-eslint
  8.71.2, eslint-plugin-boundaries 7.2.0, eslint-import-resolver-typescript 4.4.5, Prettier
  3.9.10, TypeScript 5.9.3, Vitest 5.0.5 with coverage-v8, lefthook 2.2.2, @types/node 22.20.5);
  zod 4.6.7 (contracts); fastify 5.12.7 and tsx 4.23.15 (server); React/react-dom 19.3.1, Vite
  8.3.4, @vitejs/plugin-react 6.1.2, jsdom 30.1.3, Testing Library react 16.3.3 / dom 10.4.2
  (client); `@seasonal/kit` `github:weudlll-cyber/seasonal-kit#v0.5.0`.
- **Tests:** `pnpm verify` green, 7 files, 11 tests. The kit proof (`packages/ui/src/kit.test.ts`)
  imports `@seasonal/kit`, `@seasonal/kit/react` and reads `tokens.css`, `fonts.css`,
  `motion.css`, `fit.css`.

### Choices made without the owner

- **Kit tag:** `git ls-remote` showed `v0.5.0` as the newest tag (the task expected v0.4.1). The
  task's rule is the newest tag, so `v0.5.0` is pinned (DECISIONS D15).
- **Kit's local checkout:** another session was switching `C:\Users\weudl\seasonal-kit` while this
  chain read it (`src/react/` vanished between two reads). The kit was therefore read from the
  installed package of the pinned tag, not from the local checkout.
- **CodeQL permissions:** `security-events: write` sits on the job, so the workflow's top level is
  `contents: read` like every other workflow (Mini Games has both at the top).
- **Browsers workflow:** until master holds `e2e/playwright.config.ts`, the nightly job prints a
  notice and runs nothing, so it is never red for a suite that is not merged yet.

### Needs the owner's hand

- **Renovate:** `renovate.json` is in the tree; whether the Renovate app covers the new repository
  is the owner's setting. Checked again at the end of the chain.
