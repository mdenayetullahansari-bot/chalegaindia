drop policy if exists "Users can create their own health checkins" on public.daily_health_checkins;
drop policy if exists "Users can update their own health checkins" on public.daily_health_checkins;

create policy "Users can create today health checkins"
on public.daily_health_checkins
for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and checkin_date = (now() at time zone 'Asia/Kolkata')::date
);

create policy "Users can update today health checkins"
on public.daily_health_checkins
for update to authenticated
using (
  (select auth.uid()) = user_id
  and checkin_date = (now() at time zone 'Asia/Kolkata')::date
)
with check (
  (select auth.uid()) = user_id
  and checkin_date = (now() at time zone 'Asia/Kolkata')::date
);

create or replace function public.award_health_checkin_reward(p_checkin_date date)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid;
  v_checkin public.daily_health_checkins%rowtype;
  v_current_points integer;
  v_new_balance integer;
  v_transaction_key text;
  v_transaction_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Authentication required'; end if;

  if p_checkin_date is null
     or p_checkin_date <> (now() at time zone 'Asia/Kolkata')::date then
    raise exception 'Health Check-in reward is available only for today.';
  end if;

  select * into v_checkin
  from public.daily_health_checkins
  where user_id = v_user_id and checkin_date = p_checkin_date
  for update;

  if not found then raise exception 'Health Check-in not found.'; end if;
  if v_checkin.completed_at is null then raise exception 'Health Check-in is not complete.'; end if;

  if v_checkin.water < 0 or v_checkin.water > 8
     or v_checkin.steps < 0 or v_checkin.steps > 200000
     or v_checkin.goal <= 0 or v_checkin.goal > 200000
     or v_checkin.streak < 0 or v_checkin.streak > 10000
     or (v_checkin.health_score is not null and (v_checkin.health_score < 0 or v_checkin.health_score > 100)) then
    raise exception 'Invalid Health Check-in values.';
  end if;

  v_transaction_key := 'health_checkin:' || v_user_id::text || ':' || p_checkin_date::text;

  select id into v_transaction_id
  from public.chalega_points_transactions
  where transaction_key = v_transaction_key;

  if found then
    select points into v_current_points from public.profiles where id = v_user_id;
    return jsonb_build_object('success',true,'already_awarded',true,'transaction_id',v_transaction_id,'transaction_key',v_transaction_key,'points_awarded',0,'balance',coalesce(v_current_points,0));
  end if;

  select points into v_current_points
  from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Profile not found.'; end if;

  v_current_points := coalesce(v_current_points,0);
  v_new_balance := v_current_points + 10;

  insert into public.chalega_points_transactions
    (user_id,amount,balance_after,transaction_type,transaction_key,description)
  values
    (v_user_id,10,v_new_balance,'health_checkin',v_transaction_key,'Daily Health Check-in reward')
  returning id into v_transaction_id;

  update public.profiles set points=v_new_balance, updated_at=now() where id=v_user_id;

  return jsonb_build_object('success',true,'already_awarded',false,'transaction_id',v_transaction_id,'transaction_key',v_transaction_key,'points_awarded',10,'balance',v_new_balance);
exception
  when unique_violation then
    select points into v_current_points from public.profiles where id=v_user_id;
    select id into v_transaction_id from public.chalega_points_transactions where transaction_key=v_transaction_key;
    return jsonb_build_object('success',true,'already_awarded',true,'transaction_id',v_transaction_id,'transaction_key',v_transaction_key,'points_awarded',0,'balance',coalesce(v_current_points,0));
end;
$function$;
