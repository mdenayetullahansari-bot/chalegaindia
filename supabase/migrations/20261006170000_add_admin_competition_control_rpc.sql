create or replace function public.admin_manage_competition(
  p_competition_id uuid,
  p_action text,
  p_rank integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_action text := lower(trim(coalesce(p_action,'')));
  v_issued integer := 0;
  v_status text;
begin
  if not public.is_chalega_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_competition_id is null then
    raise exception 'Competition ID is required.';
  end if;

  select status into v_status from public.competitions where id=p_competition_id;
  if not found then raise exception 'Competition not found.'; end if;

  case v_action
    when 'prepare' then perform public.prepare_competition_for_review(p_competition_id);
    when 'confirm' then perform public.confirm_competition_winners(p_competition_id);
    when 'distribute' then
      if p_rank is not null then
        v_issued := public.distribute_ward_competition_prize(p_competition_id,p_rank);
      else
        for p_rank in 1..3 loop
          begin
            v_issued := v_issued + public.distribute_ward_competition_prize(p_competition_id,p_rank);
          exception when others then
            if sqlerrm not like 'No pending ward prize exists%' then raise; end if;
          end;
        end loop;
      end if;
    else raise exception 'Unsupported competition admin action.';
  end case;

  select status into v_status from public.competitions where id=p_competition_id;
  return jsonb_build_object('success',true,'action',v_action,'competition_id',p_competition_id,'status',v_status,'issued_residents',v_issued);
end;
$function$;

revoke execute on function public.admin_manage_competition(uuid,text,integer) from public,anon;
grant execute on function public.admin_manage_competition(uuid,text,integer) to authenticated;