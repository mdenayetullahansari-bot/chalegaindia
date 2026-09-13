create table if not exists public.kmc_wards (
  ward_id integer primary key,
  ward_number integer not null unique,
  name text not null,
  is_active boolean not null default true,
  boundary_version text,
  boundary_source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kmc_wards_ward_number_check check (ward_number between 1 and 209)
);

insert into public.kmc_wards (ward_id, ward_number, name)
select n, n, 'KMC Ward ' || n
from generate_series(1, 209) as n
on conflict (ward_id) do nothing;

alter table public.profiles
  add column if not exists ward_id integer,
  add column if not exists ward_assignment_method text,
  add column if not exists ward_assigned_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_ward_id_fkey;

alter table public.profiles
  add constraint profiles_ward_id_fkey
  foreign key (ward_id) references public.kmc_wards(ward_id)
  on delete set null;

create index if not exists profiles_ward_id_idx
  on public.profiles(ward_id);

create index if not exists kmc_wards_active_idx
  on public.kmc_wards(is_active, ward_number);

alter table public.kmc_wards enable row level security;

create policy "Anyone can view active KMC wards"
  on public.kmc_wards
  for select
  using (is_active = true);

create policy "Users can update their own ward fields"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

comment on table public.kmc_wards is 'Configurable KMC ward registry. Initially seeded with wards 1-209; official names and boundary versions can be updated centrally.';
comment on column public.profiles.ward_id is 'Current KMC ward assigned to this user.';
comment on column public.profiles.ward_assignment_method is 'How the ward was assigned, e.g. manual, map, or verified.';
comment on column public.profiles.ward_assigned_at is 'Timestamp of the current ward assignment.';;
