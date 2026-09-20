-- Chalega India
-- Secure KMC wards table grants
-- Created: 2026-09-16

-- KMC wards are a public reference/catalog table.
-- Normal users may only read active wards.

revoke insert, update, delete, truncate, trigger, references
on table public.kmc_wards
from anon, authenticated;
