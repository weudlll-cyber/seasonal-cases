-- @file   apps/server/src/db/migrations/0005_drop_account_badges.sql
-- @brief  The icon list goes: the steps hold the icons (DECISIONS D79).
--
-- Responsibility: drop `accounts.badges`. Migration 0004 added `steps`, which the screens now
--                 draw from; a website member's steps are written again on every sign-in.
ALTER TABLE accounts DROP COLUMN badges;
