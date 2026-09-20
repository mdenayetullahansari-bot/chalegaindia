create policy "Authenticated users can view qualified competition results"
on public.competition_results
for select
to authenticated
using (status = 'qualified');;
