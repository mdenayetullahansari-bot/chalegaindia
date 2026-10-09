create or replace function public.get_my_garden_lesson_progress()
returns table (
  lesson_slug text,
  completed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    glc.lesson_slug,
    glc.completed_at
  from public.garden_lesson_completions glc
  where glc.user_id = auth.uid()
  order by glc.completed_at asc;
$function$;

revoke all on function public.get_my_garden_lesson_progress() from public;
revoke all on function public.get_my_garden_lesson_progress() from anon;
grant execute on function public.get_my_garden_lesson_progress() to authenticated;
