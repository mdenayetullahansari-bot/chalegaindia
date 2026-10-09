alter table public.chalega_community_growers
  add column if not exists pickup_address text,
  add column if not exists pickup_area text,
  add column if not exists pickup_pin text,
  add column if not exists pickup_latitude double precision,
  add column if not exists pickup_longitude double precision;

alter table public.chalega_delivery_jobs
  drop constraint if exists chalega_delivery_jobs_order_source_check,
  drop constraint if exists chalega_delivery_jobs_source_reference_check;

alter table public.chalega_delivery_jobs
  add constraint chalega_delivery_jobs_order_source_check
  check (order_source = any (array['standard'::text,'community'::text,'home_kitchen'::text]));

alter table public.chalega_delivery_jobs
  add constraint chalega_delivery_jobs_source_reference_check
  check (
    (order_source in ('standard','community') and order_id is not null and home_kitchen_order_id is null)
    or
    (order_source = 'home_kitchen' and home_kitchen_order_id is not null)
  );

alter table public.chalega_grower_earnings
  add column if not exists eligible_at timestamptz;

create index if not exists chalega_grower_earnings_status_idx
  on public.chalega_grower_earnings(status, created_at desc);

create or replace function public.create_delivery_job_for_paid_order()
returns trigger
language plpgsql
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_job_id uuid;
  v_breakdown jsonb;
  v_should_create boolean := false;
  v_listing public.chalega_grower_listings%rowtype;
  v_grower public.chalega_community_growers%rowtype;
  v_community_listing_id text;
begin
  if NEW.payment_status = 'paid'
     and (TG_OP = 'INSERT' or OLD.payment_status is distinct from 'paid') then
    v_should_create := true;
  end if;

  if NEW.payment_method = 'COD'
     and NEW.payment_status = 'pending' then
    v_should_create := true;
  end if;

  if v_should_create then
    v_breakdown := public.calculate_delivery_partner_earnings(0, 0, 0, 0, 0, 0);
    v_community_listing_id := nullif(NEW.products->0->>'community_listing_id','');

    if v_community_listing_id is not null then
      select gl.* into v_listing
      from public.chalega_grower_listings gl
      where gl.id::text = v_community_listing_id
      limit 1;

      if found then
        select cg.* into v_grower
        from public.chalega_community_growers cg
        where cg.id = v_listing.grower_id
        limit 1;
      end if;
    end if;

    if v_community_listing_id is not null and v_listing.id is not null and v_grower.id is not null then
      insert into public.chalega_delivery_jobs (
        order_id, order_source, status,
        pickup_address, pickup_area, pickup_pin,
        drop_address, drop_area, drop_pin,
        pickup_latitude, pickup_longitude,
        drop_latitude, drop_longitude,
        delivery_fee, partner_earnings,
        distance_km, waiting_minutes, demand_bonus, community_bonus, tip_amount,
        earnings_breakdown
      )
      values (
        NEW.order_id, 'community', 'pending',
        coalesce(
          nullif(btrim(v_grower.pickup_address),''),
          concat_ws(', ',
            'Community Grower - ' || v_grower.display_name,
            nullif(btrim(v_grower.locality),''),
            nullif(btrim(v_grower.city),'')
          )
        ),
        coalesce(nullif(btrim(v_grower.pickup_area),''), nullif(btrim(v_grower.locality),'')),
        nullif(btrim(v_grower.pickup_pin),''),
        NEW.address, NEW.area, NEW.pin,
        v_grower.pickup_latitude, v_grower.pickup_longitude,
        NEW.latitude, NEW.longitude,
        coalesce(NEW.delivery_fee,0),
        coalesce((v_breakdown->>'partner_earnings')::numeric,0),
        0,0,0,0,0,v_breakdown
      )
      on conflict (order_id) do nothing
      returning id into v_job_id;

      insert into public.chalega_delivery_events (job_id,event_type,metadata)
      select j.id,'job_created',
        jsonb_build_object(
          'order_id',NEW.order_id,
          'order_source','community',
          'community_listing_id',v_listing.id,
          'grower_id',v_grower.id,
          'grower_display_name',v_grower.display_name,
          'pickup_location_mode',
            case
              when v_grower.pickup_latitude is not null and v_grower.pickup_longitude is not null then 'grower_gps'
              when v_grower.pickup_area is not null or v_grower.pickup_pin is not null or v_grower.locality is not null then 'grower_area_or_pin'
              else 'grower_address_fallback'
            end,
          'drop_location_mode',
            case
              when NEW.latitude is not null and NEW.longitude is not null then 'customer_gps'
              when NEW.area is not null or NEW.pin is not null then 'customer_area_or_pin'
              else 'customer_address_only'
            end
        )
      from public.chalega_delivery_jobs j
      where j.order_id=NEW.order_id
        and not exists (
          select 1 from public.chalega_delivery_events e
          where e.job_id=j.id and e.event_type='job_created'
        );
    else
      insert into public.chalega_delivery_jobs (
        order_id,status,pickup_address,pickup_area,pickup_pin,
        drop_address,drop_area,drop_pin,pickup_latitude,pickup_longitude,
        drop_latitude,drop_longitude,delivery_fee,partner_earnings,
        distance_km,waiting_minutes,demand_bonus,community_bonus,tip_amount,earnings_breakdown
      )
      values (
        NEW.order_id,'pending','Chalega fulfilment',null,null,
        NEW.address,NEW.area,NEW.pin,null,null,NEW.latitude,NEW.longitude,
        coalesce(NEW.delivery_fee,0),coalesce((v_breakdown->>'partner_earnings')::numeric,0),
        0,0,0,0,0,v_breakdown
      )
      on conflict (order_id) do nothing
      returning public.chalega_delivery_jobs.id into v_job_id;

      insert into public.chalega_delivery_events (job_id,event_type,metadata)
      select j.id,'job_created',
        jsonb_build_object(
          'order_id',NEW.order_id,
          'order_source','standard',
          'earnings_breakdown',coalesce(j.earnings_breakdown,'{}'::jsonb),
          'location_mode',case
            when j.pickup_latitude is not null and j.drop_latitude is not null then 'pickup_and_drop_gps'
            when j.drop_latitude is not null then 'drop_gps_fallback'
            else 'area_fallback'
          end
        )
      from public.chalega_delivery_jobs j
      where j.order_id=NEW.order_id
        and not exists (
          select 1 from public.chalega_delivery_events e
          where e.job_id=j.id and e.event_type='job_created'
        );
    end if;
  end if;

  return NEW;
