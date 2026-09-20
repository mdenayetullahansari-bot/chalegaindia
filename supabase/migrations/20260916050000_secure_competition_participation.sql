-- Chalega India
-- Secure competition participation
-- Created: 2026-09-16

-- Users may join only active competitions.
-- They may still join only as themselves.

drop policy if exists "Users can join competitions as themselves"
on public.competition_participants;
create policy "Users can join active competitions as themselves"
on public.competition_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.competitions c
    where c.id = competition_id
      and c.status = 'active'
      and c.starts_at <= now()
      and c.ends_at > now()
  )
);
