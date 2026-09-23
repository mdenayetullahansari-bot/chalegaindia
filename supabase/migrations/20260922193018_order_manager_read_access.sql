-- Chalega India
-- Allow active order managers to read all customer orders.
-- Normal customers continue to see only their own orders.

create or replace function public.is_order_manager()
returns boolean
language sql
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.order_managers
    where user_id = auth.uid()
      and active = true
  );
$function$;

revoke all on function public.is_order_manager() from public, anon;
grant execute on function public.is_order_manager() to authenticated;
grant execute on function public.is_order_manager() to service_role;

create policy "Order managers can view all orders"
on public.orders
for select
to authenticated
using (public.is_order_manager());