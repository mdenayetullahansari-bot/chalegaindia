-- Chalega India
-- Secure orders table grants
-- Created: 2026-09-16

-- Orders require authentication.
-- Normal users need only SELECT and INSERT.
-- RLS restricts both operations to the user's own orders.

revoke delete, update, truncate, trigger, references
on table public.orders
from anon, authenticated;
revoke select, insert
on table public.orders
from anon;
