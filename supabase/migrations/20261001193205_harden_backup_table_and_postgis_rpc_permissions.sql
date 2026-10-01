-- Harden access to the dated orders backup table and PostGIS helper RPCs.
-- No application data is changed.

REVOKE ALL ON TABLE public.orders_backup_20260926 FROM anon, authenticated, PUBLIC;

REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.st_estimatedextent(text, text, text, boolean) FROM PUBLIC;
