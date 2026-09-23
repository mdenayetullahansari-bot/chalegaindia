create or replace function public.get_my_reward_redemptions()
returns table (
  reward_id text,
  transaction_id uuid,
  amount integer,
  balance_after integer,
  description text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $function$
  select
    split_part(t.transaction_key, ':' , 3) as reward_id,
    t.id as transaction_id,
    t.amount,
    t.balance_after,
    t.description,
    t.created_at
  from public.chalega_points_transactions t
  where t.user_id = auth.uid()
    and t.transaction_type = 'reward_redemption'
  order by t.created_at desc;
$function$;

revoke all on function public.get_my_reward_redemptions() from public, anon, authenticated;
grant execute on function public.get_my_reward_redemptions() to authenticated;
grant execute on function public.get_my_reward_redemptions() to service_role;
