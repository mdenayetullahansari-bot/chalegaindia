create or replace function public.requeue_pending_delivery_job()
returns trigger language plpgsql security definer set search_path=public
as $$ begin
  if new.status='pending' and old.status<>'pending' and new.batch_id is null then
    perform public.auto_assign_delivery_job(new.id);
  end if;
  return new;
end; $$;

drop trigger if exists trg_requeue_pending_delivery_job on public.chalega_delivery_jobs;
create trigger trg_requeue_pending_delivery_job after update of status on public.chalega_delivery_jobs
for each row when (new.status='pending' and old.status<>'pending')
execute function public.requeue_pending_delivery_job();

create or replace function public.expire_delivery_offers()
returns integer language plpgsql security definer set search_path=public
as $$
declare v_count integer:=0; j record;
begin
  for j in
    select a.id assignment_id,a.job_id,a.partner_id,j.batch_id
    from public.chalega_delivery_assignments a
    join public.chalega_delivery_jobs j on j.id=a.job_id
    where a.status='offered' and a.offered_at<now()-interval '5 minutes' and j.status='offered'
    for update of a,j
  loop
    update public.chalega_delivery_assignments set status='expired',rejected_at=now() where id=j.assignment_id;
    insert into public.chalega_delivery_events(job_id,partner_id,event_type,metadata)
    values(j.job_id,j.partner_id,'job_rejected',jsonb_build_object('reason','offer_expired','automatic',true,'batch_id',j.batch_id));
    update public.chalega_delivery_jobs
    set status='pending',batch_id=null,sequence_in_batch=null,updated_at=now()
    where id=j.job_id and status='offered';
    v_count:=v_count+1;
  end loop;
  update public.chalega_delivery_batches b set status='cancelled',updated_at=now()
  where b.status='offered' and not exists (
    select 1 from public.chalega_delivery_jobs j where j.batch_id=b.id and j.status='offered'
  );
  return v_count;
end; $$;

revoke all on function public.requeue_pending_delivery_job() from public,anon,authenticated;
revoke all on function public.expire_delivery_offers() from public,anon,authenticated;

select cron.schedule('chalega-expire-delivery-offers','* * * * *','select public.expire_delivery_offers();')
where not exists (select 1 from cron.job where jobname='chalega-expire-delivery-offers');