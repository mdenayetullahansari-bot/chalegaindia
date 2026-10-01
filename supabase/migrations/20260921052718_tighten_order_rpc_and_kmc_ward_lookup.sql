-- Tighten order status RPC permissions and KMC ward lookup search path.

revoke all on function public.update_order_status(text, text) from public, anon;
grant execute on function public.update_order_status(text, text) to authenticated, service_role;

alter function public.find_kmc_ward_by_point(double precision, double precision)
  set search_path = public;
