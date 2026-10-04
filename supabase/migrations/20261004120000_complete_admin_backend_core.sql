-- Core admin backend: customers, orders, business overview and partner applications.
-- All RPCs require an active Chalega administrator.

create or replace function public.get_admin_customers()
returns table (id uuid, full_name text, username text, email text, phone text, area text, ward_id integer, points integer, created_at timestamptz, orders_count bigint, total_spend numeric, last_order_at timestamptz, last_order_status text)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
  set local row_security = off;
  return query
  select p.id, coalesce(p.full_name,'Customer'), coalesce(p.username,''), coalesce(u.email,''),
    coalesce((select o.customer_phone from public.orders o where o.user_id=p.id order by o.created_at desc limit 1),''),
    p.area, p.ward_id, coalesce(p.points,0), p.created_at,
    (select count(*) from public.orders o where o.user_id=p.id),
    coalesce((select sum(o.total) from public.orders o where o.user_id=p.id and o.payment_status='paid'),0),
    (select o.created_at from public.orders o where o.user_id=p.id order by o.created_at desc limit 1),
    (select o.status from public.orders o where o.user_id=p.id order by o.created_at desc limit 1)
  from public.profiles p left join auth.users u on u.id=p.id order by p.created_at desc;
end; $$;

create or replace function public.get_admin_orders()
returns table (id uuid, order_id text, user_id uuid, customer_name text, customer_phone text, area text, pin text, total numeric, delivery_fee numeric, payment_method text, payment_status text, order_status text, created_at timestamptz, updated_at timestamptz, delivery_job_id uuid, delivery_job_status text, partner_name text, partner_phone text, partner_vehicle text, partner_area text, partner_earnings numeric)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
  set local row_security = off;
  return query
  select o.id, o.order_id, o.user_id, o.customer_name, o.customer_phone, o.area, o.pin,
    o.total, o.delivery_fee, o.payment_method, o.payment_status, o.status, o.created_at, o.updated_at,
    j.id, j.status, coalesce(pr.full_name,''), coalesce(p.phone,''), coalesce(p.vehicle_number,''), coalesce(p.city_area,''), coalesce(j.partner_earnings,0)
  from public.orders o
  left join public.chalega_delivery_jobs j on j.order_id=o.order_id
  left join public.chalega_delivery_partners p on p.id = (select a.partner_id from public.chalega_delivery_assignments a where a.job_id=j.id and a.status='accepted' order by a.accepted_at desc limit 1)
  left join public.profiles pr on pr.id=p.user_id
  order by o.created_at desc;
end; $$;

create or replace function public.get_admin_business_overview()
returns table (customer_count bigint, order_count bigint, paid_order_count bigint, gross_order_value numeric, delivery_revenue numeric, delivered_order_count bigint, pending_payout_count bigint, pending_payout_amount numeric, paid_payout_amount numeric, approved_partner_count bigint, online_partner_count bigint, busy_partner_count bigint, active_delivery_job_count bigint, pending_partner_application_count bigint, orders_last_7_days bigint, revenue_last_7_days numeric)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
  set local row_security = off;
  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.orders),
    (select count(*) from public.orders where payment_status='paid'),
    coalesce((select sum(total) from public.orders where payment_status='paid'),0),
    coalesce((select sum(delivery_fee) from public.orders where payment_status='paid'),0),
    (select count(*) from public.orders where status in ('Delivered','Completed')),
    (select count(*) from public.chalega_delivery_payouts where status='pending'),
    coalesce((select sum(amount) from public.chalega_delivery_payouts where status='pending'),0),
    coalesce((select sum(amount) from public.chalega_delivery_payouts where status='paid'),0),
    (select count(*) from public.chalega_delivery_partners where status='approved'),
    (select count(*) from public.chalega_delivery_partners where status='approved' and availability='online'),
    (select count(*) from public.chalega_delivery_partners where status='approved' and availability='busy'),
    (select count(*) from public.chalega_delivery_jobs where status in ('pending','offered','accepted','picked_up','out_for_delivery')),
    (select count(*) from public.chalega_partner_applications where status='pending'),
    (select count(*) from public.orders where created_at >= now() - interval '7 days'),
    coalesce((select sum(total) from public.orders where payment_status='paid' and created_at >= now() - interval '7 days'),0);
end; $$;

create or replace function public.get_admin_partner_applications()
returns table (id uuid, user_id uuid, business_name text, contact_name text, phone text, email text, city_area text, partnership_type text, message text, status text, created_at timestamptz, updated_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
  set local row_security = off;
  return query select a.id,a.user_id,a.business_name,a.contact_name,a.phone,a.email,a.city_area,a.partnership_type,a.message,a.status,a.created_at,a.updated_at from public.chalega_partner_applications a order by a.created_at desc;
end; $$;

create or replace function public.set_admin_partner_application_status(p_application_id uuid,p_status text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','approved','rejected','contacted','closed') then raise exception 'Invalid application status'; end if;
  set local row_security = off;
  update public.chalega_partner_applications set status=p_status, updated_at=now() where id=p_application_id returning id into v_id;
  if v_id is null then raise exception 'Application not found'; end if;
  return jsonb_build_object('id',v_id,'status',p_status);
end; $$;

revoke all on function public.get_admin_customers() from public,anon,authenticated;
revoke all on function public.get_admin_orders() from public,anon,authenticated;
revoke all on function public.get_admin_business_overview() from public,anon,authenticated;
revoke all on function public.get_admin_partner_applications() from public,anon,authenticated;
revoke all on function public.set_admin_partner_application_status(uuid,text) from public,anon,authenticated;
grant execute on function public.get_admin_customers() to authenticated;
grant execute on function public.get_admin_orders() to authenticated;
grant execute on function public.get_admin_business_overview() to authenticated;
grant execute on function public.get_admin_partner_applications() to authenticated;
grant execute on function public.set_admin_partner_application_status(uuid,text) to authenticated;
