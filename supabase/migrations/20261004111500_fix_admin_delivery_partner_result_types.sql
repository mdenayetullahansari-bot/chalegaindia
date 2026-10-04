-- Fix explicit return-type casts for the admin delivery partner RPC.

create or replace function public.get_admin_delivery_partners()
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  status text,
  availability text,
  vehicle_type text,
  vehicle_number text,
  phone text,
  city_area text,
  approved_at timestamptz,
  created_at timestamptz,
  location_updated_at timestamptz,
  jobs_count bigint,
  delivered_jobs_count bigint,
  pending_payout numeric
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
    p.user_id::uuid,
    coalesce(pr.full_name, 'Delivery Partner')::text,
    coalesce(u.email, '')::text,
    p.status::text,
    p.availability::text,
    p.vehicle_type::text,
    p.vehicle_number::text,
    p.phone::text,
    p.city_area::text,
    p.approved_at::timestamptz,
    p.created_at::timestamptz,
    p.location_updated_at::timestamptz,
    (select count(*)::bigint
     from public.chalega_delivery_assignments a
     where a.partner_id = p.id and a.status = 'accepted'),
    (select count(*)::bigint
     from public.chalega_delivery_assignments a
     join public.chalega_delivery_jobs j on j.id = a.job_id
     where a.partner_id = p.id and a.status = 'accepted' and j.status = 'delivered'),
    coalesce((select sum(x.amount)
              from public.chalega_delivery_payouts x
              where x.partner_id = p.id and x.status = 'pending'), 0::numeric)::numeric
  from public.chalega_delivery_partners p
  left join public.profiles pr on pr.id = p.user_id
  left join auth.users u on u.id = p.user_id
  order by p.created_at desc;
end;
$$;
