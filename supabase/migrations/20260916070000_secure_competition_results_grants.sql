-- Chalega India
-- Secure competition results table grants
-- Created: 2026-09-16

-- Competition results are server-controlled.
-- Normal API users only need to read qualified results.

revoke insert, update, delete, truncate, trigger, references
on table public.competition_results
from anon, authenticated;
