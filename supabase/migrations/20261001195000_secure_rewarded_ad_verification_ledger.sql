-- Harden the rewarded-ad Coin ledger.
-- Provider event IDs are unique so one verified AdMob transaction
-- cannot grant Coins twice.

create unique index if not exists chalega_reward_events_provider_event_unique
  on public.chalega_reward_events(provider, provider_event_id)
  where provider_event_id is not null;

create or replace function public.process_verified_rewarded_ad(
  p_user_id uuid,
  p_provider_event_id text,
  p_coins integer,
  p_metadata jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  if p_user_id is null then
    raise exception 'User ID is required.';
  end if;

  if nullif(trim(p_provider_event_id), '') is null then
    raise exception 'Provider event ID is required.';
  end if;

  if p_coins <> 25 then
    raise exception 'Invalid rewarded-ad Coin amount.';
  end if;

  return public.issue_internal_chalega_coins(
    p_user_id,
    25,
    'rewarded_ad',
    'rewarded_ad:' || trim(p_provider_event_id),
    'Rewarded ad — verified 25 Chalega Coins',
    'rewarded_ad',
    'admob',
    trim(p_provider_event_id),
    p_metadata
  );
end;
$function$;

revoke execute on function public.process_verified_rewarded_ad(uuid, text, integer, jsonb)
  from public, anon, authenticated;

grant execute on function public.process_verified_rewarded_ad(uuid, text, integer, jsonb)
  to service_role;
