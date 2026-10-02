alter table public.chalega_delivery_batches enable row level security;
drop policy if exists "partners read own delivery batches" on public.chalega_delivery_batches;
create policy "partners read own delivery batches" on public.chalega_delivery_batches
for select to authenticated using (
  exists (select 1 from public.chalega_delivery_partners p
    where p.id=chalega_delivery_batches.partner_id and p.user_id=(select auth.uid()))
  or public.is_order_manager()
);
alter table public.chalega_financial_settlements enable row level security;

create index if not exists chalega_delivery_batches_partner_idx on public.chalega_delivery_batches(partner_id);
create index if not exists chalega_delivery_events_partner_idx on public.chalega_delivery_events(partner_id);
create index if not exists chalega_delivery_assignments_partner_status_idx on public.chalega_delivery_assignments(partner_id,status);
create index if not exists chalega_delivery_jobs_status_area_idx on public.chalega_delivery_jobs(status,drop_area);
create index if not exists chalega_delivery_jobs_status_pin_idx on public.chalega_delivery_jobs(status,drop_pin);

revoke execute on function public.create_delivery_job_for_paid_order() from public,anon,authenticated;
revoke execute on function public.create_delivery_payout_on_delivered() from public,anon,authenticated;
revoke execute on function public.auto_assign_delivery_job(uuid) from public,anon,authenticated;
revoke execute on function public.auto_assign_delivery_job_trigger() from public,anon,authenticated;
revoke execute on function public.assign_delivery_job(uuid,uuid) from anon;
revoke execute on function public.assign_delivery_batch(uuid,uuid) from anon;
revoke execute on function public.create_delivery_batch(uuid[],integer,numeric) from anon;
revoke execute on function public.accept_my_delivery_assignment(uuid) from anon;
revoke execute on function public.reject_my_delivery_assignment(uuid) from anon;
revoke execute on function public.accept_my_delivery_batch(uuid) from anon;
revoke execute on function public.reject_my_delivery_batch(uuid) from anon;
revoke execute on function public.update_my_delivery_job_status(uuid,text) from anon;
revoke execute on function public.find_eligible_delivery_partners(uuid,integer) from anon;
revoke execute on function public.find_compatible_delivery_jobs(uuid,integer,numeric) from anon;
revoke execute on function public.get_my_delivery_assignments() from anon;
revoke execute on function public.preview_delivery_batch(uuid[],integer) from anon;
revoke execute on function public.calculate_delivery_partner_earnings(numeric,numeric,numeric,numeric,numeric,numeric) from anon;
revoke execute on function public.calculate_delivery_batch_economics(uuid) from anon;
revoke execute on function public.simulate_delivery_unit_economics(numeric,numeric,numeric,numeric,numeric,numeric,numeric,numeric) from anon;
revoke execute on function public.evaluate_delivery_pricing_scenario(text) from anon;
revoke execute on function public.calculate_chalega_settlement(numeric,numeric,numeric,numeric,numeric,boolean,boolean) from anon;
revoke execute on function public.settle_delivery_job_financials(uuid) from anon;
revoke execute on function public.st_estimatedextent(text,text) from anon,authenticated;
revoke execute on function public.st_estimatedextent(text,text,text) from anon,authenticated;
revoke execute on function public.st_estimatedextent(text,text,text,boolean) from anon,authenticated;