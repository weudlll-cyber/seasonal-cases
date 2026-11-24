-- @file   apps/server/src/db/migrations/0004_account_steps.sql
-- @brief  A website member's steps, as the website's header gave them (DECISIONS D65).
--
-- Responsibility: night chain SC-N8 piece 5b. The kit's header draws a member's step badges from
--                 the steps themselves (ladder, name, icon), so they are kept as received, beside
--                 `badges` (the icons alone, which the boards use). Standalone accounts have none.
ALTER TABLE accounts ADD COLUMN steps jsonb NOT NULL DEFAULT '[]';
