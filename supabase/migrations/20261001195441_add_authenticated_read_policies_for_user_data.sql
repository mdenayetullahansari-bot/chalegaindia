-- Add least-privilege authenticated read policies for user-facing data.
-- No anonymous access or client-side write access is added.

REVOKE ALL ON TABLE public.chalega_points_transactions FROM anon;
GRANT SELECT ON TABLE public.chalega_points_transactions TO authenticated;
DROP POLICY IF EXISTS "Users can view their own Coin transactions" ON public.chalega_points_transactions;
CREATE POLICY "Users can view their own Coin transactions"
  ON public.chalega_points_transactions
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.chalega_referral_codes FROM anon;
GRANT SELECT ON TABLE public.chalega_referral_codes TO authenticated;
DROP POLICY IF EXISTS "Users can view their own referral code" ON public.chalega_referral_codes;
CREATE POLICY "Users can view their own referral code"
  ON public.chalega_referral_codes
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.chalega_referrals FROM anon;
GRANT SELECT ON TABLE public.chalega_referrals TO authenticated;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.chalega_referrals;
CREATE POLICY "Users can view their own referrals"
  ON public.chalega_referrals
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = referrer_user_id
    OR (SELECT auth.uid()) = referred_user_id
  );

REVOKE ALL ON TABLE public.chalega_partner_applications FROM anon;
GRANT SELECT ON TABLE public.chalega_partner_applications TO authenticated;
DROP POLICY IF EXISTS "Users can view their own partner applications" ON public.chalega_partner_applications;
CREATE POLICY "Users can view their own partner applications"
  ON public.chalega_partner_applications
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.chalega_reward_events FROM anon;
GRANT SELECT ON TABLE public.chalega_reward_events TO authenticated;
DROP POLICY IF EXISTS "Users can view their own reward events" ON public.chalega_reward_events;
CREATE POLICY "Users can view their own reward events"
  ON public.chalega_reward_events
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.competition_prizes FROM anon;
GRANT SELECT ON TABLE public.competition_prizes TO authenticated;
DROP POLICY IF EXISTS "Authenticated users can view competition prizes" ON public.competition_prizes;
CREATE POLICY "Authenticated users can view competition prizes"
  ON public.competition_prizes
  FOR SELECT TO authenticated
  USING (true);

REVOKE ALL ON TABLE public.competition_winners FROM anon;
GRANT SELECT ON TABLE public.competition_winners TO authenticated;
DROP POLICY IF EXISTS "Users can view their own competition wins" ON public.competition_winners;
CREATE POLICY "Users can view their own competition wins"
  ON public.competition_winners
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.ward_competition_results FROM anon;
GRANT SELECT ON TABLE public.ward_competition_results TO authenticated;
DROP POLICY IF EXISTS "Authenticated users can view ward competition results" ON public.ward_competition_results;
CREATE POLICY "Authenticated users can view ward competition results"
  ON public.ward_competition_results
  FOR SELECT TO authenticated
  USING (true);
