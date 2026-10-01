-- KMC ward assignment is server-authoritative.
-- Clients may not directly alter assigned ward/assembly fields.

REVOKE UPDATE (
  ward_id,
  ward_assignment_method,
  ward_assigned_at,
  assembly_id
) ON TABLE public.profiles FROM authenticated;
