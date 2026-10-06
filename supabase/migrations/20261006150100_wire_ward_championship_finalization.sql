-- Step 3B: wire the ward championship finalization path.
create or replace function public.confirm_competition_winners(p_competition_id uuid)
returns void language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_winner_id uuid;
  v_rules_version text;
  v_competition_type text;
  v_ranked_count integer;
begin
  if not exists (select 1 from public.competitions where id=p_competition_id and status='under_review') then
    raise exception 'Competition must be under_review before confirmation.';
  end if;
  select rules_version,competition_type into v_rules_version,v_competition_type
  from public.competitions where id=p_competition_id;

  if v_rules_version='ward-championship-v1' then
    perform public.calculate_ward_competition_results(p_competition_id);
    select count(*) into v_ranked_count
    from public.ward_competition_results
    where competition_id=p_competition_id and status='qualified' and rank is not null;
    if v_ranked_count=0 then raise exception 'Ward championship has no qualified ward results to confirm.'; end if;

    insert into public.ward_competition_prizes(competition_id,rank,reward_type,points_amount,status)
    select c.id,v.rank,'chalega_points',
      case v.rank when 1 then c.first_place_points when 2 then c.second_place_points when 3 then c.third_place_points end,
      'available'
    from public.competitions c cross join (values(1),(2),(3)) v(rank)
    where c.id=p_competition_id on conflict(competition_id,rank) do nothing;

    insert into public.ward_competition_winners(
      competition_id,ward_id,prize_id,rank,verified_steps,active_participants,status
    )
    select wr.competition_id,wr.ward_id,wp.id,wr.rank,wr.verified_steps::bigint,wr.active_participants,'reward_pending'
    from public.ward_competition_results wr
    join public.ward_competition_prizes wp on wp.competition_id=wr.competition_id and wp.rank=wr.rank
    where wr.competition_id=p_competition_id and wr.status='qualified' and wr.rank in(1,2,3)
    on conflict(competition_id,rank) do nothing;

    if not exists(select 1 from public.ward_competition_winners where competition_id=p_competition_id and status='reward_pending') then
      raise exception 'No ward championship podium could be created.';
    end if;

    update public.ward_competition_prizes set status='awarded'
    where competition_id=p_competition_id
      and rank in(select rank from public.ward_competition_winners where competition_id=p_competition_id);

    update public.competitions set status='confirmed',updated_at=now()
    where id=p_competition_id and status='under_review';
    return;
  end if;

  insert into public.competition_prizes(competition_id,rank,reward_type,points_amount,status)
  select c.id,v.rank,'chalega_points',
    case v.rank when 1 then c.first_place_points when 2 then c.second_place_points when 3 then c.third_place_points end,
    'available'
  from public.competitions c cross join (values(1),(2),(3)) v(rank)
  where c.id=p_competition_id on conflict(competition_id,rank) do nothing;

  if v_competition_type='monthly' then
    insert into public.competition_winners(competition_id,user_id,prize_id,rank,verified_steps,status)
    with user_totals as(
      select r.user_id,sum(r.verified_steps)::bigint total_verified_steps,min(r.created_at) first_result_at
      from public.competition_results r where r.competition_id=p_competition_id and r.status='qualified' group by r.user_id
    ), podium as(
      select user_id,row_number() over(order by total_verified_steps desc,first_result_at asc,user_id asc)::integer calculated_rank,total_verified_steps from user_totals
    )
    select p_competition_id,p.user_id,cp.id,p.calculated_rank,p.total_verified_steps::integer,'reward_pending'
    from podium p join public.competition_prizes cp on cp.competition_id=p_competition_id and cp.rank=p.calculated_rank
    where p.calculated_rank in(1,2,3) on conflict(competition_id,rank) do nothing;
  else
    insert into public.competition_winners(competition_id,user_id,prize_id,rank,verified_steps,status)
    select r.competition_id,r.user_id,cp.id,r.rank,r.verified_steps,'reward_pending'
    from public.competition_results r join public.competition_prizes cp on cp.competition_id=r.competition_id and cp.rank=r.rank
    where r.competition_id=p_competition_id and r.status='qualified' and r.rank in(1,2,3)
    on conflict(competition_id,rank) do nothing;
  end if;

  for v_winner_id in select id from public.competition_winners where competition_id=p_competition_id and status='reward_pending' order by rank loop
    perform public.issue_competition_reward(v_winner_id);
  end loop;
  update public.competitions set status='confirmed',updated_at=now() where id=p_competition_id and status='under_review';
end;
$function$;