-- Chalega India
-- Secure missions table grants
-- Created: 2026-09-16

-- Missions are a public catalog.
-- Normal users may only read active missions.

revoke insert, update, delete, truncate, trigger, references
on table public.missions
from anon, authenticated;
