-- Step 2H: reduce remaining Data API exposure.
--
-- PostGIS note:
-- public.spatial_ref_sys and PostGIS SECURITY DEFINER functions are owned by
-- Supabase's extension owner (supabase_admin), so application migrations cannot
-- revoke those extension-managed grants. Supabase documents this as an
-- extension-placement issue; moving PostGIS out of public is a separate,
-- higher-risk operation that should be handled with the documented migration
-- procedure or Supabase Support.
--
-- These statements are retained as harmless best-effort guards for environments
-- where the extension objects are owned by a role that permits the revoke.
revoke insert, update, delete on table public.spatial_ref_sys from anon, authenticated;
grant select on table public.spatial_ref_sys to anon, authenticated;

revoke execute on function public.st_estimatedextent(text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text) from public, anon, authenticated;
revoke execute on function public.st_estimatedextent(text, text, text, boolean) from public, anon, authenticated;

-- These calculation/search helpers are not called by the current client code
-- and do not need to be exposed to signed-in users.
revoke execute on function public.calculate_delivery_partner_earnings(numeric, numeric, numeric, numeric, numeric, numeric) from public, authenticated;
revoke execute on function public.calculate_chalega_settlement(numeric, numeric, numeric, numeric, numeric, boolean, boolean) from public, authenticated;
revoke execute on function public.simulate_delivery_unit_economics(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric) from public, authenticated;
revoke execute on function public.evaluate_delivery_pricing_scenario(text) from public, authenticated;
revoke execute on function public.find_compatible_delivery_jobs(uuid, integer, numeric) from public, authenticated;
revoke execute on function public.find_eligible_delivery_partners(uuid, integer) from public, authenticated;
revoke execute on function public.preview_delivery_batch(uuid[], integer) from public, authenticated;
