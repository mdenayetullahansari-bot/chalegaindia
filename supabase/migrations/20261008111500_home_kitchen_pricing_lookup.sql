create or replace function public.get_chalega_home_kitchen_pricing(p_kitchen_id uuid)
returns table(fee_rate numeric, completed_orders integer)
language sql
security definer
set search_path=public
as $$
  select
    case
      when count(*) < 30 then 0::numeric
      when count(*) < 100 then 5::numeric
      else 8::numeric
    end as fee_rate,
    count(*)::integer as completed_orders
  from public.chalega_home_kitchen_orders
  where kitchen_id=p_kitchen_id and status='delivered';
$$;

revoke all on function public.get_chalega_home_kitchen_pricing(uuid) from public;
grant execute on function public.get_chalega_home_kitchen_pricing(uuid) to anon,authenticated;
