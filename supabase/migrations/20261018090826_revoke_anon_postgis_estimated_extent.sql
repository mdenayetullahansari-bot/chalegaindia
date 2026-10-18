-- Keep PostGIS extent helpers unavailable through the public Data API.
-- These helpers are not called by the application and can expose estimated table bounds.
revoke all on function public.st_estimatedextent(text, text) from public, anon, authenticated;
revoke all on function public.st_estimatedextent(text, text, text) from public, anon, authenticated;
revoke all on function public.st_estimatedextent(text, text, text, boolean) from public, anon, authenticated;

grant execute on function public.st_estimatedextent(text, text) to service_role;
grant execute on function public.st_estimatedextent(text, text, text) to service_role;
grant execute on function public.st_estimatedextent(text, text, text, boolean) to service_role;