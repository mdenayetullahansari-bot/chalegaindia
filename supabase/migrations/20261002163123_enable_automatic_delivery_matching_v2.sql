create or replace function public.auto_assign_delivery_job(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare
  seed public.chalega_delivery_jobs%rowtype;
  partner public.chalega_delivery_partners%rowtype;
  v_batch_id uuid; job_ids uuid[]; job_id uuid; seq integer:=0; total_earnings numeric:=0;
begin
  select * into seed from public.chalega_delivery_jobs where id=p_job_id for update;
  if not found or seed.status <> 'pending' or seed.batch_id is not null then
    return jsonb_build_object('assigned',false,'reason','job_not_pending');
  end if;
  select * into partner
  from public.chalega_delivery_partners p
  where p.status='approved' and p.availability='online'
    and p.city_area is not null and seed.drop_area is not null
    and lower(trim(p.city_area))=lower(trim(seed.drop_area))
    and not exists (
      select 1 from public.chalega_delivery_assignments a
      join public.chalega_delivery_jobs aj on aj.id=a.job_id
      where a.partner_id=p.id and a.status in ('offered','accepted')
        and aj.status in ('offered','accepted','pickup','picked_up','out_for_delivery')
    )
  order by p.updated_at asc limit 1 for update;
  if not found then return jsonb_build_object('assigned',false,'reason','no_eligible_partner'); end if;

  select coalesce(array_agg(x.id order by x.priority,x.created_at),array[]::uuid[]),
         coalesce(sum(x.partner_earnings),0)
  into job_ids,total_earnings
  from (
    select j.id,j.created_at,j.partner_earnings,
      case when j.drop_pin is not null and j.drop_pin=seed.drop_pin then 0 else 1 end priority
    from public.chalega_delivery_jobs j
    where j.status='pending' and j.batch_id is null
      and ((seed.drop_pin is not null and j.drop_pin=seed.drop_pin)
        or (seed.drop_area is not null and lower(trim(coalesce(j.drop_area,'')))=lower(trim(seed.drop_area))))
      and (seed.distance_km is null or j.distance_km is null or abs(coalesce(j.distance_km,seed.distance_km)-seed.distance_km)<=3)
    order by priority,j.created_at limit 3
  ) x;

  if coalesce(array_length(job_ids,1),0)=0 then
    job_ids:=array[seed.id]; total_earnings:=coalesce(seed.partner_earnings,0);
  end if;

  insert into public.chalega_delivery_batches(status,partner_id,max_orders,max_distance_km,total_partner_earnings)
  values('offered',partner.id,3,3,total_earnings) returning id into v_batch_id;

  foreach job_id in array job_ids loop
    update public.chalega_delivery_jobs
    set batch_id=v_batch_id,sequence_in_batch=seq+1,status='offered',updated_at=now()
    where id=job_id and status='pending' and batch_id is null;
    if found then
      seq:=seq+1;
      insert into public.chalega_delivery_assignments(job_id,partner_id,status,offered_at)
      values(job_id,partner.id,'offered',now());
      insert into public.chalega_delivery_events(job_id,partner_id,event_type,metadata)
      values(job_id,partner.id,'job_offered',jsonb_build_object('batch_id',v_batch_id,'batched',array_length(job_ids,1)>1,'automatic',true,'sequence_in_batch',seq));
    end if;
  end loop;

  return jsonb_build_object('assigned',true,'batch_id',v_batch_id,'partner_id',partner.id,'jobs_offered',seq);
end; $$;

create or replace function public.auto_assign_delivery_job_trigger()
returns trigger language plpgsql security definer set search_path=public
as $$ begin perform public.auto_assign_delivery_job(new.id); return new; end; $$;

revoke all on function public.auto_assign_delivery_job(uuid) from public;
revoke all on function public.auto_assign_delivery_job_trigger() from public;

drop trigger if exists trg_auto_assign_delivery_job on public.chalega_delivery_jobs;
create trigger trg_auto_assign_delivery_job after insert on public.chalega_delivery_jobs
for each row execute function public.auto_assign_delivery_job_trigger();