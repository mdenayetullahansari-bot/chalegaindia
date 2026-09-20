-- Chalega India
-- Secure competition categories table grants
-- Created: 2026-09-16

-- Competition categories are an authenticated read-only catalog.
-- Normal users may only read active categories.

revoke insert, update, delete, truncate, trigger, references
on table public.competition_categories
from anon, authenticated;
revoke select
on table public.competition_categories
from anon;
