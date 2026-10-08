-- Allow the final Home Kitchen order lifecycle state.
alter table public.chalega_home_kitchen_orders drop constraint if exists chalega_home_kitchen_orders_status_check;
alter table public.chalega_home_kitchen_orders add constraint chalega_home_kitchen_orders_status_check
check (status = any (array['pending','accepted','preparing','ready','picked_up','out_for_delivery','delivered','completed','cancelled']));