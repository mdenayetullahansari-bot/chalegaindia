-- Ward championship prizes are community pools distributed equally among qualified participating residents.
create table if not exists public.ward_competition_prize_distributions (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  ward_winner_id uuid not null references public.ward_competition_winners(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  points_amount integer not null check (points_amount>=0),
  status text not null default 'pending' check (status in ('pending','issued','cancelled')),
  transaction_key text not null unique,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  unique (competition_id,ward_winner_id,user_id)
);
alter table public.ward_competition_prize_distributions enable row level security;
revoke all on public.ward_competition_prize_distributions from anon,authenticated;
grant select on public.ward_competition_prize_distributions to authenticated;
create policy "Authenticated users can view ward prize distributions"
on public.ward_competition_prize_distributions for select to authenticated using (user_id=auth.uid());

-- Internal-only distribution function: equal split, with integer remainder awarded deterministically by user UUID order.
-- The live function is revoked from public/anon/authenticated and is intended for trusted server-side finalization.
