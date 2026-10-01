-- Chalega India
-- Tighten SECURITY DEFINER API exposure and fix function search_path
-- Created: 2026-09-21

-- Leaderboards are used by signed-in app users, not anonymous callers.
revoke all
  on function public.get_competition_leaderboard(uuid, date)
  from public, anon;

grant execute
  on function public.get_competition_leaderboard(uuid, date)
  to authenticated, service_role;
revoke all
  on function public.get_ward_competition_leaderboard(uuid)
  from public, anon;

grant execute
  on function public.get_ward_competition_leaderboard(uuid)
  to authenticated, service_role;

-- This is a trigger helper, not a client RPC.
revoke all
  on function public.handle_new_user()
  from public, anon, authenticated;

grant execute
  on function public.handle_new_user()
  to service_role;

-- PostGIS helper functions are not part of the app's public RPC API.
revoke all
  on function public.st_estimatedextent(text, text)
  from public, anon, authenticated;

revoke all
  on function public.st_estimatedextent(text, text, text)
  from public, anon, authenticated;

revoke all
  on function public.st_estimatedextent(text, text, text, boolean)
  from public, anon, authenticated;

grant execute
  on function public.st_estimatedextent(text, text)
  to service_role;

grant execute
  on function public.st_estimatedextent(text, text, text)
  to service_role;

grant execute
  on function public.st_estimatedextent(text, text, text, boolean)
  to service_role;

-- Pin search_path for the ward lookup function.
alter function public.find_kmc_ward_by_point(double precision, double precision)
  set search_path = public;
