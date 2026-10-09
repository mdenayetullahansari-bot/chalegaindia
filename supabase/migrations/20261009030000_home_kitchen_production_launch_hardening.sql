-- Home Kitchen production launch hardening.
-- Compliance metadata, seller controls, dashboard metrics, and corrected pricing tiers.

alter table public.chalega_home_kitchens
  add column if not exists fssai_document_ref text,
  add column if not exists fssai_valid_until date,
  add column if not exists fssai_rejection_reason text,
  add column if not exists fssai_verified_at timestamptz,
  add column if not exists hygiene_notes text,
  add column if not exists hygiene_verified_at timestamptz,
  add column if not exists hygiene_rejection_reason text;

create index if not exists chalega_home_kitchens_fssai_status_idx on public.chalega_home_kitchens(fssai_status);
create index if not exists chalega_home_kitchens_hygiene_status_idx on public.chalega_home_kitchens(hygiene_status);

create or replace function public.get_chalega_home_kitchen_pricing(p_kitchen_id uuid)
returns table(fee_rate numeric, completed_orders integer)
language sql security definer set search_path=public
as $function$
  select case when count(*) < 30 then 0::numeric when count(*) < 100 then 5::numeric else 8::numeric end,
         count(*)::integer
  from public.chalega_home_kitchen_orders
  where kitchen_id=p_kitchen_id and status='completed' and payment_status='collected';
$function$;

create or replace function public.submit_my_home_kitchen_compliance(
  p_fssai_number text,p_fssai_document_ref text default null,p_fssai_valid_until date default null,p_hygiene_notes text default null
)
returns public.chalega_home_kitchens
language plpgsql security definer set search_path=public
as $function$
declare v public.chalega_home_kitchens;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  update public.chalega_home_kitchens
  set fssai_number=nullif(trim(p_fssai_number),''),
      fssai_document_ref=nullif(trim(p_fssai_document_ref),''),
      fssai_valid_until=p_fssai_valid_until,
      fssai_status='pending',fssai_rejection_reason=null,fssai_verified_at=null,
      hygiene_notes=nullif(trim(p_hygiene_notes),''),
      hygiene_status=case when p_hygiene_notes is not null and trim(p_hygiene_notes)<>'' then 'pending' else hygiene_status end,
      hygiene_rejection_reason=null,hygiene_verified_at=null,
      status=case when status='approved' then 'paused' else status end,
      accepting_orders=false,updated_at=now()
  where user_id=auth.uid()
  returning * into v;
  if not found then raise exception 'Home Kitchen not found'; end if;
  return v;
end;$function$;

create or replace function public.set_my_home_kitchen_accepting_orders(p_enabled boolean)
returns public.chalega_home_kitchens
language plpgsql security definer set search_path=public
as $function$
declare v public.chalega_home_kitchens;
begin
  update public.chalega_home_kitchens k
  set accepting_orders=p_enabled,status=case when p_enabled then 'approved' else status end,updated_at=now()
  where k.user_id=auth.uid() and k.status in ('approved','paused')
    and (not p_enabled or (k.fssai_status='verified' and k.hygiene_status='verified' and exists(
      select 1 from public.chalega_home_kitchen_items i where i.kitchen_id=k.id and i.status='approved' and i.quantity_available>0
    )))
  returning k.* into v;
  if not found then
    if p_enabled then raise exception 'Kitchen must be approved, FSSAI verified, hygiene verified, and have an approved item in stock';
    else raise exception 'Home Kitchen not found'; end if;
  end if;
  return v;
end;$function$;

create or replace function public.set_my_home_kitchen_item_inventory(p_item_id uuid,p_quantity integer)
returns public.chalega_home_kitchen_items
language plpgsql security definer set search_path=public
as $function$
declare v public.chalega_home_kitchen_items;
begin
  if p_quantity<0 or p_quantity>10000 then raise exception 'Quantity must be between 0 and 10000'; end if;
  update public.chalega_home_kitchen_items i
  set quantity_available=p_quantity,
      status=case when p_quantity=0 and i.status='approved' then 'sold_out'
                  when p_quantity>0 and i.status='sold_out' then 'approved' else i.status end,
      updated_at=now()
  where i.id=p_item_id and i.user_id=auth.uid() and i.status in ('approved','sold_out','paused')
  returning i.* into v;
  if not found then raise exception 'Menu item not found or not editable'; end if;
  return v;
end;$function$;

