create extension if not exists postgis;
alter table public.kmc_wards add column if not exists boundary geometry(MultiPolygon, 4326);
alter table public.kmc_wards add column if not exists boundary_status text not null default 'pending_geometry';
alter table public.kmc_wards add column if not exists boundary_verified_at timestamptz;
alter table public.kmc_wards add column if not exists boundary_notes text;
create index if not exists kmc_wards_boundary_gix on public.kmc_wards using gist (boundary);
create or replace function public.find_kmc_ward_by_point(p_lat double precision, p_lng double precision)
returns table(ward_id integer, ward_number integer, boundary_version text)
language sql stable security invoker as $$
  select w.ward_id, w.ward_number, w.boundary_version
  from public.kmc_wards w
  where w.is_active = true
    and w.boundary is not null
    and st_covers(w.boundary, st_setsrid(st_makepoint(p_lng, p_lat), 4326))
  order by w.ward_number
  limit 1;
$$;;
