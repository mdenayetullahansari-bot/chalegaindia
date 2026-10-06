-- Harden ward championship scoring and deterministic ties.
-- Preserves the existing activity-score formula:
-- total verified steps + (active participants * 1000) + average verified steps.
-- Uses deterministic row_number tie-breaking and qualified result status.
create or replace function public.calculate_ward_competition_results(p_competition_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
begin
  if not exists (select 1 from public.competitions where id=p_competition_id and rules_version='ward-championship-v1') then
    raise exception 'Competition is not a ward championship.';
  end if;
  delete from public.ward_competition_results where competition_id=p_competition_id;
  insert into public.ward_competition_results(
    competition_id,ward_id,active_participants,verified_steps,average_verified_steps,activity_score,rank,status)
  with ward_stats as (
    select p.ward_id,count(distinct r.user_id)::integer active_participants,
           coalesce(sum(r.verified_steps),0)::bigint verified_steps,
           coalesce(avg(r.verified_steps),0)::numeric average_verified_steps
    from public.competition_results r join public.profiles p on p.id=r.user_id
    where r.competition_id=p_competition_id and r.status='qualified' and p.ward_id is not null
    group by p.ward_id
  ), scored as (
    select ws,(ws.verified_steps::numeric+(ws.active_participants::numeric*1000)+ws.average_verified_steps) calculated_score
    from ward_stats ws
  ), ranked as (
    select s.*,row_number() over(order by s.calculated_score desc,s.verified_steps desc,s.active_participants desc,s.average_verified_steps desc,s.ward_id asc)::integer calculated_rank
    from scored s
  )
  select p_competition_id,r.ward_id,r.active_participants,r.verified_steps,r.average_verified_steps,
         r.calculated_score,r.calculated_rank,'qualified' from ranked r;
end;
$function$;

drop function public.get_ward_competition_leaderboard(uuid);
create function public.get_ward_competition_leaderboard(p_competition_id uuid)
returns table(rank integer,ward_id integer,active_participants integer,verified_steps bigint,average_verified_steps numeric,activity_score numeric)
language sql security definer set search_path to 'public'
as $function$
  select wcr.rank,wcr.ward_id,wcr.active_participants,wcr.verified_steps,wcr.average_verified_steps,wcr.activity_score
  from public.ward_competition_results wcr
  where wcr.competition_id=p_competition_id and wcr.status='qualified'
  order by wcr.rank asc,wcr.ward_id asc;
$function$;
revoke execute on function public.get_ward_competition_leaderboard(uuid) from anon;
grant execute on function public.get_ward_competition_leaderboard(uuid) to authenticated;
