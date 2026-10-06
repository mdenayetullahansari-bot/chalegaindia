-- Step 3B: proper ward championship winner and prize records.
-- Ward championships are community/ward awards, not individual user prizes.
create table if not exists public.ward_competition_prizes (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  rank integer not null check (rank in (1,2,3)),
  reward_type text not null default 'chalega_points' check (reward_type='chalega_points'),
  points_amount integer not null default 0 check (points_amount>=0),
  status text not null default 'available' check (status in ('available','awarded','cancelled')),
  created_at timestamptz not null default now(),
  unique (competition_id,rank)
);
create table if not exists public.ward_competition_winners (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  ward_id integer not null references public.kmc_wards(ward_id),
  prize_id uuid not null references public.ward_competition_prizes(id) on delete restrict,
  rank integer not null check (rank in (1,2,3)),
  verified_steps bigint not null default 0 check (verified_steps>=0),
  active_participants integer not null default 0 check (active_participants>=0),
  status text not null default 'reward_pending' check (status in ('confirmed','reward_pending','reward_issued','cancelled')),
  created_at timestamptz not null default now(),
  awarded_at timestamptz,
  unique (competition_id,rank),
  unique (competition_id,ward_id)
);
alter table public.ward_competition_prizes enable row level security;
alter table public.ward_competition_winners enable row level security;
revoke all on public.ward_competition_prizes from anon,authenticated;
revoke all on public.ward_competition_winners from anon,authenticated;
grant select on public.ward_competition_prizes,public.ward_competition_winners to authenticated;
create policy "Authenticated users can view ward competition prizes" on public.ward_competition_prizes for select to authenticated using (true);
create policy "Authenticated users can view ward competition winners" on public.ward_competition_winners for select to authenticated using (true);

-- confirm_competition_winners() was updated in production to:
-- 1) calculate ward results for ward-championship-v1;
-- 2) create rank 1-3 ward prize records;
-- 3) create ward winner records from qualified ward results;
-- 4) never issue individual-user prizes for a ward championship;
-- 5) confirm only when a qualified ward podium exists.
