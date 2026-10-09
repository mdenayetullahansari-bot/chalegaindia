-- Safe customer cancellation for Community Market COD orders.
-- Cancellation is limited to orders not yet being prepared and delivery jobs
-- that have not been accepted. Stock restoration and related state changes
-- occur atomically in this SECURITY DEFINER RPC.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_valid;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_valid
  CHECK (status IN (
    'Order Received',
    'Preparing',
    'Out for Delivery',
    'Delivered',
    'Completed',
    'Cancelled'
  ));

CREATE OR REPLACE FUNCTION public.cancel_my_community_order(p_order_id text)
RETURNS TABLE(order_id text, status text, restored_quantity integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_listing_id uuid;
  v_quantity integer;
  v_job public.chalega_delivery_jobs%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF coalesce(btrim(p_order_id), '') = '' THEN
    RAISE EXCEPTION 'Order ID is required';
  END IF;

  SELECT o.* INTO v_order
  FROM public.orders o
  WHERE o.order_id = btrim(p_order_id)
    AND o.user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'Cancelled' THEN
    RAISE EXCEPTION 'This order has already been cancelled';
  END IF;

  IF v_order.status <> 'Order Received' THEN
    RAISE EXCEPTION 'Only orders that have not started preparation can be cancelled';
  END IF;

  IF v_order.payment_method <> 'COD' OR v_order.payment_status <> 'pending' THEN
    RAISE EXCEPTION 'Only unpaid cash-on-delivery orders can be cancelled here';
  END IF;

  IF jsonb_typeof(v_order.products) <> 'array'
     OR coalesce(v_order.products->0->>'community_listing_id', '') = '' THEN
    RAISE EXCEPTION 'This is not a Community Market order';
  END IF;

  BEGIN
    v_listing_id := (v_order.products->0->>'community_listing_id')::uuid;
    v_quantity := (v_order.products->0->>'quantity')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'Community order product details are invalid';
  END;

  IF v_quantity IS NULL OR v_quantity < 1 THEN
    RAISE EXCEPTION 'Community order quantity is invalid';
  END IF;

  SELECT j.* INTO v_job
  FROM public.chalega_delivery_jobs j
  WHERE j.order_id = v_order.order_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_job.order_source <> 'community' THEN
      RAISE EXCEPTION 'The associated delivery job is not a Community Market job';
    END IF;

    IF v_job.status NOT IN ('pending', 'offered') THEN
      RAISE EXCEPTION 'Delivery has already been accepted or started; contact support to cancel';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.chalega_delivery_payouts p
      WHERE p.job_id = v_job.id
        AND p.status IN ('pending', 'approved', 'paid', 'failed')
    ) THEN
      RAISE EXCEPTION 'A delivery payout record exists; contact support to cancel';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.chalega_delivery_assignments a
      WHERE a.job_id = v_job.id
        AND a.status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'A delivery partner has accepted this order; contact support to cancel';
    END IF;
  END IF;

  PERFORM 1
  FROM public.chalega_grower_listings l
  WHERE l.id = v_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'The original community listing no longer exists; contact support';
  END IF;

  -- Restore the reserved quantity once, in the same transaction as cancellation.
  -- Keep listing moderation status unchanged; the grower/admin can republish a sold-out listing.
  UPDATE public.chalega_grower_listings l
  SET quantity_available = l.quantity_available + v_quantity,
      updated_at = now()
  WHERE l.id = v_listing_id;

  UPDATE public.orders o
  SET status = 'Cancelled',
      updated_at = now()
  WHERE o.id = v_order.id;

  IF v_job.id IS NOT NULL THEN
    UPDATE public.chalega_delivery_assignments a
    SET status = 'cancelled'
    WHERE a.job_id = v_job.id
      AND a.status = 'offered';

    UPDATE public.chalega_delivery_jobs j
    SET status = 'cancelled',
        updated_at = now()
    WHERE j.id = v_job.id;
  END IF;

  RETURN QUERY SELECT v_order.order_id, 'Cancelled'::text, v_quantity;
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_my_community_order(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_my_community_order(text) TO authenticated;

COMMENT ON FUNCTION public.cancel_my_community_order(text) IS
'Atomically cancels the authenticated customer’s eligible Community Market COD order and restores its reserved listing stock.';
