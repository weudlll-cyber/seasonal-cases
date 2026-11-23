-- @file   apps/server/src/db/migrations/0003_pending_registrations.sql
-- @brief  Registrations waiting for their confirmation link (DECISIONS D42).
--
-- Responsibility: day chain SC-D5 piece 3. One row per e-mail key (lower case, set by the
--                 server); the link's token as its sha256, unique; deleted when its link is used
--                 or once it expired (../pendingStore.ts, ../open.ts at start).
CREATE TABLE pending_registrations (
  email text PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  mailed_at timestamptz NOT NULL
);
CREATE INDEX pending_registrations_expiry ON pending_registrations (expires_at);
