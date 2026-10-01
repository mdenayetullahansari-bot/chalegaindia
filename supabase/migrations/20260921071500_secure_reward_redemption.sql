create or replace function public.redeem_chalega_reward(p_reward_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid;
  v_current_points integer;
  v_new_balance integer;
  v_transaction_key text;
  v_transaction_id uuid;
  v_reward_title text;
  v_cost integer;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Authentication required.'; end if;
  if p_reward_id is null or length(trim(p_reward_id)) = 0 then raise exception 'Reward ID is required.'; end if;
  case trim(p_reward_id)
    when 'badge-500' then
      v_reward_title := 'First 500';
      v_cost := 500;
    when 'badge-1000' then
      v_reward_title := 'Healthy Walker';
      v_cost := 1000;
    when 'badge-2500' then
      v_reward_title := 'Chalega Champion';
      v_cost := 2500;
    when 'shop-50' then
      v_reward_title := '₹50 Health Reward';
      v_cost := 5000;
    else
      raise exception 'Invalid reward.';
  end case;
  v_transaction_key := 'reward_redemption:' || v_user_id::text || ':' || trim(p_reward_id);
  select id into v_transaction_id from public.chalega_points_transactions where transaction_key = v_transaction_key;
  if found then
    select points into v_current_points from public.profiles where id = v_user_id;
    return jsonb_build_object('success', true, 'already_redeemed', true, 'transaction_id', v_transaction_id, 'transaction_key', v_transaction_key, 'reward_id', trim(p_reward_id), 'balance', coalesce(v_current_points, 0));
  end if;
  select points into v_current_points from public.profiles where id = v_user_id for update;
  if not found then raise exception 'Profile not found.'; end if;
  v_current_points := coalesce(v_current_points, 0);
  if v_current_points < v_cost then raise exception 'Insufficient Chalega Points.'; end if;
  v_new_balance := v_current_points - v_cost;
  update public.profiles set points = v_new_balance where id = v_user_id;
  insert into public.chalega_points_transactions (user_id, amount, balance_after, transaction_type, transaction_key, description)
  values (v_user_id, -v_cost, v_new_balance, 'reward_redemption', v_transaction_key, 'Reward redeemed: ' || v_reward_title)
  returning id into v_transaction_id;
  return jsonb_build_object('success', true, 'already_redeemed', false, 'transaction_id', v_transaction_id, 'transaction_key', v_transaction_key, 'reward_id', trim(p_reward_id), 'balance', v_new_balance);
end;
$function$;

revoke all on function public.redeem_chalega_reward(text) from public, anon, authenticated;
grant execute on function public.redeem_chalega_reward(text) to authenticated;
grant execute on function public.redeem_chalega_reward(text) to service_role;
