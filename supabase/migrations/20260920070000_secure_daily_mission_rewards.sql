create or replace function public.award_daily_mission_reward(
  p_mission_id bigint,
  p_mission_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_mission public.missions%rowtype;
  v_user_mission public.user_missions%rowtype;
  v_current_points integer;
  v_new_balance integer;
  v_transaction_key text;
  v_transaction_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select *
    into v_mission
    from public.missions
   where id = p_mission_id
     and active = true;

  if not found then
    raise exception 'Mission not found or inactive.';
  end if;

  if v_mission.reward_points <= 0 then
    raise exception 'Mission has no positive reward.';
  end if;

  select *
    into v_user_mission
    from public.user_missions
   where user_id = v_user_id
     and mission_id = p_mission_id
     and mission_date = p_mission_date
   for update;

  if not found then
    raise exception 'Mission completion record not found.';
  end if;

  if not v_user_mission.completed then
    raise exception 'Mission is not completed.';
  end if;

  v_transaction_key :=
    'daily_mission:' || v_user_id::text || ':' ||
    p_mission_id::text || ':' || p_mission_date::text;

  select id
    into v_transaction_id
    from public.chalega_points_transactions
   where transaction_key = v_transaction_key;

  if found then
    select points
      into v_current_points
      from public.profiles
     where id = v_user_id;

    return jsonb_build_object(
      'success', true,
      'already_awarded', true,
      'transaction_id', v_transaction_id,
      'transaction_key', v_transaction_key,
      'points_awarded', 0,
      'balance', coalesce(v_current_points, 0)
    );
  end if;

  select points
    into v_current_points
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found.';
  end if;

  v_new_balance :=
    coalesce(v_current_points, 0) + v_mission.reward_points;

  insert into public.chalega_points_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    transaction_key,
    description
  )
  values (
    v_user_id,
    v_mission.reward_points,
    v_new_balance,
    'daily_mission',
    v_transaction_key,
    'Daily mission reward — ' || v_mission.title
  )
  returning id into v_transaction_id;

  update public.profiles
     set points = v_new_balance
   where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'already_awarded', false,
    'transaction_id', v_transaction_id,
    'transaction_key', v_transaction_key,
    'points_awarded', v_mission.reward_points,
    'balance', v_new_balance
  );

exception
  when unique_violation then
    select points
      into v_current_points
      from public.profiles
     where id = v_user_id;

    select id
      into v_transaction_id
      from public.chalega_points_transactions
     where transaction_key = v_transaction_key;

    return jsonb_build_object(
      'success', true,
      'already_awarded', true,
      'transaction_id', v_transaction_id,
      'transaction_key', v_transaction_key,
      'points_awarded', 0,
      'balance', coalesce(v_current_points, 0)
    );
end;
$$;

revoke all on function public.award_daily_mission_reward(bigint, date) from public;

grant execute on function public.award_daily_mission_reward(bigint, date) to authenticated;
