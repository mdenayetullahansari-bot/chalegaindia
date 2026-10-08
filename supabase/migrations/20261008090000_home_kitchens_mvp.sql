-- Chalega Home Kitchens MVP
-- Additive migration: verified kitchens, menus, secure COD orders and admin approval.

create table if not exists public.chalega_home_kitchens(
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 kitchen_name text not null, display_name text not null, bio text, locality text, city text not null default 'Kolkata',
 service_radius_km numeric(4,1) not null default 3 check(service_radius_km>0 and service_radius_km<=20),
 cuisine_types text[] not null default '{}', women_led boolean not null default false,
 fssai_status text not null default 'unverified' check(fssai_status in('unverified','pending','verified','rejected')),
 fssai_number text, hygiene_status text not null default 'pending' check(hygiene_status in('pending','verified','rejected')),
 status text not null default 'pending' check(status in('pending','approved','paused','rejected')),
 accepting_orders boolean not null default false, min_order_amount numeric(10,2) not null default 0 check(min_order_amount>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table if not exists public.chalega_home_kitchen_items(
 id uuid primary key default gen_random_uuid(), kitchen_id uuid not null references public.chalega_home_kitchens(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,title text not null,description text,emoji text not null default '🍛',
 category text not null default 'Home Food',price numeric(10,2) not null check(price>=0),unit text not null default 'plate',
 quantity_available integer not null default 0 check(quantity_available>=0),prep_time_minutes integer not null default 45,
 order_mode text not null default 'same_day' check(order_mode in('same_day','preorder')),availability_note text,
 status text not null default 'pending' check(status in('pending','approved','paused','sold_out','rejected')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create table if not exists public.chalega_home_kitchen_orders(
 id uuid primary key default gen_random_uuid(),order_id text not null unique,kitchen_id uuid not null references public.chalega_home_kitchens(id),
 item_id uuid not null references public.chalega_home_kitchen_items(id),customer_id uuid not null references auth.users(id),
 quantity integer not null check(quantity>0),unit_price numeric(10,2) not null,food_total numeric(10,2) not null,
 delivery_fee numeric(10,2) not null default 0,total numeric(10,2) not null,customer_name text not null,customer_phone text not null,
 delivery_address text not null,delivery_area text,delivery_pin text,delivery_latitude double precision,delivery_longitude double precision,
 status text not null default 'pending' check(status in('pending','accepted','preparing','ready','picked_up','out_for_delivery','delivered','cancelled')),
 payment_method text not null default 'cod' check(payment_method='cod'),payment_status text not null default 'pending' check(payment_status in('pending','collected','refunded')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);

create index if not exists home_kitchens_status_idx on public.chalega_home_kitchens(status,accepting_orders);
create index if not exists home_kitchen_items_idx on public.chalega_home_kitchen_items(kitchen_id,status);
create index if not exists home_kitchen_orders_customer_idx on public.chalega_home_kitchen_orders(customer_id,created_at desc);

alter table public.chalega_home_kitchens enable row level security;
alter table public.chalega_home_kitchen_items enable row level security;
alter table public.chalega_home_kitchen_orders enable row level security;

drop policy if exists "hk public read" on public.chalega_home_kitchens;
create policy "hk public read" on public.chalega_home_kitchens for select to anon,authenticated using(status='approved' and accepting_orders=true);
drop policy if exists "hk own read" on public.chalega_home_kitchens;
create policy "hk own read" on public.chalega_home_kitchens for select to authenticated using(auth.uid()=user_id);
drop policy if exists "hk own insert" on public.chalega_home_kitchens;
create policy "hk own insert" on public.chalega_home_kitchens for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "hk own update" on public.chalega_home_kitchens;
create policy "hk own update" on public.chalega_home_kitchens for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists "hki public read" on public.chalega_home_kitchen_items;
create policy "hki public read" on public.chalega_home_kitchen_items for select to anon,authenticated using(status='approved' and exists(select 1 from public.chalega_home_kitchens k where k.id=kitchen_id and k.status='approved' and k.accepting_orders=true));
drop policy if exists "hki own read" on public.chalega_home_kitchen_items;
create policy "hki own read" on public.chalega_home_kitchen_items for select to authenticated using(auth.uid()=user_id);
drop policy if exists "hki own insert" on public.chalega_home_kitchen_items;
create policy "hki own insert" on public.chalega_home_kitchen_items for insert to authenticated with check(auth.uid()=user_id and exists(select 1 from public.chalega_home_kitchens k where k.id=kitchen_id and k.user_id=auth.uid()));
drop policy if exists "hki own update" on public.chalega_home_kitchen_items;
create policy "hki own update" on public.chalega_home_kitchen_items for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

drop policy if exists "hko customer or seller read" on public.chalega_home_kitchen_orders;
create policy "hko customer or seller read" on public.chalega_home_kitchen_orders for select to authenticated using(customer_id=auth.uid() or exists(select 1 from public.chalega_home_kitchens k where k.id=kitchen_id and k.user_id=auth.uid()));

create or replace function public.create_chalega_home_kitchen_order(p_order_id text,p_item_id uuid,p_quantity integer,p_customer_name text,p_customer_phone text,p_delivery_address text,p_delivery_area text default null,p_delivery_pin text default null,p_delivery_latitude double precision default null,p_delivery_longitude double precision default null)
returns table(order_id text,total numeric,delivery_fee numeric,status text) language plpgsql security definer set search_path=public as $$
declare v_item public.chalega_home_kitchen_items%rowtype; v_food numeric; v_fee numeric;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_quantity<1 or p_quantity>50 then raise exception 'Quantity must be between 1 and 50'; end if;
 if nullif(trim(p_customer_name),'') is null or nullif(trim(p_customer_phone),'') is null or nullif(trim(p_delivery_address),'') is null then raise exception 'Name, phone and address are required'; end if;
 select * into v_item from public.chalega_home_kitchen_items where id=p_item_id and status='approved' for update;
 if not found then raise exception 'This menu item is unavailable'; end if;
 if not exists(select 1 from public.chalega_home_kitchens where id=v_item.kitchen_id and status='approved' and accepting_orders=true) then raise exception 'This kitchen is not accepting orders'; end if;
 if v_item.quantity_available<p_quantity then raise exception 'Not enough portions available'; end if;
 v_food:=v_item.price*p_quantity; v_fee:=case when v_food>=499 then 0 when v_food>=299 then 29 else 49 end;
 insert into public.chalega_home_kitchen_orders(order_id,kitchen_id,item_id,customer_id,quantity,unit_price,food_total,delivery_fee,total,customer_name,customer_phone,delivery_address,delivery_area,delivery_pin,delivery_latitude,delivery_longitude)
 values(p_order_id,v_item.kitchen_id,v_item.id,auth.uid(),p_quantity,v_item.price,v_food,v_fee,v_food+v_fee,trim(p_customer_name),trim(p_customer_phone),trim(p_delivery_address),nullif(trim(p_delivery_area),''),nullif(trim(p_delivery_pin),''),p_delivery_latitude,p_delivery_longitude);
 update public.chalega_home_kitchen_items set quantity_available=quantity_available-p_quantity,status=case when quantity_available-p_quantity=0 then 'sold_out' else status end,updated_at=now() where id=v_item.id;
 return query select p_order_id,v_food+v_fee,v_fee,'pending'::text;
end $$;
revoke all on function public.create_chalega_home_kitchen_order(text,uuid,integer,text,text,text,text,text,double precision,double precision) from public,anon;
grant execute on function public.create_chalega_home_kitchen_order(text,uuid,integer,text,text,text,text,text,double precision,double precision) to authenticated;

create or replace function public.is_chalega_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.chalega_admins where user_id=auth.uid() and active=true) $$;
create or replace function public.get_admin_home_kitchens()
returns table(id uuid,user_id uuid,kitchen_name text,display_name text,locality text,city text,women_led boolean,fssai_status text,fssai_number text,hygiene_status text,status text,accepting_orders boolean,created_at timestamptz,item_count bigint)
language sql security definer set search_path=public as $$ select k.id,k.user_id,k.kitchen_name,k.display_name,k.locality,k.city,k.women_led,k.fssai_status,k.fssai_number,k.hygiene_status,k.status,k.accepting_orders,k.created_at,count(i.id)::bigint from public.chalega_home_kitchens k left join public.chalega_home_kitchen_items i on i.kitchen_id=k.id where public.is_chalega_admin() group by k.id order by k.created_at desc $$;
create or replace function public.set_admin_home_kitchen_status(p_kitchen_id uuid,p_status text,p_fssai_status text default null,p_hygiene_status text default null)
returns public.chalega_home_kitchens language plpgsql security definer set search_path=public as $$ declare v public.chalega_home_kitchens; begin if not public.is_chalega_admin() then raise exception 'Admin access required'; end if; update public.chalega_home_kitchens set status=p_status,fssai_status=coalesce(p_fssai_status,fssai_status),hygiene_status=coalesce(p_hygiene_status,hygiene_status),accepting_orders=(p_status='approved'),updated_at=now() where id=p_kitchen_id returning * into v; if not found then raise exception 'Kitchen not found'; end if; return v; end $$;
create or replace function public.get_admin_home_kitchen_items()
returns table(id uuid,kitchen_id uuid,kitchen_name text,title text,emoji text,category text,price numeric,unit text,quantity_available integer,status text,created_at timestamptz)
language sql security definer set search_path=public as $$ select i.id,i.kitchen_id,k.kitchen_name,i.title,i.emoji,i.category,i.price,i.unit,i.quantity_available,i.status,i.created_at from public.chalega_home_kitchen_items i join public.chalega_home_kitchens k on k.id=i.kitchen_id where public.is_chalega_admin() order by i.created_at desc $$;
create or replace function public.set_admin_home_kitchen_item_status(p_item_id uuid,p_status text)
returns public.chalega_home_kitchen_items language plpgsql security definer set search_path=public as $$ declare v public.chalega_home_kitchen_items; begin if not public.is_chalega_admin() then raise exception 'Admin access required'; end if; update public.chalega_home_kitchen_items set status=p_status,updated_at=now() where id=p_item_id returning * into v; if not found then raise exception 'Kitchen item not found'; end if; return v; end $$;

grant select on public.chalega_home_kitchens,public.chalega_home_kitchen_items to anon,authenticated;
grant select on public.chalega_home_kitchen_orders to authenticated;
grant insert,update on public.chalega_home_kitchens,public.chalega_home_kitchen_items to authenticated;
grant execute on function public.is_chalega_admin() to authenticated;
grant execute on function public.get_admin_home_kitchens() to authenticated;
grant execute on function public.set_admin_home_kitchen_status(uuid,text,text,text) to authenticated;
grant execute on function public.get_admin_home_kitchen_items() to authenticated;
grant execute on function public.set_admin_home_kitchen_item_status(uuid,text) to authenticated;
