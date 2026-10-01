create table if not exists public.assembly_constituencies (
  id bigserial primary key,
  assembly_number integer not null,
  name text not null,
  state text not null default 'West Bengal',
  assembly_type text not null default 'Legislative Assembly',
  boundary_version text not null,
  boundary_status text not null default 'reference_only',
  boundary_source text,
  boundary_notes text,
  boundary geometry(MultiPolygon, 4326),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assembly_number, boundary_version)
);

create index if not exists assembly_constituencies_boundary_gix
  on public.assembly_constituencies using gist (boundary);

insert into public.assembly_constituencies
  (assembly_number, name, state, assembly_type, boundary_version, boundary_status, boundary_source, boundary_notes)
values
  (163, 'Entally', 'West Bengal', 'Legislative Assembly', 'current_assembly_reference_2026', 'reference_only', 'Election Commission / CEO West Bengal constituency numbering; current AC reference', 'Assembly constituency is a separate geographic layer from KMC ward delimitation. Do not infer 2026 KMC ward membership from this row. KMC 209-ward boundaries remain provisional until final notification.')
on conflict (assembly_number, boundary_version) do update set
  name = excluded.name,
  boundary_source = excluded.boundary_source,
  boundary_notes = excluded.boundary_notes,
  updated_at = now();

alter table public.profiles
  add column if not exists assembly_id bigint references public.assembly_constituencies(id);

create index if not exists profiles_assembly_id_idx on public.profiles(assembly_id);

create table if not exists public.assembly_legacy_ward_references (
  id bigserial primary key,
  assembly_id bigint not null references public.assembly_constituencies(id) on delete cascade,
  legacy_kmc_ward_number integer not null,
  reference_version text not null,
  reference_source text not null,
  notes text,
  unique (assembly_id, legacy_kmc_ward_number, reference_version)
);

insert into public.assembly_legacy_ward_references
  (assembly_id, legacy_kmc_ward_number, reference_version, reference_source, notes)
select id, v.ward_no, 'legacy_pre_2026_reference', 'Election Commission delimitation reference for Entally AC', 'Legacy KMC ward composition only; not a 2026 KMC ward assignment.'
from public.assembly_constituencies a
cross join (values (54),(55),(56),(58),(59)) as v(ward_no)
where a.assembly_number = 163
  and a.boundary_version = 'current_assembly_reference_2026'
on conflict do nothing;;
