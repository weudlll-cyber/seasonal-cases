-- @file   apps/server/src/db/migrations/0001_initial.sql
-- @brief  The first tables: accounts with their ranks, sessions, two-factor sign-in, the shows'
--         event log, and the server's small state (the account feed's cursor).
--
-- Responsibility: night chain SC-N2 piece 5. A published migration never changes; a new one
--                 follows. Every table lives in the pool's schema (search_path, ../pool.ts).

-- An account: a development, local or website account (../../auth/accounts.ts). A website
-- account is keyed by (website origin, website user id), never by name or e-mail
-- (GAME-INTEGRATION §3). The rank is 0–5 (CONCEPT §4); badges are website step icons.
CREATE TABLE accounts (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('dev', 'local', 'website')),
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('player', 'organiser', 'admin')),
  rank integer NOT NULL DEFAULT 0 CHECK (rank BETWEEN 0 AND 5),
  badges jsonb NOT NULL DEFAULT '[]',
  website_origin text,
  website_user_id text,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (website_origin, website_user_id)
);

-- A session: the sha256 of the browser's token, never the token (../../auth/sessions.ts).
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  id text NOT NULL UNIQUE,
  account_id text NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_account ON sessions (account_id);

-- Two-factor sign-in for admins (piece 7): the TOTP secret encrypted with SC_DATA_KEY, the last
-- step used (a step is never accepted twice), and the recovery codes as hashes.
CREATE TABLE two_factor (
  account_id text PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  secret_box text NOT NULL,
  last_step bigint,
  enabled_at timestamptz
);
CREATE TABLE recovery_codes (
  account_id text NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  code_hash bytea NOT NULL,
  used_at timestamptz,
  PRIMARY KEY (account_id, code_hash)
);

-- The shows' append-only event log (CONCEPT §8); a sealed event's assignment and secret are
-- stored encrypted (../eventStore.ts).
CREATE TABLE show_events (
  show_id text NOT NULL,
  seq integer NOT NULL,
  event jsonb NOT NULL,
  PRIMARY KEY (show_id, seq)
);

-- The server's own small state, such as the account feed's cursor.
CREATE TABLE server_state (
  key text PRIMARY KEY,
  value text NOT NULL
);
