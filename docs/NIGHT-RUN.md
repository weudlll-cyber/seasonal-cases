# Night runs

The morning sheets of the unattended night chains, newest first.

## Night chain SC-N1 (2026-11-21)

Repository, standards and the playable prototype. Branch of the prototype: `proto/cases-v1`
(nothing merged; the owner looks at the branch first).

### Final report

Written when the chain ends.

### Pieces

| Piece                                      | Done                                      | Running | Open | Needs the owner's word                        | Commits     | CI run ids |
| ------------------------------------------ | ----------------------------------------- | ------- | ---- | --------------------------------------------- | ----------- | ---------- |
| 1 Repository and standards                 | standards, skeleton, CI, kit v0.5.0, docs | —       | —    | kit tag v0.5.0 vs. the concept's v0.4.1 (D15) | on `master` | —          |
| 2 Contracts, domain, server                | —                                         | —       | all  | —                                             | —           | —          |
| 3 The client                               | —                                         | —       | all  | —                                             | —           | —          |
| 4 Play-through, browser tests, screenshots | —                                         | —       | all  | —                                             | —           | —          |

### Choices made without the owner

- **Kit tag:** `git ls-remote` showed `v0.5.0` as the newest tag (the task expected v0.4.1). The
  task's rule is the newest tag, so `v0.5.0` is pinned (DECISIONS D15).
- **Kit's local checkout:** another session was switching `C:\Users\weudl\seasonal-kit` while this
  chain read it (`src/react/` vanished between two reads). The kit was therefore read from the
  installed package of the pinned tag, not from the local checkout.

### Needs the owner's hand

Nothing yet.
