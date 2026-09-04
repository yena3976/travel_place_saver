create extension if not exists pgcrypto;

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  country text,
  country_code text,
  city text,
  area text,
  address text,
  latitude numeric,
  longitude numeric,
  google_place_id text unique,
  google_maps_url text,
  status text not null default 'unknown' check (status in ('open','temporarily_closed','permanently_closed','unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null unique references public.places(id) on delete restrict,
  instagram_reel_url text not null,
  normalized_reel_url text not null,
  instagram_thumbnail text,
  source_title text,
  source_caption text,
  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now()
);

create index if not exists places_region_idx on public.places (city, country);
create index if not exists places_area_idx on public.places (city, country, area);
create index if not exists saved_places_normalized_reel_url_idx on public.saved_places (normalized_reel_url);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at before update on public.places for each row execute function public.set_updated_at();

alter table public.places enable row level security;
alter table public.saved_places enable row level security;

revoke all on table public.places from anon, authenticated;
revoke all on table public.saved_places from anon, authenticated;
grant select, insert, update, delete on table public.places to service_role;
grant select, insert, update, delete on table public.saved_places to service_role;
