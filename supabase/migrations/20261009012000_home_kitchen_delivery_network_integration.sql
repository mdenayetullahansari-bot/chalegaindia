-- Home Kitchen orders use the shared Chalega delivery network.
-- Applied to production Supabase project duneqpybtgnzjjbgmbhm.

alter table public.chalega_delivery_jobs
  alter column order_id drop not null,
  add column if not exists order_source text not null default 'standard',
  add column if not exists home_kitchen_order_id text;

alter table public.chalega_delivery_jobs
  drop constraint if exists chalega_delivery_jobs_order_source_check;

alter table public.chalega_delivery_jobs
  add constraint chalega_delivery_jobs_order_source_check
  check (order_source in ('standard','home_kitchen'));

alter table public.chalega_delivery_jobs
  drop constraint if exists chalega_delivery_jobs_home_kitchen_order_id_fkey;

alter table public.chalega_delivery_jobs
  add constraint chalega_delivery_jobs_home_kitchen_order_id_fkey
  foreign key (home_kitchen_order_id)
  references public.chalega_home_kitchen_orders(order_id)
  on delete restrict;

create unique index if not exists chalega_delivery_jobs_home_kitchen_order_id_key
  on public.chalega_delivery_jobs(home_kitchen_order_id)
  where home_kitchen_order_id is not null;

alter table public.chalega_delivery_jobs
  drop constraint if exists chalega_delivery_jobs_source_reference_check;

alter table public.chalega_delivery_jobs
  add constraint chalega_delivery_jobs_source_reference_check
  check (
    (order_source = 'standard' and order_id is not null and home_kitchen_order_id is null)
    or
    (order_source = 'home_kitchen' and home_kitchen_order_id is not null)
  );

create or replace function public.create_delivery_job_for_home_kitchen_order()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_job_id uuid;
  v_breakdown jsonb;
  v_partner_earnings numeric;
  v_kitchen public.chalega_home_kitchens%rowtype;
begin
  if new.status = 'ready' and old.status is distinct from 'ready' then
    select * into v_kitchen
    from public.chalega_home_kitchens
    where id = new.kitchen_id;

    v_breakdown := public.calculate_delivery_partner_earnings(0, 0, 0, 0, 0, 0);
    v_partner_earnings := coalesce((v_breakdown->>'partner_earnings')::numeric, 0);

    insert into public.chalega_delivery_jobs (
      order_id, order_source, home_kitchen_order_id, status,
      pickup_address, pickup_area, pickup_pin,
      drop_address, drop_area, drop_pin,
      pickup_latitude, pickup_longitude, drop_latitude, drop_longitude,
      delivery_fee, partner_earnings, distance_km, waiting_minutes,
      demand_bonus, community_bonus, tip_amount, earnings_breakdown
    )
    values (
      null, 'home_kitchen', new.order_id, 'pending',
      coalesce(v_kitchen.display_name, v_kitchen.kitchen_name, 'Home Kitchen')
        || case when v_kitchen.locality is not null then ', ' || v_kitchen.locality else '' end
        || case when v_kitchen.city is not null then ', ' || v_kitchen.city else '' end,
      v_kitchen.locality, null,
      new.delivery_address, new.delivery_area, new.delivery_pin,
      null, null, new.delivery_latitude, new.delivery_longitude,
      coalesce(new.delivery_fee, 0), v_partner_earnings, 0, 0, 0, 0, 0, v_breakdown
    )
    on conflict (home_kitchen_order_id) where home_kitchen_order_id is not null do nothing
    returning id into v_job_id;

    if v_job_id is not null then
      insert into public.chalega_delivery_events (job_id, event_type, metadata)
      values (
        v_job_id,
        'job_created',
        jsonb_build_object(
          'order_id', new.order_id,
          'order_source', 'home_kitchen',
          'home_kitchen_order_id', new.order_id,
          'location_mode',
            case
              when new.delivery_latitude is not null and new.delivery_longitude is not null then 'drop_gps'
              when new.delivery_area is not null or new.delivery_pin is not null then 'area_or_pin'
              else 'address_only'
            end
        )
      );
    end if;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_create_delivery_job_for_home_kitchen_order
