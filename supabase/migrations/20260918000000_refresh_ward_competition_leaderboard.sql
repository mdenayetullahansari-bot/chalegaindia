-- Chalega India
-- Update competition scheduler to refresh ward competition leaderboards.
-- Created: 2026-09-18

create or replace function public.refresh_competition_statuses()
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  ward_competition record;
begin
  -- Scheduled competitions become active when their start time arrives.
  update public.competitions
  set
    status = 'active',
    updated_at = now()
  where status = 'scheduled'
    and starts_at <= now()
    and ends_at > now();

  -- Active competitions become closed when their end time arrives.
  update public.competitions
  set
    status = 'closed',
    updated_at = now()
  where status = 'active'
    and ends_at <= now();

  -- Refresh ward leaderboard data for every currently active global
  -- ward competition. The calculation function is idempotent because
  -- it rebuilds only the selected competition's ward result rows.
  for ward_competition in
    select id
    from public.competitions
    where status = 'active'
      and scope = 'global'
      and category_id is null
  loop
    perform public.calculate_ward_competition_results(ward_competition.id);
  end loop;
end;
$function$;

alter function public.refresh_competition_statuses()
  owner to postgres;

revoke all on function public.refresh_competition_statuses() from public;
revoke all on function public.refresh_competition_statuses() from authenticated;
revoke all on function public.refresh_competition_statuses() from anon;
grant execute on function public.refresh_competition_statuses() to service_role;
