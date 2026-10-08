-- Chalega Home Kitchens pricing model
-- 0% for first 30 completed orders, 5% for orders 31-100, 8% thereafter.
-- The marketplace fee is added transparently to the customer total; kitchen price remains the kitchen's earnings.

alter table public.chalega_home_kitchen_orders
  add column if not exists platform_fee numeric(10,2) not null default 0,
  add column if not exists kitchen_earnings numeric(10,2) not null default 0;

drop function if exists public.create_chalega_home_kitchen_order(text,uuid,integer,text,text,text,text,text,double precision,double precision);

create or replace function public.create_chalega_home_kitchen_order(
  p_order_id text,
  p_item_id uuid,
  p_quantity integer,
  p_customer_name text,
  p_customer_phone text,
  p_delivery_address text,
  p_delivery_area text default null,
  p_delivery_pin text default null,
  p_delivery_latitude double precision default null,
  p_delivery_longitude double precision default null
)
returns table(
  order_id text,
  food_total numeric,
  platform_fee numeric,
  delivery_fee numeric,
  total numeric,
  kitchen_earnings numeric,
  fee_rate numeric,
  completed_orders integer,
  status text
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_item public.chalega_home_kitchen_items%rowtype;
  v_food numeric;
  v_platform_fee numeric;
  v_delivery_fee numeric;
  v_total numeric;
  v_completed_orders integer;
  v_fee_rate numeric;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_quantity < 1 or p_quantity > 50 then raise exception 'Quantity must be between 1 and 50'; end if;
  if nullif(trim(p_customer_name),'') is null
     or nullif(trim(p_customer_phone),'') is null
     or nullif(trim(p_delivery_address),'') is null then
    raise exception 'Name, phone and address are required';
  end if;

  select * into v_item
  from public.chalega_home_kitchen_items
  where id=p_item_id and status='approved'
  for update;

  if not found then raise exception 'This menu item is unavailable'; end if;

  if not exists(
    select 1 from public.chalega_home_kitchens
    where id=v_item.kitchen_id and status='approved' and accepting_orders=true
  ) then
    raise exception 'This kitchen is not accepting orders';
  end if;

  if v_item.quantity_available < p_quantity then
    raise exception 'Not enough portions available';
  end if;

  select count(*)::integer into v_completed_orders
  from public.chalega_home_kitchen_orders
  where kitchen_id=v_item.kitchen_id and status='delivered';

  v_fee_rate := case
    when v_completed_orders < 30 then 0
    when v_completed_orders < 100 then 5
    else 8
  end;

  v_food := round(v_item.price * p_quantity, 2);
  v_platform_fee := round(v_food * v_fee_rate / 100, 2);
  v_delivery_fee := case
    when v_food >= 499 then 0
    when v_food >= 299 then 29
    else 49
  end;
  v_total := v_food + v_platform_fee + v_delivery_fee;

  insert into public.chalega_home_kitchen_orders(
    order_id,kitchen_id,item_id,customer_id,quantity,unit_price,food_total,
    platform_fee,kitchen_earnings,delivery_fee,total,customer_name,customer_phone,
    delivery_address,delivery_area,delivery_pin,delivery_latitude,delivery_longitude
  )
  values(
    p_order_id,v_item.kitchen_id,v_item.id,auth.uid(),p_quantity,v_item.price,v_food,
    v_platform_fee,v_food,v_delivery_fee,v_total,trim(p_customer_name),trim(p_customer_phone),
    trim(p_delivery_address),nullif(trim(p_delivery_area),''),nullif(trim(p_delivery_pin),''),
    p_delivery_latitude,p_delivery_longitude
  );

  update public.chalega_home_kitchen_items
  set quantity_available=quantity_available-p_quantity,
      status=case when quantity_available-p_quantity=0 then 'sold_out' else status end,
      updated_at=now()
  where id=v_item.id;

  return query select
    p_order_id,v_food,v_platform_fee,v_delivery_fee,v_total,v_food,v_fee_rate,v_completed_orders,'pending'::text;
end
$$;

revoke all on function public.create_chalega_home_kitchen_order(text,uuid,integer,text,text,text,text,text,double precision,double precision) from public,anon;
grant execute on function public.create_chalega_home_kitchen_order(text,uuid,integer,text,text,text,text,text,double precision,double precision) to authenticated;
