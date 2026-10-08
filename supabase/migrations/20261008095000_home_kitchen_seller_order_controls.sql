-- Seller order workflow for Home Kitchens.
create or replace function public.update_my_home_kitchen_order_status(p_order_id text,p_status text)
returns public.chalega_home_kitchen_orders
language plpgsql security definer set search_path=public as $$
declare v public.chalega_home_kitchen_orders;
begin
 if p_status not in ('accepted','preparing','ready','cancelled') then raise exception 'Invalid kitchen order status'; end if;
 update public.chalega_home_kitchen_orders o
 set status=p_status,updated_at=now()
 where o.order_id=p_order_id
 and exists(select 1 from public.chalega_home_kitchens k where k.id=o.kitchen_id and k.user_id=auth.uid())
 and o.status in ('pending','accepted','preparing')
 returning o.* into v;
 if not found then raise exception 'Order not found or not available for this action'; end if;
 if p_status='cancelled' then
   update public.chalega_home_kitchen_items i
   set quantity_available=i.quantity_available+v.quantity,status=case when i.status='sold_out' then 'approved' else i.status end,updated_at=now()
   where i.id=v.item_id;
 end if;
 return v;
end $$;
revoke all on function public.update_my_home_kitchen_order_status(text,text) from public,anon;
grant execute on function public.update_my_home_kitchen_order_status(text,text) to authenticated;
