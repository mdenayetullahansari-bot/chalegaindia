-- Chalega India
-- Secure competition reward tables
-- Created: 2026-09-16

-- Reward tables are server-controlled.
-- Normal API users must not access them directly.
revoke all on table public.competition_prizes from anon, authenticated;
revoke all on table public.competition_winners from anon, authenticated;
