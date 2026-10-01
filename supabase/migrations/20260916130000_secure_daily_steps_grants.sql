-- Chalega India
-- Secure daily steps table grants
-- Created: 2026-09-16

-- Daily steps are user-owned activity data.
-- Authenticated users need only SELECT, INSERT and UPDATE.
-- RLS restricts all three operations to the user's own rows.

revoke delete, truncate, trigger, references
on table public.daily_steps
from anon, authenticated;
revoke select, insert, update
on table public.daily_steps
from anon;
