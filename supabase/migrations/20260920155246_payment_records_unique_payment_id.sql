-- Chalega India
-- Protect Razorpay payment replay/concurrency
-- Created: 2026-09-20

create unique index if not exists payment_records_razorpay_payment_id_key
on public.payment_records (razorpay_payment_id)
where razorpay_payment_id is not null;
