-- Explicit deny policies document that these internal tables are not client APIs.
-- Existing grants are already revoked, so this does not add access.

DROP POLICY IF EXISTS "No direct client access" ON public.order_managers;
CREATE POLICY "No direct client access"
  ON public.order_managers
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "No direct client access" ON public.orders_backup_20260926;
CREATE POLICY "No direct client access"
  ON public.orders_backup_20260926
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);