end;
$function$;

create or replace function public.sync_community_grower_earning_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if NEW.products->0->>'community_listing_id' is null then
    return NEW;
  end if;

  if NEW.status in ('Delivered','Completed')
     and NEW.payment_status in ('paid','collected') then
    update public.chalega_grower_earnings
    set status = case when status = 'paid' then status else 'eligible' end,
        eligible_at = coalesce(eligible_at, now())
    where order_id = NEW.order_id
      and status in ('pending','eligible');
  elsif NEW.status in ('Cancelled','cancelled') then
    update public.chalega_grower_earnings
    set status = 'cancelled'
    where order_id = NEW.order_id
      and status in ('pending','eligible');
  end if;

  return NEW;
end;
$function$;

drop trigger if exists trg_sync_community_grower_earning_eligibility on public.orders;

create trigger trg_sync_community_grower_earning_eligibility
after update of status, payment_status on public.orders
for each row
execute function public.sync_community_grower_earning_eligibility();

update public.chalega_grower_earnings ge
set status='eligible',
    eligible_at=coalesce(ge.eligible_at,o.updated_at,now())
from public.orders o
where o.order_id=ge.order_id
  and o.products->0->>'community_listing_id' is not null
  and o.status in ('Delivered','Completed')
  and o.payment_status in ('paid','collected')
  and ge.status='pending';

create or replace function public.set_admin_community_grower_earning_paid(p_earning_id uuid)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_order public.orders%rowtype;
begin
  if not public.is_chalega_admin() then
    raise exception 'Admin access required';
  end if;

  select o.*
  into v_order
  from public.chalega_grower_earnings ge
  join public.orders o on o.order_id=ge.order_id
  where ge.id=p_earning_id
  for update of o;

  if not found then
    raise exception 'Grower earning order not found';
  end if;

  if v_order.status not in ('Delivered','Completed') then
    raise exception 'Grower earning is not ready: customer order is not delivered';
  end if;

  if v_order.payment_status not in ('paid','collected') then
    raise exception 'Grower earning is not ready: customer payment is not collected';
  end if;

  update public.chalega_grower_earnings
  set status='paid',
      eligible_at=coalesce(eligible_at,now()),
      paid_at=coalesce(paid_at,now())
  where id=p_earning_id
    and status='eligible';

  if not found then
    raise exception 'Grower earning is not eligible for payout';
  end if;

  return true;
end;
$function$;

create or replace function public.get_admin_community_earnings()
returns table(
  id uuid, order_id text, grower_id uuid, listing_id uuid, quantity integer,
  gross_sale numeric, status text, paid_at timestamptz, created_at timestamptz,
  grower_display_name text, listing_title text
)
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if not public.is_chalega_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    ge.id, ge.order_id, ge.grower_id, ge.listing_id, ge.quantity,
    ge.gross_sale, ge.status, ge.paid_at,
    ge.created_at, cg.display_name, gl.title
  from public.chalega_grower_earnings ge
  left join public.chalega_community_growers cg on cg.id=ge.grower_id
  left join public.chalega_grower_listings gl on gl.id=ge.listing_id
  order by
    case ge.status
      when 'eligible' then 0
      when 'pending' then 1
      when 'cancelled' then 2
      else 3
    end,
    ge.created_at desc;
end;
$function$;

revoke execute on function public.sync_community_grower_earning_eligibility() from public, anon, authenticated;
