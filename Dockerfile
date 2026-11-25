# @file   Dockerfile
# @brief  The production image of Seasonal Cases: deps -> client build / server install -> a small
#         non-root runtime (DECISIONS D76; after seasonal-mini-games Dockerfile).
#
# Responsibility: fetch dependencies from the lockfile only; build the client with Vite for the
#                 mode (SC_MODE: its base path, `/` or `/games/cases/`, is built into it);
#                 install the server's production dependencies (it runs its TypeScript with tsx,
#                 as `pnpm start` does, so no bundle); ship only what runs: the production
#                 node_modules, the server's and the shared packages' sources without their
#                 tests, and the built client, which the server serves (apps/server/src/web.ts).
#                 With NODE_ENV=production no development route exists. It runs as uid 10001 on a
#                 read-only root filesystem with /tmp in memory (ops/compose.yml), keeps nothing on
#                 disk (everything is in PostgreSQL), and its health check asks /readyz.
# Used by:        ops/compose.yml (deploy/install.sh builds it), .github/workflows/ci.yml (job image)

# Base pinned by digest; Renovate keeps tag and digest current.
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS base
WORKDIR /app
# CI=true keeps pnpm non-interactive and makes lefthook skip installing git hooks.
ENV CI=true
# Corepack installs the pnpm version named in package.json "packageManager".
RUN corepack enable

# deps: download every package of the lockfile into the pnpm store. Depends only on the lockfile,
# so this layer stays cached until dependencies change.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

# build: the client for the mode.
FROM deps AS build
ARG SC_MODE=local
COPY . .
RUN pnpm install --frozen-lockfile --offline \
  && SC_MODE="$SC_MODE" pnpm --filter @sc/web build

# prod: the server's production dependencies and its sources, without tests and test helpers.
# `pnpm fetch` has linked every package of the lockfile, development tools among them, so that
# node_modules goes and a production one is installed from the store.
FROM deps AS prod
COPY . .
RUN rm -rf node_modules \
  && pnpm install --frozen-lockfile --offline --prod --filter "@sc/server..." \
  && rm -rf packages/ui apps/web apps/server/src/testing apps/server/src/db/testing.ts \
    apps/server/vitest.config.ts packages/*/src/testing \
  && find apps/server/src packages -name '*.test.ts' -delete

# runtime: production files only, owned by root and therefore read-only for the app user.
FROM node:22-alpine@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a AS runtime
ARG SC_MODE=local
ARG SC_VERSION=unknown
ARG SC_COMMIT=unknown
LABEL org.opencontainers.image.title="Seasonal Cases" \
  org.opencontainers.image.version="$SC_VERSION" \
  org.opencontainers.image.revision="$SC_COMMIT" \
  org.opencontainers.image.source="https://github.com/weudlll-cyber/seasonal-cases" \
  io.seasonal.cases.mode="$SC_MODE"
ENV NODE_ENV=production \
    SC_MODE="$SC_MODE" \
    SC_HOST=0.0.0.0 \
    SC_PORT=3970 \
    SC_CLIENT_DIR=/app/web
WORKDIR /app
# The base's Alpine packages take their security fixes before the next base digest does. The app
# needs only node: drop the bundled package managers and the vulnerabilities that ship with
# them, then add the unprivileged app user.
RUN apk upgrade --no-cache \
  && rm -rf /usr/local/lib/node_modules /opt/yarn-* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && addgroup -S -g 10001 sc && adduser -S -u 10001 -G sc -H sc
# The root package.json names the version the health routes answer (apps/server/src/config.ts).
COPY --from=prod /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json ./
COPY --from=prod /app/node_modules ./node_modules
COPY --from=prod /app/packages ./packages
COPY --from=prod /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./web
USER 10001:10001
WORKDIR /app/apps/server
EXPOSE 3970
# Readiness (the database answers), under the base path of the mode.
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=3 \
  CMD p=/; [ "$SC_MODE" = website ] && p=/games/cases/; wget -qO- "http://127.0.0.1:${SC_PORT}${p}readyz" || exit 1
CMD ["node", "--import=tsx", "src/start.ts"]
