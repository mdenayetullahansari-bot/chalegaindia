create or replace function public.get_my_referral_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid;
  v_total integer;
  v_pending integer;
  v_qualified integer;
  v_rewarded integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select
    count(*)::integer,
    count(*) filter (where status = 'pending')::integer,
    count(*) filter (where status = 'qualified')::integer,
    count(*) filter (where status = 'rewarded')::integer
  into v_total, v_pending, v_qualified, v_rewarded
  from public.chalega_referrals
  where referrer_user_id = v_user_id;

  return jsonb_build_object(
    'total_referrals', coalesce(v_total, 0),
    'pending_referrals', coalesce(v_pending, 0),
    'qualified_referrals', coalesce(v_qualified, 0),
    'rewarded_referrals', coalesce(v_rewarded, 0),
    'coins_earned', coalesce(v_rewarded, 0) * 25
  );
end;
$function$;

revoke execute on function public.get_my_referral_summary() from public, anon;
grant execute on function public.get_my_referral_summary() to authenticated;