on public.chalega_home_kitchen_orders;

create trigger trg_create_delivery_job_for_home_kitchen_order
after update of status on public.chalega_home_kitchen_orders
for each row
when (new.status = 'ready' and old.status is distinct from 'ready')
execute function public.create_delivery_job_for_home_kitchen_order();

create or replace function public.update_my_delivery_job_status(p_job_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_job public.chalega_delivery_jobs%rowtype;
  v_partner public.chalega_delivery_partners%rowtype;
  v_assignment public.chalega_delivery_assignments%rowtype;
  v_order_status text;
  v_event_type text;
begin
  if p_status not in ('picked_up', 'out_for_delivery', 'delivered') then
    raise exception 'Invalid delivery status';
  end if;

  select a.* into v_assignment
  from public.chalega_delivery_assignments a
  join public.chalega_delivery_partners p on p.id = a.partner_id
  where a.job_id = p_job_id and a.status = 'accepted' and p.user_id = auth.uid()
  order by a.accepted_at desc nulls last
  limit 1 for update;

  if not found then raise exception 'Accepted delivery assignment not found'; end if;

  select * into v_partner from public.chalega_delivery_partners
  where id = v_assignment.partner_id for update;

  if v_partner.status <> 'approved' or v_partner.availability <> 'busy' then
    raise exception 'Delivery partner is not active on this job';
  end if;

  select * into v_job from public.chalega_delivery_jobs
  where id = p_job_id for update;

  if not found then raise exception 'Delivery job not found'; end if;

  if p_status = 'picked_up' and v_job.status <> 'accepted' then
    raise exception 'Job must be accepted before pickup';
  elsif p_status = 'out_for_delivery' and v_job.status <> 'picked_up' then
    raise exception 'Job must be picked up before going out for delivery';
  elsif p_status = 'delivered' and v_job.status <> 'out_for_delivery' then
    raise exception 'Job must be out for delivery before delivery';
  end if;

  if p_status = 'picked_up' then
    v_order_status := 'picked_up';
    v_event_type := 'picked_up';
    update public.chalega_delivery_jobs
    set status='picked_up', picked_up_at=now(), updated_at=now()
    where id=v_job.id;
  elsif p_status = 'out_for_delivery' then
    v_order_status := 'out_for_delivery';
    v_event_type := 'out_for_delivery';
    update public.chalega_delivery_jobs
    set status='out_for_delivery', updated_at=now()
    where id=v_job.id;
  else
    v_order_status := 'delivered';
    v_event_type := 'delivered';
    update public.chalega_delivery_jobs
    set status='delivered', delivered_at=now(), updated_at=now()
    where id=v_job.id;

    update public.chalega_delivery_partners
    set availability='offline', updated_at=now()
    where id=v_partner.id;
  end if;

  if v_job.order_source = 'home_kitchen' then
    update public.chalega_home_kitchen_orders
    set status=v_order_status, updated_at=now()
    where order_id=v_job.home_kitchen_order_id;
  else
    if v_order_status = 'picked_up' then v_order_status := 'Preparing';
    elsif v_order_status = 'out_for_delivery' then v_order_status := 'Out for Delivery';
    elsif v_order_status = 'delivered' then v_order_status := 'Delivered';
    end if;

    update public.orders
    set status=v_order_status, updated_at=now()
    where order_id=v_job.order_id;
  end if;

  insert into public.chalega_delivery_events(job_id,partner_id,event_type,metadata)
  values (
    v_job.id,v_partner.id,v_event_type,
    jsonb_build_object(
      'order_id',coalesce(v_job.order_id,v_job.home_kitchen_order_id),
      'order_source',v_job.order_source,
      'status',p_status
    )
  );

  return jsonb_build_object(
    'job_id',v_job.id,
    'order_id',coalesce(v_job.order_id,v_job.home_kitchen_order_id),
    'order_source',v_job.order_source,
    'status',p_status,
    'order_status',v_order_status
  );
end;
$function$;

create or replace function public.get_my_delivery_assignments()
returns setof jsonb
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query
  select jsonb_build_object(
    'id', a.id,
    'job_id', a.job_id,
    'partner_id', a.partner_id,
    'status', a.status,
    'offered_at', a.offered_at,
    'accepted_at', a.accepted_at,
    'rejected_at', a.rejected_at,
    'job', jsonb_build_object(
      'id', j.id,
      'order_id', coalesce(j.order_id,j.home_kitchen_order_id),
      'order_source', j.order_source,
      'drop_address', j.drop_address,
      'drop_area', j.drop_area,
      'drop_pin', j.drop_pin,
      'pickup_address', j.pickup_address,
      'pickup_area', j.pickup_area,
      'pickup_pin', j.pickup_pin,
      'delivery_fee', j.delivery_fee,
      'partner_earnings', j.partner_earnings,
      'distance_km', j.distance_km,
      'waiting_minutes', j.waiting_minutes,
      'demand_bonus', j.demand_bonus,
      'community_bonus', j.community_bonus,
      'tip_amount', j.tip_amount,
      'earnings_breakdown', j.earnings_breakdown
    )
  )
  from public.chalega_delivery_assignments a
  join public.chalega_delivery_jobs j on j.id=a.job_id
  join public.chalega_delivery_partners p on p.id=a.partner_id
  where p.user_id=auth.uid()
  order by a.offered_at desc;
end;
$function$;

create or replace function public.set_admin_home_kitchen_order_status(p_order_id text, p_status text)
returns public.chalega_home_kitchen_orders
language plpgsql
security definer
set search_path = public
as $function$
declare
  v public.chalega_home_kitchen_orders;
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;

  if p_status not in ('accepted','preparing','ready','delivered','completed','cancelled') then
    raise exception 'Invalid Home Kitchen order status';
  end if;

  select * into v from public.chalega_home_kitchen_orders
  where order_id=p_order_id for update;

  if not found then raise exception 'Home Kitchen order not found'; end if;

  if v.status='pending' and p_status not in ('accepted','cancelled') then
    raise exception 'Invalid order transition: pending -> %',p_status;
  elsif v.status='accepted' and p_status not in ('preparing','cancelled') then
    raise exception 'Invalid order transition: accepted -> %',p_status;
  elsif v.status='preparing' and p_status not in ('ready','cancelled') then
    raise exception 'Invalid order transition: preparing -> %',p_status;
  elsif v.status='ready' and p_status not in ('cancelled') then
    raise exception 'Delivery network controls the order after READY';
  elsif v.status in ('picked_up','out_for_delivery') then
    raise exception 'Delivery-network status must be advanced by the delivery workflow';
  elsif v.status='delivered' and p_status<>'completed' then
    raise exception 'Invalid order transition: delivered -> %',p_status;
  elsif v.status in ('completed','cancelled') then
    raise exception 'Order is already terminal: %',v.status;
  end if;

  if p_status='completed' and v.payment_status<>'collected' then
    raise exception 'COD payment must be collected before completing the order';
  end if;

  update public.chalega_home_kitchen_orders
  set status=p_status,updated_at=now()
  where order_id=p_order_id
  returning * into v;

  if p_status='cancelled' then
    update public.chalega_home_kitchen_items i
    set quantity_available=i.quantity_available+v.quantity,
        status=case when i.status='sold_out' then 'approved' else i.status end,
        updated_at=now()
    where i.id=v.item_id;
  end if;

  return v;
end;
$function$;