create or replace function public.get_my_home_kitchen_dashboard()
returns table(kitchen_id uuid,kitchen_name text,status text,accepting_orders boolean,fssai_status text,hygiene_status text,total_orders bigint,pending_orders bigint,active_orders bigint,completed_orders bigint,food_revenue numeric,platform_fees numeric,kitchen_earnings numeric,delivery_fees numeric,estimated_completed_earnings numeric)
language sql security definer set search_path=public
as $function$
  select k.id,k.kitchen_name,k.status,k.accepting_orders,k.fssai_status,k.hygiene_status,
    count(o.order_id)::bigint,
    count(o.order_id) filter(where o.status='pending')::bigint,
    count(o.order_id) filter(where o.status in ('accepted','preparing','ready','picked_up','out_for_delivery'))::bigint,
    count(o.order_id) filter(where o.status='completed' and o.payment_status='collected')::bigint,
    coalesce(sum(o.food_total) filter(where o.status<>'cancelled'),0)::numeric,
    coalesce(sum(o.platform_fee) filter(where o.status<>'cancelled'),0)::numeric,
    coalesce(sum(o.kitchen_earnings) filter(where o.status<>'cancelled'),0)::numeric,
    coalesce(sum(o.delivery_fee) filter(where o.status<>'cancelled'),0)::numeric,
    coalesce(sum(o.kitchen_earnings) filter(where o.status='completed' and o.payment_status='collected'),0)::numeric
  from public.chalega_home_kitchens k
  left join public.chalega_home_kitchen_orders o on o.kitchen_id=k.id
  where k.user_id=auth.uid() group by k.id;
$function$;

create or replace function public.review_home_kitchen_fssai(p_kitchen_id uuid,p_status text,p_reason text default null)
returns public.chalega_home_kitchens
language plpgsql security definer set search_path=public
as $function$
declare v public.chalega_home_kitchens;
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('verified','rejected','pending','unverified') then raise exception 'Invalid FSSAI status'; end if;
  update public.chalega_home_kitchens
  set fssai_status=p_status,
      fssai_rejection_reason=case when p_status='rejected' then nullif(trim(p_reason),'') else null end,
      fssai_verified_at=case when p_status='verified' then now() else null end,
      accepting_orders=case when p_status='verified' and hygiene_status='verified' and status='approved' then accepting_orders else false end,
      updated_at=now()
  where id=p_kitchen_id returning * into v;
  if not found then raise exception 'Kitchen not found'; end if;
  return v;
end;$function$;

create or replace function public.review_home_kitchen_hygiene(p_kitchen_id uuid,p_status text,p_reason text default null)
returns public.chalega_home_kitchens
language plpgsql security definer set search_path=public
as $function$
declare v public.chalega_home_kitchens;
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('verified','rejected','pending') then raise exception 'Invalid hygiene status'; end if;
  update public.chalega_home_kitchens
  set hygiene_status=p_status,
      hygiene_rejection_reason=case when p_status='rejected' then nullif(trim(p_reason),'') else null end,
      hygiene_verified_at=case when p_status='verified' then now() else null end,
      accepting_orders=case when p_status='verified' and fssai_status='verified' and status='approved' then accepting_orders else false end,
      updated_at=now()
  where id=p_kitchen_id returning * into v;
  if not found then raise exception 'Kitchen not found'; end if;
  return v;
end;$function$;

create or replace function public.set_admin_home_kitchen_status(p_kitchen_id uuid,p_status text,p_fssai_status text default null,p_hygiene_status text default null)
returns public.chalega_home_kitchens
language plpgsql security definer set search_path=public
as $function$
declare v public.chalega_home_kitchens; v_fssai text; v_hygiene text;
begin
  if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
  if p_status not in ('pending','approved','paused','rejected') then raise exception 'Invalid kitchen status'; end if;
  select fssai_status,hygiene_status into v_fssai,v_hygiene from public.chalega_home_kitchens where id=p_kitchen_id;
  if not found then raise exception 'Kitchen not found'; end if;
  v_fssai:=coalesce(p_fssai_status,v_fssai); v_hygiene:=coalesce(p_hygiene_status,v_hygiene);
  if p_status='approved' and (v_fssai<>'verified' or v_hygiene<>'verified') then raise exception 'FSSAI and hygiene must both be verified before approval'; end if;
  update public.chalega_home_kitchens
  set status=p_status,fssai_status=v_fssai,hygiene_status=v_hygiene,
      accepting_orders=(p_status='approved' and v_fssai='verified' and v_hygiene='verified'),updated_at=now()
  where id=p_kitchen_id returning * into v;
  return v;
end;$function$;

grant execute on function public.submit_my_home_kitchen_compliance(text,text,date,text) to authenticated;
grant execute on function public.set_my_home_kitchen_accepting_orders(boolean) to authenticated;
grant execute on function public.set_my_home_kitchen_item_inventory(uuid,integer) to authenticated;
grant execute on function public.get_my_home_kitchen_dashboard() to authenticated;
grant execute on function public.review_home_kitchen_fssai(uuid,text,text) to authenticated;
grant execute on function public.review_home_kitchen_hygiene(uuid,text,text) to authenticated;
