-- Admin delivery partner management
-- Read and status changes are restricted through is_chalega_admin().

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

  return query
  select
    p.id,
    p.user_id,
    coalesce(pr.full_name, 'Unnamed partner') as full_name,
    coalesce(u.email, '') as email,
    p.status,
    p.availability,
    p.vehicle_type,
    p.vehicle_number,
    p.phone,
    p.city_area,
    p.approved_at,
    p.created_at,
    p.location_updated_at,
    (select count(*) from public.chalega_delivery_assignments a
      where a.partner_id = p.id and a.status = 'accepted') as jobs_count,
    (select count(*) from public.chalega_delivery_assignments a
      join public.chalega_delivery_jobs j on j.id = a.job_id
      where a.partner_id = p.id and a.status = 'accepted' and j.status = 'delivered') as delivered_jobs_count,
    coalesce((select sum(x.amount) from public.chalega_delivery_payouts x
      where x.partner_id = p.id and x.status = 'pending'), 0) as pending_payout
  from public.chalega_delivery_partners p
  left join public.profiles pr on pr.id = p.user_id
  left join auth.users u on u.id = p.user_id
  order by case p.status when 'pending' then 0 when 'approved' then 1 when 'suspended' then 2 else 3 end, p.created_at desc;
end;
$$;

create or replace function public.set_admin_delivery_partner_status(
  p_partner_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_partner public.chalega_delivery_partners;
begin
  if not public.is_chalega_admin() then
    raise exception 'Admin access required';
  end if;

  if p_status not in ('pending', 'approved', 'suspended', 'rejected') then
    raise exception 'Invalid delivery partner status';
  end if;

  update public.chalega_delivery_partners
  set status = p_status,
      availability = 'offline',
      approved_at = case when p_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
      updated_at = now()
  where id = p_partner_id
  returning * into v_partner;

  if not found then
    raise exception 'Delivery partner not found';
  end if;

  return jsonb_build_object(
    'partner_id', v_partner.id,
    'status', v_partner.status,
    'availability', v_partner.availability,
    'approved_at', v_partner.approved_at
  );
end;
$$;

revoke all on function public.get_admin_delivery_partners() from public, anon, authenticated;
grant execute on function public.get_admin_delivery_partners() to authenticated;

revoke all on function public.set_admin_delivery_partner_status(uuid, text) from public, anon, authenticated;
grant execute on function public.set_admin_delivery_partner_status(uuid, text) to authenticated;
