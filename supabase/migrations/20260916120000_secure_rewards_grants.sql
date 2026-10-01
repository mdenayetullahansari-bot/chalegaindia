-- Chalega India
-- Secure rewards table grants
-- Created: 2026-09-16

-- Rewards are a public catalog.
-- Normal users may only read active rewards.

revoke insert, update, delete, truncate, trigger, references
on table public.rewards
from anon, authenticated;
