CREATE OR REPLACE FUNCTION public.redeem_chalega_reward(p_reward_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_current_points integer;
  v_new_balance integer;
  v_transaction_key text;
  v_transaction_id uuid;
  v_reward_title text;
  v_cost integer;
  v_mode text;
  v_active boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_reward_id IS NULL OR length(trim(p_reward_id)) = 0 THEN
    RAISE EXCEPTION 'Reward ID is required.';
  END IF;

  SELECT title, cost, redemption_mode, active
    INTO v_reward_title, v_cost, v_mode, v_active
  FROM public.chalega_reward_catalog
  WHERE id = trim(p_reward_id);

  IF NOT FOUND OR v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Reward is not available.';
  END IF;

  IF v_mode = 'one_time' THEN
    v_transaction_key :=
      'reward_redemption:' || v_user_id::text || ':' || trim(p_reward_id);

    SELECT id INTO v_transaction_id
    FROM public.chalega_points_transactions
    WHERE transaction_key = v_transaction_key;

    IF FOUND THEN
      SELECT points INTO v_current_points FROM public.profiles WHERE id = v_user_id;
      RETURN jsonb_build_object(
        'success', true,
        'already_redeemed', true,
        'transaction_id', v_transaction_id,
        'transaction_key', v_transaction_key,
        'reward_id', trim(p_reward_id),
        'balance', coalesce(v_current_points, 0)
      );
    END IF;
  ELSE
    v_transaction_key :=
      'reward_redemption:' || v_user_id::text || ':' ||
      trim(p_reward_id) || ':' || extract(epoch from clock_timestamp())::bigint;
  END IF;

  SELECT points INTO v_current_points
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  v_current_points := coalesce(v_current_points, 0);

  IF v_current_points < v_cost THEN
    RAISE EXCEPTION 'Insufficient Chalega Coins.';
  END IF;

  v_new_balance := v_current_points - v_cost;

  UPDATE public.profiles
  SET points = v_new_balance,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.chalega_points_transactions
    (user_id, amount, balance_after, transaction_type, transaction_key, description)
  VALUES
    (v_user_id, -v_cost, v_new_balance, 'reward_redemption', v_transaction_key,
     'Reward redeemed: ' || v_reward_title)
  RETURNING id INTO v_transaction_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_redeemed', false,
    'transaction_id', v_transaction_id,
    'transaction_key', v_transaction_key,
    'reward_id', trim(p_reward_id),
    'balance', v_new_balance
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.redeem_chalega_reward(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_chalega_reward(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_chalega_reward(text) TO service_role;
