alter table public.kmc_wards
  add column if not exists north_boundary text,
  add column if not exists south_boundary text,
  add column if not exists east_boundary text,
  add column if not exists west_boundary text,
  add column if not exists source_pdf_page integer,
  add column if not exists boundary_text_raw text,
  add column if not exists boundary_source_document text;

comment on column public.kmc_wards.north_boundary is 'Draft Schedule II north boundary description; not GIS geometry.';
comment on column public.kmc_wards.south_boundary is 'Draft Schedule II south boundary description; not GIS geometry.';
comment on column public.kmc_wards.east_boundary is 'Draft Schedule II east boundary description; not GIS geometry.';
comment on column public.kmc_wards.west_boundary is 'Draft Schedule II west boundary description; not GIS geometry.';
comment on column public.kmc_wards.boundary_text_raw is 'Raw source transcription retained for auditability.';
comment on column public.kmc_wards.boundary_source_document is 'Source document/version for the textual boundary description.';
