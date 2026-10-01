-- Harden step sync, referral qualification, and internal Chalega Coin rewards.
-- Applied to Supabase production as:
-- 20261001_harden_step_referral_coin_backend

create table if not exists public.chalega_reward_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  provider text,
  provider_event_id text,
  transaction_key text not null unique,
  coins integer not null check (coins > 0),
  status text not null default 'awarded'
    check (status in ('pending', 'awarded', 'rejected')),
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists chalega_reward_events_user_id_idx
  on public.chalega_reward_events(user_id);

create index if not exists chalega_reward_events_provider_event_idx
  on public.chalega_reward_events(provider, provider_event_id);

alter table public.chalega_reward_events enable row level security;

revoke all on public.chalega_reward_events from anon, authenticated;
grant all on public.chalega_reward_events to service_role;

create or replace function public.sync_my_daily_steps(
  p_step_date date,
  p_steps integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid;
  v_existing_steps integer;
  v_final_steps integer;
  v_row public.daily_steps%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_step_date is null then
    raise exception 'Step date is required.';
  end if;

  if p_step_date < (current_date - 1)
     or p_step_date > (current_date + 1) then
    raise exception 'Step date is outside the allowed sync window.';
  end if;

  if p_steps is null
     or p_steps < 0
     or p_steps > 200000 then
    raise exception 'Invalid step count.';
  end if;

  select steps
    into v_existing_steps
    from public.daily_steps
   where user_id = v_user_id
     and step_date = p_step_date
   for update;

  v_final_steps :=
    greatest(coalesce(v_existing_steps, 0), p_steps);

  insert into public.daily_steps (
    user_id,
    step_date,
    steps,
    distance_km,
    calories
  )
  values (
    v_user_id,
    p_step_date,
    v_final_steps,
    round((v_final_steps * 0.00072)::numeric, 3),
    round(v_final_steps * 0.04)
  )
  on conflict (user_id, step_date)
  do update
     set steps = greatest(public.daily_steps.steps, excluded.steps),
         distance_km = round(
           (greatest(public.daily_steps.steps, excluded.steps) * 0.00072)::numeric,
           3
         ),
         calories = round(
           greatest(public.daily_steps.steps, excluded.steps) * 0.04
         ),
         updated_at = now()
  returning * into v_row;

  return jsonb_build_object(
    'success', true,
    'step_date', v_row.step_date,
    'steps', v_row.steps,
    'distance_km', v_row.distance_km,
    'calories', v_row.calories
  );
end;
$function$;

revoke execute on function public.sync_my_daily_steps(date, integer)
  from public, anon;
grant execute on function public.sync_my_daily_steps(date, integer)
  to authenticated;

create or replace function public.issue_internal_chalega_coins(
  p_user_id uuid,
  p_amount integer,
  p_transaction_type text,
  p_transaction_key text,
  p_description text,
  p_event_type text default null,
  p_provider text default null,
  p_provider_event_id text default null,
  p_metadata jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_current_points integer;
  v_new_balance integer;
  v_transaction_id uuid;
  v_existing_event public.chalega_reward_events%rowtype;
begin
  if p_user_id is null then
    raise exception 'User ID is required.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Coin amount must be positive.';
  end if;

  if nullif(trim(p_transaction_type), '') is null then
    raise exception 'Transaction type is required.';
  end if;

  if nullif(trim(p_transaction_key), '') is null then
    raise exception 'Transaction key is required.';
  end if;

  select *
    into v_existing_event
    from public.chalega_reward_events
   where transaction_key = trim(p_transaction_key)
   for update;

  if found then
    select points into v_current_points
      from public.profiles where id = p_user_id;

    return jsonb_build_object(
      'success', true,
      'already_awarded', true,
      'event_id', v_existing_event.id,
      'transaction_id', null,
      'coins_awarded', 0,
      'balance', coalesce(v_current_points, 0)
    );
  end if;

  select id
    into v_transaction_id
    from public.chalega_points_transactions
   where transaction_key = trim(p_transaction_key);

  if found then
    select points into v_current_points
      from public.profiles where id = p_user_id;

    insert into public.chalega_reward_events (
      user_id, event_type, provider, provider_event_id,
      transaction_key, coins, status, metadata
    )
    values (
      p_user_id,
      coalesce(nullif(trim(p_event_type), ''), trim(p_transaction_type)),
      nullif(trim(p_provider), ''),
      nullif(trim(p_provider_event_id), ''),
      trim(p_transaction_key),
      p_amount,
      'awarded',
      p_metadata
    )
    on conflict (transaction_key) do nothing;

    return jsonb_build_object(
      'success', true,
      'already_awarded', true,
      'event_id', (
        select id from public.chalega_reward_events
        where transaction_key = trim(p_transaction_key)
      ),
      'transaction_id', v_transaction_id,
      'coins_awarded', 0,
      'balance', coalesce(v_current_points, 0)
    );
  end if;

  select points
    into v_current_points
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  v_current_points := coalesce(v_current_points, 0);
  v_new_balance := v_current_points + p_amount;

  insert into public.chalega_points_transactions (
    user_id, amount, balance_after, transaction_type,
    transaction_key, description
  )
  values (
    p_user_id, p_amount, v_new_balance, trim(p_transaction_type),
    trim(p_transaction_key),
    coalesce(nullif(trim(p_description), ''), 'Chalega Coins reward')
  )
  returning id into v_transaction_id;

  update public.profiles
     set points = v_new_balance
   where id = p_user_id;

  insert into public.chalega_reward_events (
    user_id, event_type, provider, provider_event_id,
    transaction_key, coins, status, metadata
  )
  values (
    p_user_id,
    coalesce(nullif(trim(p_event_type), ''), trim(p_transaction_type)),
    nullif(trim(p_provider), ''),
    nullif(trim(p_provider_event_id), ''),
    trim(p_transaction_key),
    p_amount,
    'awarded',
    p_metadata
  );

  return jsonb_build_object(
    'success', true,
    'already_awarded', false,
    'event_id', (
      select id from public.chalega_reward_events
      where transaction_key = trim(p_transaction_key)
    ),
    'transaction_id', v_transaction_id,
    'coins_awarded', p_amount,
    'balance', v_new_balance
  );

exception
  when unique_violation then
    select points into v_current_points
      from public.profiles where id = p_user_id;

    select id into v_transaction_id
      from public.chalega_points_transactions
     where transaction_key = trim(p_transaction_key);

    return jsonb_build_object(
      'success', true,
      'already_awarded', true,
      'transaction_id', v_transaction_id,
      'coins_awarded', 0,
      'balance', coalesce(v_current_points, 0)
    );
end;
$function$;

revoke execute on function public.issue_internal_chalega_coins(
  uuid, integer, text, text, text, text, text, text, jsonb
) from public, anon, authenticated;

grant execute on function public.issue_internal_chalega_coins(
  uuid, integer, text, text, text, text, text, text, jsonb
) to service_role;

create or replace function public.qualify_my_referral()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid;
  v_referral_id uuid;
  v_referrer_id uuid;
  v_status text;
  v_completed boolean;
  v_referrer_points integer;
  v_referred_points integer;
  v_referrer_balance integer;
  v_referred_balance integer;
  v_referrer_transaction_key text;
  v_referred_transaction_key text;
  v_referrer_transaction_id uuid;
  v_referred_transaction_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select id, referrer_user_id, status
    into v_referral_id, v_referrer_id, v_status
    from public.chalega_referrals
   where referred_user_id = v_user_id
   for update;

  if v_referral_id is null then
    return jsonb_build_object('success', false, 'qualified', false, 'reason', 'no_referral');
  end if;

  if v_status = 'rewarded' then
    return jsonb_build_object(
      'success', true,
      'qualified', true,
      'already_rewarded', true,
      'referral_id', v_referral_id
    );
  end if;

  select completed
    into v_completed
    from public.user_missions
   where user_id = v_user_id
     and mission_id = 1
     and completed = true
   order by completed_at desc nulls last
   limit 1;

  if not coalesce(v_completed, false) then
    select exists (
      select 1
        from public.daily_steps
       where user_id = v_user_id
         and steps >= 1000
    )
    into v_completed;
  end if;

  if not coalesce(v_completed, false) then
    return jsonb_build_object(
      'success', true,
      'qualified', false,
      'reason', 'first_1000_steps_not_completed',
      'referral_id', v_referral_id
    );
  end if;

  v_referrer_transaction_key := 'referral_referrer:' || v_referral_id::text;
  v_referred_transaction_key := 'referral_referred:' || v_referral_id::text;

  if v_referrer_id::text < v_user_id::text then
    select points into v_referrer_points
      from public.profiles where id = v_referrer_id for update;
    select points into v_referred_points
      from public.profiles where id = v_user_id for update;
  else
    select points into v_referred_points
      from public.profiles where id = v_user_id for update;
    select points into v_referrer_points
      from public.profiles where id = v_referrer_id for update;
  end if;

  v_referrer_points := coalesce(v_referrer_points, 0);
  v_referred_points := coalesce(v_referred_points, 0);

  select id into v_referrer_transaction_id
    from public.chalega_points_transactions
   where transaction_key = v_referrer_transaction_key;

  if v_referrer_transaction_id is null then
    v_referrer_balance := v_referrer_points + 25;

    update public.profiles
       set points = v_referrer_balance
     where id = v_referrer_id;

    insert into public.chalega_points_transactions (
      user_id, amount, balance_after, transaction_type,
      transaction_key, description
    )
    values (
      v_referrer_id, 25, v_referrer_balance, 'referral_reward',
      v_referrer_transaction_key,
      'Referral reward — friend completed first 1,000 steps'
    )
    returning id into v_referrer_transaction_id;
  else
    select points into v_referrer_balance
      from public.profiles where id = v_referrer_id;
  end if;

  select id into v_referred_transaction_id
    from public.chalega_points_transactions
   where transaction_key = v_referred_transaction_key;

  if v_referred_transaction_id is null then
    v_referred_balance := v_referred_points + 25;

    update public.profiles
       set points = v_referred_balance
     where id = v_user_id;

    insert into public.chalega_points_transactions (
      user_id, amount, balance_after, transaction_type,
      transaction_key, description
    )
    values (
      v_user_id, 25, v_referred_balance, 'referral_reward',
      v_referred_transaction_key,
      'Referral reward — completed first 1,000 steps'
    )
    returning id into v_referred_transaction_id;
  else
    select points into v_referred_balance
      from public.profiles where id = v_user_id;
  end if;

  update public.chalega_referrals
     set status = 'rewarded',
         qualified_at = coalesce(qualified_at, now()),
         rewarded_at = coalesce(rewarded_at, now())
   where id = v_referral_id;

  return jsonb_build_object(
    'success', true,
    'qualified', true,
    'already_rewarded', false,
    'referral_id', v_referral_id,
    'referrer_transaction_id', v_referrer_transaction_id,
    'referred_transaction_id', v_referred_transaction_id,
    'referrer_points_awarded', 25,
    'referred_points_awarded', 25
  );
end;
$function$;

revoke execute on function public.qualify_my_referral() from public, anon;
grant execute on function public.qualify_my_referral() to authenticated;
