-- Chalega India
-- Secure payment records table grants
-- Created: 2026-09-16

-- Payment records are server-controlled.
-- Authenticated users only need to view their own payment records.
-- The existing RLS policy enforces ownership through the linked order.

revoke insert, update, delete, truncate, trigger, references
on table public.payment_records
from anon, authenticated;
revoke select
on table public.payment_records
from anon;
