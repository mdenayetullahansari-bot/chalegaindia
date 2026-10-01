create or replace function public.get_my_points_transactions()
returns table (
  id uuid,
  amount integer,
  balance_after integer,
  transaction_type text,
  transaction_key text,
  description text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $function$
  select
    t.id,
    t.amount,
    t.balance_after,
    t.transaction_type,
    t.transaction_key,
    t.description,
    t.created_at
  from public.chalega_points_transactions t
  where t.user_id = auth.uid()
  order by t.created_at desc;
$function$;

revoke all on function public.get_my_points_transactions() from public, anon, authenticated;
grant execute on function public.get_my_points_transactions() to authenticated;
grant execute on function public.get_my_points_transactions() to service_role;