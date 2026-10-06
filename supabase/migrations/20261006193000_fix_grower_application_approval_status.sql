-- New community grower applications must remain pending until admin approval.
-- Existing grower records are intentionally unchanged.

create or replace function public.chalega_guard_grower_mutation()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
  if auth.uid() is not null then
    if tg_table_name = 'chalega_community_growers' then
      if tg_op = 'INSERT' then
        new.user_id = auth.uid();
        new.status = 'pending';
      elsif tg_op = 'UPDATE' then
        new.user_id = old.user_id;
        if not public.is_chalega_admin() then
          new.status = old.status;
        end if;
      end if;
    elsif tg_table_name = 'chalega_grower_listings' then
      if tg_op = 'INSERT' then
        new.user_id = auth.uid();
        new.status = 'pending';
      elsif tg_op = 'UPDATE' then
        new.user_id = old.user_id;
        if not public.is_chalega_admin() then
          if not (
            (old.status in ('pending','approved') and new.status = 'paused')
            or (old.status = 'paused' and new.status = 'pending')
          ) then
            new.status = old.status;
          end if;
        end if;
      end if;
    end if;
  end if;
  return new;
end;
$function$;

revoke execute on function public.chalega_guard_grower_mutation() from public, anon, authenticated;
