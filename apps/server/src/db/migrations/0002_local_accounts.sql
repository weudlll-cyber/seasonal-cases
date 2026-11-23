-- @file   apps/server/src/db/migrations/0002_local_accounts.sql
-- @brief  Standalone accounts' sign-in data and the forgotten-password tokens.
--
-- Responsibility: night chain SC-N2 piece 6 (DECISIONS D24). The keys are stored lower case by
--                 the server (../../auth/credentials.ts), so plain unique indexes suffice.

-- A local account's name key and e-mail, both unique, and its Argon2id hash.
CREATE TABLE local_credentials (
  account_id text PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  name_key text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

-- A reset link's token as its sha256; used once, valid until it expires.
CREATE TABLE password_resets (
  token_hash text PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX password_resets_account ON password_resets (account_id);
