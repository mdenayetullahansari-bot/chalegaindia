revoke all on function public.award_daily_mission_reward(bigint, date) from anon;
revoke all on function public.award_daily_mission_reward(bigint, date) from public;
grant execute on function public.award_daily_mission_reward(bigint, date) to authenticated;
