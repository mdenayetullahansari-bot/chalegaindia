-- Admin customer management
-- Read-only customer overview restricted through is_chalega_admin().

create or replace function public.get_admin_customers()
returns table (
  id uuid,
  full_name text,
  username text,
  email text,
  phone text,
  area text,
  ward_id integer,
  points integer,
  created_at timestamptz,
  orders_count bigint,
  total_spend numeric,
  last_order_at timestamptz,
  last_order_status text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_chalega_admin() then
    raise exception 'Admin access required';
  end if;

  set local row_security = off;

  return query
  select
    p.id::uuid,
    coalesce(p.full_name, 'Customer')::text,
    coalesce(p.username, '')::text,
    coalesce(u.email, '')::text,
    coalesce((select o.customer_phone from public.orders o where o.user_id = p.id order by o.created_at desc limit 1), '')::text,
    p.area::text,
    p.ward_id::integer,
    coalesce(p.points, 0)::integer,
    p.created_at::timestamptz,
    (select count(*)::bigint from public.orders o where o.user_id = p.id),
    coalesce((select sum(o.total) from public.orders o where o.user_id = p.id), 0::numeric)::numeric,
    (select o.created_at from public.orders o where o.user_id = p.id order by o.created_at desc limit 1),
    (select o.status from public.orders o where o.user_id = p.id order by o.created_at desc limit 1)::text
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

revoke all on function public.get_admin_customers() from public, anon, authenticated;
grant execute on function public.get_admin_customers() to authenticated;
