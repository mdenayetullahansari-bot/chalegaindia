-- Chalega India
-- Secure competitions table grants
-- Created: 2026-09-16

-- Competition lifecycle is server-controlled.
-- Normal API users only need to read competitions.

revoke insert, update, delete, truncate, trigger, references
on table public.competitions
from anon, authenticated;
