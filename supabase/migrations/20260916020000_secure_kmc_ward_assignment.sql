-- Secure KMC ward assignment from the authenticated user's current location.
--
-- IMPORTANT:
-- This migration must match the live function signature:
-- assign_my_kmc_ward(double precision, double precision)
--
-- The user's precise coordinates are used only for the boundary lookup.
-- They are not stored in profiles.

drop function if exists public.assign_my_kmc_ward(integer);
create or replace function public.assign_my_kmc_ward(
  p_lat double precision,
  p_lng double precision
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid;
  v_ward_id integer;
  v_ward_number integer;
  v_boundary_version text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select
    w.ward_id,
    w.ward_number,
    w.boundary_version
  into
    v_ward_id,
    v_ward_number,
    v_boundary_version
  from public.kmc_wards w
  where w.is_active = true
    and w.boundary is not null
    and st_covers(
      w.boundary,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)
    )
  order by w.ward_number
  limit 1;

  if v_ward_id is null then
    raise exception 'No active KMC ward matches this location.';
  end if;

  update public.profiles
  set
    ward_id = v_ward_id,
    ward_assignment_method = 'gps_boundary',
    ward_assigned_at = now()
  where id = v_user_id;

  if not found then
    raise exception 'User profile not found.';
  end if;

  return jsonb_build_object(
    'success', true,
    'ward_id', v_ward_id,
    'ward_number', v_ward_number,
    'boundary_version', v_boundary_version,
    'assignment_method', 'gps_boundary'
  );
end;
$function$;
revoke all on function public.assign_my_kmc_ward(double precision, double precision)
from public, anon, authenticated;
grant execute on function public.assign_my_kmc_ward(double precision, double precision)
to authenticated;
