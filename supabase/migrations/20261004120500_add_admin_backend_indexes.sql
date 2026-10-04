create index if not exists idx_orders_user_created_at on public.orders(user_id, created_at desc);
create index if not exists idx_orders_payment_status_created_at on public.orders(payment_status, created_at desc);
create index if not exists idx_delivery_jobs_order_id on public.chalega_delivery_jobs(order_id);
create index if not exists idx_delivery_jobs_status_created_at on public.chalega_delivery_jobs(status, created_at desc);
create index if not exists idx_delivery_payouts_partner_status on public.chalega_delivery_payouts(partner_id, status);
create index if not exists idx_delivery_partners_status_availability on public.chalega_delivery_partners(status, availability);
create index if not exists idx_partner_applications_status_created_at on public.chalega_partner_applications(status, created_at desc);
