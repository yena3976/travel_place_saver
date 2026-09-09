alter table public.places
  add column if not exists google_formatted_address text,
  add column if not exists google_sublocality text,
  add column if not exists google_neighborhood text,
  add column if not exists google_route text;

-- Preserve the formatted Google address independently from Korean UI grouping.
update public.places
set google_formatted_address = address
where google_formatted_address is null and address is not null;
