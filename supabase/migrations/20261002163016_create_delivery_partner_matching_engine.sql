create or replace function public.find_eligible_delivery_partners(
  p_job_id uuid, p_limit integer default 10
)
returns table (
  partner_id uuid, user_id uuid, city_area text,
  vehicle_type text, availability text, area_match boolean
)
language plpgsql security definer set search_path=public
as $$
declare j public.chalega_delivery_jobs%rowtype;
begin
  select * into j from public.chalega_delivery_jobs where id=p_job_id for share;
  if not found then raise exception 'Delivery job not found'; end if;
  if j.status <> 'pending' then raise exception 'Delivery job is not pending'; end if;
  return query
  select p.id,p.user_id,p.city_area,p.vehicle_type,p.availability,
    (j.drop_area is not null and lower(trim(coalesce(p.city_area,'')))=lower(trim(coalesce(j.drop_area,''))))
  from public.chalega_delivery_partners p
  where p.status='approved' and p.availability='online'
    and not exists (
      select 1 from public.chalega_delivery_assignments a
      join public.chalega_delivery_jobs aj on aj.id=a.job_id
      where a.partner_id=p.id and a.status in ('offered','accepted')
        and aj.status in ('offered','accepted','pickup','picked_up','out_for_delivery')
    )
  order by case when j.drop_area is not null and lower(trim(coalesce(p.city_area,'')))=lower(trim(coalesce(j.drop_area,''))) then 0 else 1 end,
    p.updated_at asc
  limit greatest(p_limit,1);
end; $$;

revoke all on function public.find_eligible_delivery_partners(uuid,integer) from public;
grant execute on function public.find_eligible_delivery_partners(uuid,integer) to authenticated;