drop policy if exists "Users can create their own profile" on public.profiles;

revoke insert on public.profiles from authenticated;
revoke update on public.profiles from authenticated;

grant update (
  full_name,
  username,
  avatar_url,
  age,
  gender,
  area,
  daily_step_goal
) on public.profiles to authenticated;
