-- Lock down Home Kitchen SECURITY DEFINER admin RPCs.
revoke all on function public.is_chalega_admin() from public, anon;
grant execute on function public.is_chalega_admin() to authenticated;
revoke all on function public.get_admin_home_kitchens() from public, anon;
grant execute on function public.get_admin_home_kitchens() to authenticated;
revoke all on function public.set_admin_home_kitchen_status(uuid,text,text,text) from public, anon;
grant execute on function public.set_admin_home_kitchen_status(uuid,text,text,text) to authenticated;
revoke all on function public.get_admin_home_kitchen_items() from public, anon;
grant execute on function public.get_admin_home_kitchen_items() to authenticated;
revoke all on function public.set_admin_home_kitchen_item_status(uuid,text) from public, anon;
grant execute on function public.set_admin_home_kitchen_item_status(uuid,text) to authenticated;
