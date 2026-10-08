create schema if not exists private;

create or replace function private.can_update_home_kitchen(
  p_id uuid,
  p_user_id uuid,
  p_status text,
  p_fssai_status text,
  p_fssai_number text,
  p_hygiene_status text
)
returns boolean
language sql
security definer
stable
set search_path=''
as $$
  select
    public.is_chalega_admin()
    or exists (
      select 1
      from public.chalega_home_kitchens old
      where old.id = p_id
        and old.user_id = (select auth.uid())
        and p_user_id = (select auth.uid())
        and p_status = old.status
        and p_fssai_status = old.fssai_status
        and p_fssai_number is not distinct from old.fssai_number
        and p_hygiene_status = old.hygiene_status
    )
$$;

create or replace function private.can_update_home_kitchen_item(
  p_id uuid,
  p_user_id uuid,
  p_kitchen_id uuid,
  p_status text,
  p_quantity integer
)
returns boolean
language sql
security definer
stable
set search_path=''
as $$
  select
    public.is_chalega_admin()
    or exists (
      select 1
      from public.chalega_home_kitchen_items old
      join public.chalega_home_kitchens k on k.id = old.kitchen_id
      where old.id = p_id
        and old.user_id = (select auth.uid())
        and k.user_id = (select auth.uid())
        and p_user_id = (select auth.uid())
        and p_kitchen_id = old.kitchen_id
        and (
          p_status = old.status
          or (old.status in ('approved','paused') and p_status = 'paused')
          or (p_status = 'sold_out' and p_quantity = 0)
        )
    )
$$;

revoke all on function private.can_update_home_kitchen(uuid,uuid,text,text,text,text) from public;
revoke all on function private.can_update_home_kitchen_item(uuid,uuid,uuid,text,integer) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_update_home_kitchen(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function private.can_update_home_kitchen_item(uuid,uuid,uuid,text,integer) to authenticated;

drop policy if exists "home kitchens own update" on public.chalega_home_kitchens;
create policy "home kitchens own update"
on public.chalega_home_kitchens
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  private.can_update_home_kitchen(
    id,user_id,status,fssai_status,fssai_number,hygiene_status
  )
);

drop policy if exists "home kitchen items own update" on public.chalega_home_kitchen_items;
create policy "home kitchen items own update"
on public.chalega_home_kitchen_items
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  private.can_update_home_kitchen_item(
    id,user_id,kitchen_id,status,quantity_available
  )
);