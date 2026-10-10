CREATE OR REPLACE FUNCTION public.set_admin_community_listing_status(
    p_listing_id uuid,
    p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_l public.chalega_grower_listings%ROWTYPE;
BEGIN
    IF NOT public.is_chalega_admin() THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    IF p_status NOT IN ('pending', 'approved', 'paused', 'rejected') THEN
        RAISE EXCEPTION 'Invalid listing status';
    END IF;

    SELECT l.*
    INTO v_l
    FROM public.chalega_grower_listings AS l
    WHERE l.id = p_listing_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Community listing not found';
    END IF;

    IF p_status = 'approved' AND v_l.quantity_available <= 0 THEN
        RAISE EXCEPTION 'Cannot approve a listing with no available stock';
    END IF;

    UPDATE public.chalega_grower_listings AS l
    SET status = p_status,
        updated_at = now()
    WHERE l.id = p_listing_id
    RETURNING l.* INTO v_l;

    RETURN jsonb_build_object(
        'listing_id', v_l.id,
        'status', v_l.status
    );
END;
$function$;