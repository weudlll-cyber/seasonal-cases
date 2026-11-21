# Security policy

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub's private vulnerability reporting: open the
repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue for
a security problem.

Include what is affected, how to reproduce it, and the impact you expect. Reports in English are
preferred.

## What happens next

- Triage within 7 days of the report: you get an answer whether the issue is accepted.
- Fix targets after triage: critical within 7 days, high within 30 days.
- Fixes ship in a new release; the advisory is published once the fix is available.

## Scope

The fairness of a show is part of its security: the server draws the case contents, publishes a
commitment before the show and reveals the secret after it ([docs/CONCEPT.md](docs/CONCEPT.md) §8).
A way to learn a case's content before its "Open" step, or to change a sealed assignment unnoticed,
is a vulnerability.

The prototype's development sign-in (name and role, no password) exists only with
`NODE_ENV=development` and `SC_DEV=1` and must never run on a public address.

## Supported versions

Only the latest release receives security fixes.
