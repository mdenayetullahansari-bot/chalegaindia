create table if not exists public.order_managers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.order_managers enable row level security;

revoke all on public.order_managers from anon, authenticated;

create or replace function public.update_order_status(
  p_order_id text,
  p_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
begin
  if not exists (
    select 1
    from public.order_managers
    where user_id = auth.uid()
      and active = true
  ) then
    raise exception 'Not authorized to update order status';
  end if;

  if p_status not in (
    'Order Received',
    'Preparing',
    'Out for Delivery',
    'Delivered',
    'Completed'
  ) then
    raise exception 'Invalid order status';
  end if;

  update public.orders
  set status = p_status,
      updated_at = now()
  where order_id = p_order_id
  returning * into v_order;

  if not found then
    raise exception 'Order not found';
  end if;

  return v_order;
end;
$$;

revoke all on function public.update_order_status(text, text) from public;
grant execute on function public.update_order_status(text, text) to authenticated;

insert into public.order_managers (user_id, active)
values ('7ec6a113-304b-4186-91f4-624ec2fa5b16', true)
on conflict (user_id) do update set active = true;;
