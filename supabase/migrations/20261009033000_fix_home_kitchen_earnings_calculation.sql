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
returns table(order_id text, total numeric, delivery_fee numeric, status text)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_item public.chalega_home_kitchen_items%rowtype;
  v_food numeric;
  v_fee numeric;
  v_platform_fee numeric;
  v_kitchen_earnings numeric;
  v_fee_rate numeric;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if p_quantity < 1 or p_quantity > 50 then
    raise exception 'Quantity must be between 1 and 50';
  end if;

  if nullif(trim(p_customer_name),'') is null
     or nullif(trim(p_customer_phone),'') is null
     or nullif(trim(p_delivery_address),'') is null then
    raise exception 'Name, phone and address are required';
  end if;

  select i.*
    into v_item
  from public.chalega_home_kitchen_items i
  where i.id = p_item_id
    and i.status = 'approved'
  for update;

  if not found then
    raise exception 'This menu item is unavailable';
  end if;

  if not exists (
    select 1
    from public.chalega_home_kitchens k
    where k.id = v_item.kitchen_id
      and k.status = 'approved'
      and k.accepting_orders = true
  ) then
    raise exception 'This kitchen is not accepting orders';
  end if;

  if v_item.quantity_available < p_quantity then
    raise exception 'Not enough portions available';
  end if;

  v_food := v_item.price * p_quantity;

  v_fee := case
    when v_food >= 499 then 0
    when v_food >= 299 then 29
    else 49
  end;

  select fee_rate
    into v_fee_rate
  from public.get_chalega_home_kitchen_pricing(v_item.kitchen_id);

  v_platform_fee := round(v_food * coalesce(v_fee_rate, 0) / 100, 2);
  v_kitchen_earnings := v_food - v_platform_fee;

  insert into public.chalega_home_kitchen_orders(
    order_id,
    kitchen_id,
    item_id,
    customer_id,
    quantity,
    unit_price,
    food_total,
    delivery_fee,
    total,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_area,
    delivery_pin,
    delivery_latitude,
    delivery_longitude,
    platform_fee,
    kitchen_earnings
  )
  values(
    p_order_id,
    v_item.kitchen_id,
    v_item.id,
    auth.uid(),
    p_quantity,
    v_item.price,
    v_food,
    v_fee,
    v_food + v_fee,
    trim(p_customer_name),
    trim(p_customer_phone),
    trim(p_delivery_address),
    nullif(trim(p_delivery_area),''),
    nullif(trim(p_delivery_pin),''),
    p_delivery_latitude,
    p_delivery_longitude,
    v_platform_fee,
    v_kitchen_earnings
  );

  update public.chalega_home_kitchen_items i
  set
    quantity_available = i.quantity_available - p_quantity,
    status = case
      when i.quantity_available - p_quantity = 0 then 'sold_out'
      else i.status
    end,
    updated_at = now()
  where i.id = v_item.id;

  return query
  select
    p_order_id,
    v_food + v_fee,
    v_fee,
    'pending'::text;
end
$function$;

revoke all on function public.create_chalega_home_kitchen_order(
  text, uuid, integer, text, text, text, text, text, double precision, double precision
) from public, anon;

grant execute on function public.create_chalega_home_kitchen_order(
  text, uuid, integer, text, text, text, text, text, double precision, double precision
) to authenticated;
