/*
 * Reward integrity hardening:
 * - validate step missions against server-side daily_steps
 * - validate health mission against server-side health check-in
 * - prevent client writes to the canonical profile points column
 * - prevent direct client mutation of daily_steps; use sync_my_daily_steps()
 */

CREATE OR REPLACE FUNCTION public.award_daily_mission_reward(
  p_mission_id bigint,
  p_mission_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_mission public.missions%rowtype;
  v_user_mission public.user_missions%rowtype;
  v_current_points integer;
  v_new_balance integer;
  v_transaction_key text;
  v_transaction_id uuid;
  v_steps integer;
  v_water integer;
  v_checkin_completed_at timestamptz;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF p_mission_date < current_date - 1
     OR p_mission_date > current_date THEN
    RAISE EXCEPTION 'Mission date is outside the allowed window.';
  END IF;

  SELECT *
    INTO v_mission
    FROM public.missions
   WHERE id = p_mission_id
     AND active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission not found or inactive.';
  END IF;

  IF v_mission.reward_points <= 0 THEN
    RAISE EXCEPTION 'Mission has no positive reward.';
  END IF;

  SELECT *
    INTO v_user_mission
    FROM public.user_missions
   WHERE user_id = v_user_id
     AND mission_id = p_mission_id
     AND mission_date = p_mission_date
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mission completion record not found.';
  END IF;

  IF NOT v_user_mission.completed THEN
    RAISE EXCEPTION 'Mission is not completed.';
  END IF;

  v_transaction_key :=
    'daily_mission:' || v_user_id::text || ':' ||
    p_mission_id::text || ':' || p_mission_date::text;

  SELECT id
    INTO v_transaction_id
    FROM public.chalega_points_transactions
   WHERE transaction_key = v_transaction_key;

  IF FOUND THEN
    SELECT points
      INTO v_current_points
      FROM public.profiles
     WHERE id = v_user_id;

    RETURN jsonb_build_object(
      'success', true,
      'already_awarded', true,
      'transaction_id', v_transaction_id,
      'transaction_key', v_transaction_key,
      'points_awarded', 0,
      'balance', coalesce(v_current_points, 0)
    );
  END IF;

  IF p_mission_id IN (1, 2, 3, 4) THEN
    SELECT steps
      INTO v_steps
      FROM public.daily_steps
     WHERE user_id = v_user_id
       AND step_date = p_mission_date;

    IF coalesce(v_steps, 0) < coalesce(v_mission.target_steps, 0) THEN
      RAISE EXCEPTION
        'Step target has not been reached on the server.';
    END IF;
  END IF;

  IF p_mission_id = 5 THEN
    SELECT water, completed_at
      INTO v_water, v_checkin_completed_at
      FROM public.daily_health_checkins
     WHERE user_id = v_user_id
       AND checkin_date = p_mission_date;

    IF NOT FOUND
       OR coalesce(v_water, 0) < 6
       OR v_checkin_completed_at IS NULL THEN
      RAISE EXCEPTION
        'Water reward requires at least 6 glasses in today''s completed Health Check-in.';
    END IF;
  END IF;

  IF p_mission_id = 6 THEN
    SELECT completed_at
      INTO v_checkin_completed_at
      FROM public.daily_health_checkins
     WHERE user_id = v_user_id
       AND checkin_date = p_mission_date;

    IF NOT FOUND OR v_checkin_completed_at IS NULL THEN
      RAISE EXCEPTION
        'Health reward requires a completed Health Check-in.';
    END IF;
  END IF;

  IF p_mission_id = 7 THEN
    IF NOT EXISTS (
      SELECT 1
        FROM public.chalega_points_transactions
       WHERE user_id = v_user_id
         AND transaction_type = 'daily_mission'
         AND transaction_key =
               'daily_mission:' ||
               v_user_id::text ||
               ':4:' ||
               p_mission_date::text
    ) THEN
      RAISE EXCEPTION
        'Streak reward is available only after today''s Walk 4,000 Steps mission has been rewarded.';
    END IF;
  END IF;

  SELECT points
    INTO v_current_points
    FROM public.profiles
   WHERE id = v_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.';
  END IF;

  v_new_balance :=
    coalesce(v_current_points, 0) + v_mission.reward_points;

  INSERT INTO public.chalega_points_transactions (
    user_id,
    amount,
    balance_after,
    transaction_type,
    transaction_key,
    description
  )
  VALUES (
    v_user_id,
    v_mission.reward_points,
    v_new_balance,
    'daily_mission',
    v_transaction_key,
    'Daily mission reward — ' || v_mission.title
  )
  RETURNING id INTO v_transaction_id;

  UPDATE public.profiles
     SET points = v_new_balance,
         updated_at = now()
   WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_awarded', false,
    'transaction_id', v_transaction_id,
    'transaction_key', v_transaction_key,
    'points_awarded', v_mission.reward_points,
    'balance', v_new_balance
  );
EXCEPTION
  WHEN unique_violation THEN
    SELECT points INTO v_current_points FROM public.profiles WHERE id = v_user_id;
    SELECT id INTO v_transaction_id
      FROM public.chalega_points_transactions
     WHERE transaction_key = v_transaction_key;

    RETURN jsonb_build_object(
      'success', true,
      'already_awarded', true,
      'transaction_id', v_transaction_id,
      'transaction_key', v_transaction_key,
      'points_awarded', 0,
      'balance', coalesce(v_current_points, 0)
    );
END;
$function$;

REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (
  full_name,
  username,
  avatar_url,
  age,
  gender,
  area,
  daily_step_goal,
  ward_id,
  ward_assignment_method,
  ward_assigned_at,
  assembly_id,
  updated_at
) ON TABLE public.profiles TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.daily_steps FROM authenticated;
REVOKE ALL ON TABLE public.daily_steps FROM anon;
GRANT SELECT ON TABLE public.daily_steps TO authenticated;
