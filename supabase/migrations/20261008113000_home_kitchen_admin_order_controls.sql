-- Admin controls for Home Kitchen delivery lifecycle.
create or replace function public.get_admin_home_kitchen_orders()
returns table(order_id text,kitchen_id uuid,kitchen_name text,item_id uuid,item_title text,quantity integer,customer_name text,customer_phone text,delivery_address text,delivery_area text,delivery_pin text,food_total numeric,platform_fee numeric,delivery_fee numeric,total numeric,kitchen_earnings numeric,status text,payment_method text,payment_status text,created_at timestamptz)
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
 return query select o.order_id,o.kitchen_id,k.kitchen_name,o.item_id,i.title,o.quantity,o.customer_name,o.customer_phone,o.delivery_address,o.delivery_area,o.delivery_pin,o.food_total,o.platform_fee,o.delivery_fee,o.total,o.kitchen_earnings,o.status,o.payment_method,o.payment_status,o.created_at
 from public.chalega_home_kitchen_orders o join public.chalega_home_kitchens k on k.id=o.kitchen_id join public.chalega_home_kitchen_items i on i.id=o.item_id order by o.created_at desc;
end $$;
create or replace function public.set_admin_home_kitchen_order_status(p_order_id text,p_status text)
returns public.chalega_home_kitchen_orders
language plpgsql security definer set search_path=public as $$
declare v public.chalega_home_kitchen_orders;
begin
 if not public.is_chalega_admin() then raise exception 'Admin access required'; end if;
 if p_status not in ('accepted','preparing','ready','delivered','completed','cancelled') then raise exception 'Invalid Home Kitchen order status'; end if;
 update public.chalega_home_kitchen_orders o set status=p_status,updated_at=now() where o.order_id=p_order_id returning o.* into v;
 if not found then raise exception 'Home Kitchen order not found'; end if;
 if p_status='cancelled' then update public.chalega_home_kitchen_items i set quantity_available=i.quantity_available+v.quantity,status=case when i.status='sold_out' then 'approved' else i.status end,updated_at=now() where i.id=v.item_id; end if;
 return v;
end $$;
revoke all on function public.get_admin_home_kitchen_orders() from public,anon;
grant execute on function public.get_admin_home_kitchen_orders() to authenticated;
revoke all on function public.set_admin_home_kitchen_order_status(text,text) from public,anon;
grant execute on function public.set_admin_home_kitchen_order_status(text,text) to authenticated;