-- Atomic reconciliation for captured Razorpay payments.
-- Existing production payment_records.amount values are stored in paise (numeric(10,2)).
-- Incoming Razorpay amounts remain in paise to match the existing payment_records convention.
--
-- The 9-argument overload accepts a verified checkout signature.
-- The 8-argument wrapper preserves compatibility with the recovery function;
-- recovery passes NULL and will not erase a signature already stored.

create or replace function public.reconcile_razorpay_payment(
  p_order_id uuid,
  p_user_id uuid,
  p_razorpay_order_id text,
  p_payment_id text,
  p_amount_paise bigint,
  p_currency text,
  p_payment_method text,
  p_payment_status text,
  p_razorpay_signature text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_order public.orders%rowtype;
  v_payment_record public.payment_records%rowtype;
  v_payment_record_exists boolean := false;
  v_inserted_rows integer := 0;
begin
  if p_order_id is null
     or p_user_id is null
     or nullif(pg_catalog.btrim(p_razorpay_order_id), '') is null
     or nullif(pg_catalog.btrim(p_payment_id), '') is null
     or p_amount_paise is null
     or p_amount_paise <= 0
         -- Limit incoming Razorpay amounts to 99999999 paise (INR 999999.99).
     or p_amount_paise > 99999999
     or p_currency is distinct from 'INR'
     or p_payment_status is distinct from 'captured'
     or (p_razorpay_signature is not null
         and nullif(pg_catalog.btrim(p_razorpay_signature), '') is null)
  then
    raise exception 'Invalid payment reconciliation input';
  end if;

  -- Serialize all reconciliation attempts for the same order.
  select o.*
    into v_order
    from public.orders as o
   where o.id = p_order_id
     and o.user_id = p_user_id
   for update;

  if not found then
    raise exception 'Order not found or not owned by user';
  end if;
-- Never automatically reactivate a cancelled order after payment.
  if v_order.status = 'Cancelled' then
    raise exception 'Order is cancelled; payment requires manual resolution';
  end if;

  if v_order.payment_method is distinct from 'Razorpay'
     or v_order.razorpay_order_id is distinct from p_razorpay_order_id
  then
    raise exception 'Order payment details do not match';
  end if;

  if v_order.total is null
     or v_order.total <= 0
     or v_order.total * 100 <> p_amount_paise::numeric
  then
    raise exception 'Payment amount does not match order total';
  end if;

  if v_order.payment_status is distinct from 'pending'
     and v_order.payment_status is distinct from 'paid'
  then
    raise exception 'Order payment status cannot be reconciled';
  end if;

  if v_order.razorpay_payment_id is not null
     and v_order.razorpay_payment_id is distinct from p_payment_id
  then
    raise exception 'Order already references a different payment';
  end if;

  if p_razorpay_signature is not null
     and v_order.razorpay_signature is not null
     and v_order.razorpay_signature is distinct from p_razorpay_signature
  then
    raise exception 'Order has a conflicting Razorpay signature';
  end if;

  -- Lock and validate an existing audit record for this provider payment ID.
  select pr.*
    into v_payment_record
    from public.payment_records as pr
   where pr.razorpay_payment_id = p_payment_id
   for update;

  v_payment_record_exists := found;

  if v_payment_record_exists then
    if v_payment_record.order_id is distinct from p_order_id
       or v_payment_record.razorpay_order_id is distinct from p_razorpay_order_id
       or v_payment_record.provider is distinct from 'razorpay'
       or v_payment_record.amount is distinct from p_amount_paise::numeric
       or v_payment_record.currency is distinct from p_currency
       or (p_payment_method is not null and v_payment_record.payment_method is distinct from p_payment_method)
       or v_payment_record.status is distinct from 'captured'
       or (p_razorpay_signature is not null
           and v_payment_record.razorpay_signature is not null
           and v_payment_record.razorpay_signature is distinct from p_razorpay_signature)
    then
      raise exception 'Existing payment record conflicts with verified payment';
    end if;
  end if;

  -- Update the order and audit record in the same database transaction.
  if v_order.payment_status = 'pending' then
    update public.orders
       set payment_status = 'paid',
           razorpay_payment_id = p_payment_id,
           razorpay_signature = coalesce(razorpay_signature, p_razorpay_signature),
           updated_at = pg_catalog.now()
     where id = p_order_id;
  else
    -- Repair missing payment metadata on an already-paid order.
    update public.orders
       set razorpay_payment_id = coalesce(razorpay_payment_id, p_payment_id),
           razorpay_signature = coalesce(razorpay_signature, p_razorpay_signature),
           updated_at = pg_catalog.now()
     where id = p_order_id
       and (razorpay_payment_id is null
            or (p_razorpay_signature is not null and razorpay_signature is null));
  end if;

  if not v_payment_record_exists then
    insert into public.payment_records (
      order_id,
      provider,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      currency,
      payment_method,
      status
    )
    values (
      p_order_id,
      'razorpay',
      p_razorpay_order_id,
      p_payment_id,
      p_razorpay_signature,
      p_amount_paise::numeric,
      p_currency,
      p_payment_method,
      'captured'
    )
    on conflict (razorpay_payment_id) where razorpay_payment_id is not null do nothing;

    get diagnostics v_inserted_rows = row_count;

    if v_inserted_rows = 0 then
      -- The unique payment ID may have been inserted by a concurrent
      -- reconciliation for another order. Validate rather than overwrite it.
      select pr.*
        into v_payment_record
        from public.payment_records as pr
       where pr.razorpay_payment_id = p_payment_id
       for update;

      if not found
         or v_payment_record.order_id is distinct from p_order_id
         or v_payment_record.razorpay_order_id is distinct from p_razorpay_order_id
         or v_payment_record.provider is distinct from 'razorpay'
         or v_payment_record.amount is distinct from p_amount_paise::numeric
         or v_payment_record.currency is distinct from p_currency
         or (p_payment_method is not null and v_payment_record.payment_method is distinct from p_payment_method)
         or v_payment_record.status is distinct from 'captured'
         or (p_razorpay_signature is not null
             and v_payment_record.razorpay_signature is not null
             and v_payment_record.razorpay_signature is distinct from p_razorpay_signature)
      then
        raise exception 'Concurrent payment record conflicts with verified payment';
      end if;

      -- Fill only a missing signature; never overwrite a recorded signature.
      if p_razorpay_signature is not null
         and v_payment_record.razorpay_signature is null
      then
        update public.payment_records
           set razorpay_signature = p_razorpay_signature
         where id = v_payment_record.id
           and razorpay_signature is null;
      end if;
    end if;
  elsif p_razorpay_signature is not null
        and v_payment_record.razorpay_signature is null
  then
    -- Repair older audit rows that were created by recovery without a signature.
    update public.payment_records
       set razorpay_signature = p_razorpay_signature
     where id = v_payment_record.id
       and razorpay_signature is null;
  end if;

  return pg_catalog.jsonb_build_object(
    'success', true,
    'payment_record_saved', true,
    'order_id', v_order.order_id,
    'razorpay_payment_id', p_payment_id
  );
end;
$function$;

-- Preserve the existing 8-argument call shape used by payment recovery.
create or replace function public.reconcile_razorpay_payment(
  p_order_id uuid,
  p_user_id uuid,
  p_razorpay_order_id text,
  p_payment_id text,
  p_amount_paise bigint,
  p_currency text,
  p_payment_method text,
  p_payment_status text
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select public.reconcile_razorpay_payment(
    p_order_id,
    p_user_id,
    p_razorpay_order_id,
    p_payment_id,
    p_amount_paise,
    p_currency,
    p_payment_method,
    p_payment_status,
    null::text
  );
$function$;

revoke all on function public.reconcile_razorpay_payment(
  uuid, uuid, text, text, bigint, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.reconcile_razorpay_payment(
  uuid, uuid, text, text, bigint, text, text, text, text
) to service_role;

revoke all on function public.reconcile_razorpay_payment(
  uuid, uuid, text, text, bigint, text, text, text
) from public, anon, authenticated;

grant execute on function public.reconcile_razorpay_payment(
  uuid, uuid, text, text, bigint, text, text, text
) to service_role;
