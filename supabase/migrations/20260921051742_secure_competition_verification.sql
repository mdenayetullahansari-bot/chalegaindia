-- Chalega India
-- Secure competition result verification
-- Created: 2026-09-20
--
-- Competition results are submitted as pending.
-- Before ranking, service_role verification reads the user's
-- server-stored daily_steps record for the exact result date.
-- Only verified rows may receive ranks or competition rewards.
--
-- IMPORTANT: daily_steps is currently client-writable, so this is
-- server-controlled verification against recorded app activity,
-- not hardware-attested anti-cheat.

alter table public.competition_results
  add column if not exists verification_source text,
  add column if not exists verified_at timestamptz;

alter table public.competition_results
  drop constraint if exists competition_results_verification_source_check;

alter table public.competition_results
  add constraint competition_results_verification_source_check
  check (
    verification_source is null
    or verification_source in (
      'daily_steps',
      'missing_daily_steps'
    )
  );

create or replace function public.verify_pending_competition_results(
  p_competition_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_competition_status text;
  v_result record;
  v_steps integer;
  v_qualified integer := 0;
  v_disqualified integer := 0;
begin
  select status
    into v_competition_status
  from public.competitions
  where id = p_competition_id;

  if not found or v_competition_status <> 'under_review' then
    raise exception
      'Competition must be under_review before verification.';
  end if;

  for v_result in
    select
      id,
      user_id,
      result_date
    from public.competition_results
    where competition_id = p_competition_id
      and status = 'pending'
    order by created_at asc, id asc
    for update
  loop
    v_steps := null;

    select ds.steps
      into v_steps
    from public.daily_steps ds
    where ds.user_id = v_result.user_id
      and ds.step_date = v_result.result_date
    limit 1;

    if v_steps is not null
       and v_steps > 0
       and v_steps <= 100000 then

      update public.competition_results
      set
        verified_steps = v_steps,
        status = 'qualified',
        verification_source = 'daily_steps',
        verified_at = now(),
        updated_at = now()
      where id = v_result.id;

      v_qualified := v_qualified + 1;

    else

      update public.competition_results
      set
        verified_steps = 0,
        status = 'disqualified',
        verification_source = 'missing_daily_steps',
        verified_at = now(),
        updated_at = now()
      where id = v_result.id;

      v_disqualified := v_disqualified + 1;

    end if;
  end loop;

  return jsonb_build_object(
    'success', true,
    'competition_id', p_competition_id,
    'qualified', v_qualified,
    'disqualified', v_disqualified
  );
end;
$function$;

revoke all
  on function public.verify_pending_competition_results(uuid)
  from public, anon, authenticated;

grant execute
  on function public.verify_pending_competition_results(uuid)
  to service_role;

create or replace function public.prepare_competition_for_review(
  p_competition_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  update public.competitions
  set
    status = 'under_review',
    updated_at = now()
  where id = p_competition_id
    and status = 'closed';

  if not exists (
    select 1
    from public.competitions
    where id = p_competition_id
      and status = 'under_review'
  ) then
    raise exception
      'Competition must be closed or under_review before review preparation.';
  end if;

  perform public.verify_pending_competition_results(
    p_competition_id
  );

  update public.competition_results
  set
    rank = null,
    updated_at = now()
  where competition_id = p_competition_id;

  with ranked_results as
    select
      id,
      row_number() over (
        order by
          verified_steps desc,
          created_at asc,
          id asc
      )::integer as calculated_rank
    from public.competition_results
    where competition_id = p_competition_id
      and status = 'qualified'
  )
  update public.competition_results cr
  set
    rank = rr.calculated_rank ,
    updated_at = now()
  from ranked_results rr
  where cr.id = rr.id;
end;
$function$;

revoke all
  on function public.prepare_competition_for_review(uuid)
  from public, anon, authenticated;

grant execute
  on function public.prepare_competition_for_review(uuid)
  to service_role;
