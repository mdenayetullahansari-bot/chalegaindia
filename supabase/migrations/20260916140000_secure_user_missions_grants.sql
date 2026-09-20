-- Chalega India
-- Secure user missions table grants
-- Created: 2026-09-16

-- User missions are user-owned activity data.
-- Authenticated users need only SELECT, INSERT and UPDATE.
-- RLS restricts all three operations to the user's own rows.

revoke delete, truncate, trigger, references
on table public.user_missions
from anon, authenticated;
revoke select, insert, update
on table public.user_missions
from anon;
