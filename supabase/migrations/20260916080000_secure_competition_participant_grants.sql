-- Chalega India
-- Secure competition participant table grants
-- Created: 2026-09-16

-- Normal users need SELECT and INSERT only.
-- INSERT remains protected by RLS:
-- users can join only as themselves and only active competitions.

revoke update, delete, truncate, trigger, references
on table public.competition_participants
from anon, authenticated;
revoke insert
on table public.competition_participants
from anon;
