-- Chalega India
-- Competition status scheduler
-- Created: 2026-09-16

-- Keep competition lifecycle automatic:
-- scheduled -> active -> closed.

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'chalega-refresh-competition-statuses'
  ) then
    perform cron.schedule(
      'chalega-refresh-competition-statuses',
      '* * * * *',
      'select public.refresh_competition_statuses();'
    );
  end if;
end;
$$;
