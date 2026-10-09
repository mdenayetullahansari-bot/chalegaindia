-- Home Kitchen RPC execute permissions: no anonymous access.
revoke all on function public.set_admin_home_kitchen_status(uuid,text,text,text) from public;
revoke all on function public.get_admin_home_kitchen_items() from public;
revoke all on function public.set_admin_home_kitchen_item_status(uuid,text) from public;
revoke all on function public.update_my_home_kitchen_order_status(text,text) from public;
revoke all on function public.get_chalega_home_kitchen_pricing(uuid) from public;
revoke all on function public.get_admin_home_kitchen_orders() from public;
revoke all on function public.set_admin_home_kitchen_order_status(text,text) from public;
revoke all on function public.collect_home_kitchen_cod_payment(text) from public;
revoke all on function public.create_delivery_job_for_home_kitchen_order() from public;
revoke all on function public.create_chalega_home_kitchen_order(text,uuid,integer,text,text,text,text,text,double precision,double precision) from public;
revoke all on function public.submit_my_home_kitchen_compliance(text,text,date,text) from public;
revoke all on function public.set_my_home_kitchen_accepting_orders(boolean) from public;
revoke all on function public.set_my_home_kitchen_item_inventory(uuid,integer) from public;
revoke all on function public.get_my_home_kitchen_dashboard() from public;
revoke all on function public.review_home_kitchen_fssai(uuid,text,text) from public;
revoke all on function public.review_home_kitchen_hygiene(uuid,text,text) from public;
revoke all on function public.get_admin_home_kitchens() from public;

grant execute on function public.update_my_home_kitchen_order_status(text,text) to authenticated;
grant execute on function public.get_chalega_home_kitchen_pricing(uuid) to authenticated;
grant execute on function public.get_admin_home_kitchen_items() to authenticated;
grant execute on function public.set_admin_home_kitchen_item_status(uuid,text) to authenticated;
grant execute on function public.get_admin_home_kitchen_orders() to authenticated;
grant execute on function public.set_admin_home_kitchen_order_status(text,text) to authenticated;
grant execute on function public.collect_home_kitchen_cod_payment(text) to authenticated;
grant execute on function public.create_chalega_home_kitchen_order(text,uuid,integer,text,text,text,text,text,double precision,double precision) to authenticated;
grant execute on function public.get_admin_home_kitchens() to authenticated;
