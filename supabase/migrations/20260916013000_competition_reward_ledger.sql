-- Chalega India
-- Competition reward ledger
-- Created: 2026-09-16


-- Profile security:
-- Normal API users may read profiles, but points must never be
-- directly inserted or updated by anon/authenticated clients.
revoke insert, update
  on table public.profiles
  from anon, authenticated;
grant insert(
  id,
  full_name,
  username,
  avatar_url,
  age,
  gender,
  area,
  daily_step_goal,
  ward_id,
  ward_assignment_method,
  ward_assigned_at,
  assembly_id
)
  on table public.profiles
  to anon, authenticated;
grant update(
  full_name,
  username,
  avatar_url,
  age,
  gender,
  area,
  daily_step_goal
)
  on table public.profiles
  to anon, authenticated;
create table if not exists public.chalega_points_transactions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id),

  amount integer not null
    check (amount <> 0),

  balance_after integer not null
    check (balance_after >= 0),

  transaction_type text not null,

  transaction_key text not null unique,

  competition_id uuid
    references public.competitions(id),

  competition_winner_id uuid
    references public.competition_winners(id),

  description text not null,

  created_at timestamptz not null default now()
);
alter table public.chalega_points_transactions
  enable row level security;
-- Server-controlled ledger:
-- normal API users must not have direct table access.
revoke all
  on table public.chalega_points_transactions
  from anon, authenticated;
create or replace function public.issue_competition_reward(
  p_winner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_winner public.competition_winners%rowtype;
  v_prize public.competition_prizes%rowtype;
  v_current_points integer;
  v_new_balance integer;
  v_transaction_key text;
  v_transaction_id uuid;
begin

  select *
    into v_winner
    from public.competition_winners
   where id = p_winner_id
   for update;

  if not found then
    raise exception 'Competition winner not found.';
  end if;


  if v_winner.status = 'reward_issued' then

    select points
      into v_current_points
      from public.profiles
     where id = v_winner.user_id;

    return jsonb_build_object(
      'success', true,
      'already_issued', true,
      'winner_id', v_winner.id,
      'transaction_key', v_winner.reward_transaction_key,
      'balance', coalesce(v_current_points, 0)
    );

  end if;


  if v_winner.status not in ('confirmed', 'reward_pending') then
    raise exception
      'Winner is not eligible for reward issuance. Status: %',
      v_winner.status;
  end if;


  if v_winner.prize_id is null then
    raise exception 'Competition winner has no prize assigned.';
  end if;


  select *
    into v_prize
    from public.competition_prizes
   where id = v_winner.prize_id
   for update;

  if not found then
    raise exception 'Competition prize not found.';
  end if;


  if v_prize.reward_type <> 'chalega_points' then
    raise exception
      'Unsupported competition reward type: %',
      v_prize.reward_type;
  end if;


  if v_prize.points_amount <= 0 then
    raise exception 'Competition prize has no points amount.';
  end if;


  if v_prize.status = 'cancelled' then
    raise exception 'Competition prize is cancelled.';
  end if;


  v_transaction_key :=
    'competition_reward:' || v_winner.id::text;


  select points
    into v_current_points
    from public.profiles
   where id = v_winner.user_id
   for update;

  if not found then
    raise exception 'Winner profile not found.';
  end if;


  select id
    into v_transaction_id
    from public.chalega_points_transactions
   where transaction_key = v_transaction_key;

  if found then

    update public.competition_winners
       set status = 'reward_issued',
           reward_issued_at = coalesce(
             reward_issued_at,
             now()
           ),
           reward_transaction_key = v_transaction_key
     where id = v_winner.id;

    return jsonb_build_object(
      'success', true,
      'already_issued', true,
      'winner_id', v_winner.id,
      'transaction_id', v_transaction_id,
      'transaction_key', v_transaction_key,
      'balance', v_current_points
    );

  end if;


  v_new_balance :=
    coalesce(v_current_points, 0) + v_prize.points_amount;


  insert into public.chalega_points_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    transaction_key,
    competition_id,
    competition_winner_id,
    description
  )
  values (
    v_winner.user_id,
    v_prize.points_amount,
    v_new_balance,
    'competition_reward',
    v_transaction_key,
    v_winner.competition_id,
    v_winner.id,
    'Competition reward — Rank ' || v_winner.rank
  )
  returning id into v_transaction_id;


  update public.profiles
     set points = v_new_balance,
         updated_at = now()
   where id = v_winner.user_id;


  update public.competition_winners
     set status = 'reward_issued',
         reward_issued_at = now(),
         reward_transaction_key = v_transaction_key
   where id = v_winner.id;


  update public.competition_prizes
     set status = 'awarded'
   where id = v_prize.id
     and status <> 'cancelled';


  return jsonb_build_object(
    'success', true,
    'already_issued', false,
    'winner_id', v_winner.id,
    'transaction_id', v_transaction_id,
    'transaction_key', v_transaction_key,
    'points_awarded', v_prize.points_amount,
    'balance', v_new_balance
  );

end;
$function$;
revoke all
  on function public.issue_competition_reward(uuid)
  from public, anon, authenticated;
grant execute
  on function public.issue_competition_reward(uuid)
  to service_role;
create or replace function public.confirm_competition_winners(
  p_competition_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_winner_id uuid;
begin

  if not exists (
    select 1
    from public.competitions
    where id = p_competition_id
      and status = 'under_review'
  ) then
    raise exception
      'Competition must be under_review before confirmation.';
  end if;


  insert into public.competition_prizes (
    competition_id,
    rank,
    reward_type,
    points_amount,
    status
  )
  select
    c.id,
    v.rank,
    'chalega_points',
    case v.rank
      when 1 then c.first_place_points
      when 2 then c.second_place_points
      when 3 then c.third_place_points
    end,
    'available'
  from public.competitions c
  cross join (
    values (1), (2), (3)
  ) as v(rank)
  where c.id = p_competition_id
  on conflict (competition_id, rank) do nothing;


  insert into public.competition_winners (
    competition_id,
    user_id,
    prize_id,
    rank,
    verified_steps,
    status
  )
  select
    r.competition_id,
    r.user_id,
    cp.id,
    r.rank,
    r.verified_steps,
    'reward_pending'
  from public.competition_results r
  join public.competition_prizes cp
    on cp.competition_id = r.competition_id
   and cp.rank = r.rank
  where r.competition_id = p_competition_id
    and r.status = 'qualified'
    and r.rank in (1, 2, 3)
  on conflict (competition_id, rank) do nothing;


  for v_winner_id in
    select id
    from public.competition_winners
    where competition_id = p_competition_id
      and status = 'reward_pending'
    order by rank
  loop
    perform public.issue_competition_reward(v_winner_id);
  end loop;


  update public.competitions
  set
    status = 'confirmed',
    updated_at = now()
  where id = p_competition_id
    and status = 'under_review';

end;
$function$;
revoke all
  on function public.confirm_competition_winners(uuid)
  from public, anon, authenticated;
grant execute
  on function public.confirm_competition_winners(uuid)
  to service_role;
