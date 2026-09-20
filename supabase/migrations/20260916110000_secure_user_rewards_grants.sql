-- Chalega India
-- Secure user rewards table grants
-- Created: 2026-09-16

-- Reward requests require authentication.
-- Normal users need only SELECT and INSERT.
-- RLS restricts both operations to the user's own reward requests.

revoke update, delete, truncate, trigger, references
on table public.user_rewards
from anon, authenticated;
revoke select, insert
on table public.user_rewards
from anon;
