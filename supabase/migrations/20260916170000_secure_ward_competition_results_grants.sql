-- Chalega India
-- Secure ward competition results table grants
-- Created: 2026-09-16

-- Ward competition results are calculated server-side.
-- Normal API users must not access this internal result table directly.

revoke all
on table public.ward_competition_results
from anon, authenticated;
