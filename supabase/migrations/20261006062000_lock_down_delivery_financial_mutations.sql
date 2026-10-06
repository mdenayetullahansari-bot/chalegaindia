create or replace function public.create_delivery_batch(
  p_job_ids uuid[],
  p_max_orders integer default 3,
  p_max_distance_km numeric default 3
)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_batch_id uuid;
  v_count integer;
  v_ineligible integer;
  v_total numeric;
  v_job uuid;
  v_seq integer := 0;
begin
  if not public.is_order_manager() then raise exception 'Not authorized'; end if;
  if p_job_ids is null or cardinality(p_job_ids)=0 then raise exception 'At least one job is required'; end if;
  if p_max_orders is null or p_max_orders < 1 or p_max_orders > 10 then raise exception 'Invalid maximum order count'; end if;
  if p_max_distance_km is null or p_max_distance_km <= 0 or p_max_distance_km > 100 then raise exception 'Invalid maximum distance'; end if;
  if cardinality(p_job_ids) > p_max_orders then raise exception 'Batch exceeds maximum order count'; end if;

  select count(*), count(*) filter (where status <> 'pending' or batch_id is not null), coalesce(sum(partner_earnings),0)
  into v_count,v_ineligible,v_total
  from public.chalega_delivery_jobs where id=any(p_job_ids) for update;

  if v_count <> cardinality(p_job_ids) then raise exception 'One or more delivery jobs do not exist'; end if;
  if v_ineligible > 0 then raise exception 'One or more delivery jobs are no longer eligible'; end if;

  insert into public.chalega_delivery_batches(status,max_orders,max_distance_km,total_partner_earnings)
  values('draft',p_max_orders,p_max_distance_km,v_total) returning id into v_batch_id;

  foreach v_job in array p_job_ids loop
    v_seq := v_seq + 1;
    update public.chalega_delivery_jobs set batch_id=v_batch_id,sequence_in_batch=v_seq,updated_at=now() where id=v_job;
  end loop;

  return jsonb_build_object('batch_id',v_batch_id,'job_count',v_count,'total_partner_earnings',round(v_total,2),'status','draft');
end;
$function$;

create or replace function public.calculate_delivery_batch_economics(p_batch_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare b public.chalega_delivery_batches%rowtype; v_order_count integer; v_total_earnings numeric; v_per_order numeric;
begin
  if not public.is_order_manager() then raise exception 'Not authorized'; end if;
  select * into b from public.chalega_delivery_batches where id=p_batch_id for update;
  if not found then raise exception 'Delivery batch not found'; end if;
  select count(*),coalesce(sum(partner_earnings),0) into v_order_count,v_total_earnings
  from public.chalega_delivery_jobs where batch_id=p_batch_id and status <> 'cancelled';
  v_per_order := case when v_order_count > 0 then round(v_total_earnings/v_order_count,2) else 0 end;
  update public.chalega_delivery_batches set total_partner_earnings=v_total_earnings,updated_at=now() where id=p_batch_id;
  return jsonb_build_object('batch_id',p_batch_id,'order_count',v_order_count,'total_partner_earnings',round(v_total_earnings,2),'average_partner_earnings_per_order',v_per_order,'max_orders',b.max_orders,'max_distance_km',b.max_distance_km);
end;
$function$;

create or replace function public.settle_delivery_job_financials(p_job_id uuid)
returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare j public.chalega_delivery_jobs%rowtype; calc jsonb; sid uuid;
begin
  if not public.is_order_manager() then raise exception 'Not authorized'; end if;
  select * into j from public.chalega_delivery_jobs where id=p_job_id for update;
  if not found then raise exception 'Delivery job not found'; end if;

  calc := public.calculate_chalega_settlement(coalesce(j.delivery_fee,0),coalesce(j.partner_earnings,0),0,0,0,true,false);

  select id into sid from public.chalega_financial_settlements where delivery_job_id=j.id order by created_at desc limit 1;

  if sid is null then
    insert into public.chalega_financial_settlements(
      order_id,delivery_job_id,customer_gross_delivery_fee,delivery_fee_ex_gst,delivery_gst_rate,delivery_gst_amount,
      partner_gross_earnings,partner_tds_rate,partner_tds_amount,partner_net_payout,payment_gateway_fee,other_variable_cost,
      chalega_net_delivery_revenue,contribution_margin,contribution_margin_percent,company_income_tax_planning_rate,
      company_income_tax_provision,tax_notes)
    values(
      j.order_id,j.id,(calc->>'customer_gross_delivery_fee')::numeric,(calc->>'delivery_fee_ex_gst')::numeric,
      (calc->>'delivery_gst_rate')::numeric,(calc->>'delivery_gst_amount')::numeric,(calc->>'partner_gross_earnings')::numeric,
      (calc->>'partner_tds_rate')::numeric,(calc->>'partner_tds_amount')::numeric,(calc->>'partner_net_payout')::numeric,
      (calc->>'payment_gateway_fee')::numeric,(calc->>'other_variable_cost')::numeric,(calc->>'chalega_net_delivery_revenue')::numeric,
      (calc->>'contribution_margin')::numeric,(calc->>'contribution_margin_percent')::numeric,
      (calc->>'company_income_tax_planning_rate')::numeric,(calc->>'company_income_tax_provision')::numeric,calc->'tax_notes')
    returning id into sid;
  else
    update public.chalega_financial_settlements set
      order_id=j.order_id,customer_gross_delivery_fee=(calc->>'customer_gross_delivery_fee')::numeric,
      delivery_fee_ex_gst=(calc->>'delivery_fee_ex_gst')::numeric,delivery_gst_rate=(calc->>'delivery_gst_rate')::numeric,
      delivery_gst_amount=(calc->>'delivery_gst_amount')::numeric,partner_gross_earnings=(calc->>'partner_gross_earnings')::numeric,
      partner_tds_rate=(calc->>'partner_tds_rate')::numeric,partner_tds_amount=(calc->>'partner_tds_amount')::numeric,
      partner_net_payout=(calc->>'partner_net_payout')::numeric,payment_gateway_fee=(calc->>'payment_gateway_fee')::numeric,
      other_variable_cost=(calc->>'other_variable_cost')::numeric,chalega_net_delivery_revenue=(calc->>'chalega_net_delivery_revenue')::numeric,
      contribution_margin=(calc->>'contribution_margin')::numeric,contribution_margin_percent=(calc->>'contribution_margin_percent')::numeric,
      company_income_tax_planning_rate=(calc->>'company_income_tax_planning_rate')::numeric,
      company_income_tax_provision=(calc->>'company_income_tax_provision')::numeric,tax_notes=calc->'tax_notes'
    where id=sid;
  end if;

  return jsonb_build_object('settlement_id',sid,'delivery_job_id',j.id,'calculation',calc);
end;
$function$;
