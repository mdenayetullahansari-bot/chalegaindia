-- Chalega India
-- Ward competition leaderboard RPC
-- Created: 2026-09-18

create or replace function public.get_ward_competition_leaderboard(
  p_competition_id uuid
)
returns table (
  rank integer,
  ward_id bigint,
  active_participants integer,
  verified_steps bigint,
  average_verified_steps numeric,
  activity_score numeric
)
language sql
security definer
set search_path = public
as $$
  select
    wcr.rank,
    wcr.ward_id,
    wcr.active_participants,
    wcr.verified_steps,
    wcr.average_verified_steps,
    wcr.activity_score
  from public.ward_competition_results wcr
  where wcr.competition_id = p_competition_id
    and wcr.status = 'pending'
  order by wcr.rank asc, wcr.ward_id asc;
$$;

revoke all on function public.get_ward_competition_leaderboard(uuid)
from public;

grant execute on function public.get_ward_competition_leaderboard(uuid)
to authenticated;