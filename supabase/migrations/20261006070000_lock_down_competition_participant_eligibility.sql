-- Lock competition participation to eligible users.
-- Prevents direct client inserts into active competitions when the
-- caller is outside the configured age/gender category or ward scope.

drop policy if exists "Users can join active competitions as themselves"
on public.competition_participants;

create policy "Users can join eligible active competitions as themselves"
on public.competition_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'active'
  and exists (
    select 1
    from public.competitions c
    left join public.competition_categories cc
      on cc.id = c.category_id
     and cc.active = true
    join public.profiles p
      on p.id = auth.uid()
    where c.id = competition_participants.competition_id
      and c.status = 'active'
      and c.starts_at <= now()
      and c.ends_at > now()
      and (
        (
          c.scope = 'global'
          and c.category_id is null
        )
        or
        (
          c.scope = 'global'
          and c.category_id is not null
          and cc.id is not null
          and lower(coalesce(p.gender, '')) = lower(cc.gender)
          and p.age >= cc.age_min
          and (cc.age_max is null or p.age <= cc.age_max)
        )
        or
        (
          c.scope = 'ward'
          and p.ward_id = c.ward_id
          and (
            c.category_id is null
            or (
              cc.id is not null
              and lower(coalesce(p.gender, '')) = lower(cc.gender)
              and p.age >= cc.age_min
              and (cc.age_max is null or p.age <= cc.age_max)
            )
          )
        )
      )
  )
);
