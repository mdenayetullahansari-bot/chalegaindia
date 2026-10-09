-- Expand the admin Home Kitchen RPC with compliance review fields.
drop function public.get_admin_home_kitchens();

create function public.get_admin_home_kitchens()
returns table(
  id uuid,user_id uuid,kitchen_name text,display_name text,locality text,city text,women_led boolean,
  fssai_status text,fssai_number text,fssai_document_ref text,fssai_valid_until date,fssai_rejection_reason text,
  hygiene_status text,hygiene_notes text,hygiene_rejection_reason text,
  status text,accepting_orders boolean,created_at timestamptz,item_count bigint
)
language sql security definer set search_path=public
as $function$
  select k.id,k.user_id,k.kitchen_name,k.display_name,k.locality,k.city,k.women_led,
    k.fssai_status,k.fssai_number,k.fssai_document_ref,k.fssai_valid_until,k.fssai_rejection_reason,
    k.hygiene_status,k.hygiene_notes,k.hygiene_rejection_reason,
    k.status,k.accepting_orders,k.created_at,count(i.id)::bigint
  from public.chalega_home_kitchens k
  left join public.chalega_home_kitchen_items i on i.kitchen_id=k.id
  where public.is_chalega_admin()
  group by k.id order by k.created_at desc;
$function$;

grant execute on function public.get_admin_home_kitchens() to authenticated;
