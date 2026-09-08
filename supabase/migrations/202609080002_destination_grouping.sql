alter table public.places
  add column if not exists destination text,
  add column if not exists google_locality text,
  add column if not exists google_admin_area_level_1 text,
  add column if not exists google_admin_area_level_2 text;

-- Preserve the best legacy locality available before normalizing the UI grouping.
update public.places
set google_locality = coalesce(google_locality, city)
where google_locality is null and city is not null;

-- Tokyo special wards belong to the Tokyo travel destination. Existing detailed
-- areas are retained for rows already stored as Tokyo; ward-like legacy cities
-- become their ward area.
update public.places
set destination = 'Tokyo',
    area = case
      when lower(regexp_replace(coalesce(city, ''), '\s+(City|Ward)$', '', 'i')) in (
        'adachi','arakawa','bunkyo','chiyoda','chuo','edogawa','itabashi',
        'katsushika','kita','koto','meguro','minato','nakano','nerima','ota',
        'setagaya','shibuya','shinagawa','shinjuku','suginami','sumida','taito','toshima'
      ) then regexp_replace(city, '\s+(City|Ward)$', '', 'i')
      else area
    end
where upper(coalesce(country_code, '')) = 'JP'
  and (
    lower(coalesce(city, '')) = 'tokyo'
    or lower(regexp_replace(coalesce(city, ''), '\s+(City|Ward)$', '', 'i')) in (
      'adachi','arakawa','bunkyo','chiyoda','chuo','edogawa','itabashi',
      'katsushika','kita','koto','meguro','minato','nakano','nerima','ota',
      'setagaya','shibuya','shinagawa','shinjuku','suginami','sumida','taito','toshima'
    )
    or lower(coalesce(address, '')) like '%tokyo%'
  );

update public.places
set destination = 'Seoul',
    area = coalesce(
      area,
      nullif(regexp_replace(city, '(-gu|\s+District)$', '', 'i'), 'Seoul')
    )
where upper(coalesce(country_code, '')) = 'KR'
  and (
    lower(coalesce(city, '')) like '%seoul%'
    or lower(coalesce(address, '')) like '%seoul%'
  );

update public.places
set destination = 'Bali',
    area = case
      when lower(coalesce(city, '')) in
        ('ubud','seminyak','canggu','kuta','legian','sanur','nusa dua','uluwatu','jimbaran')
        then initcap(city)
      else area
    end
where upper(coalesce(country_code, '')) = 'ID'
  and (
    lower(coalesce(city, '')) = 'bali'
    or lower(coalesce(city, '')) in
      ('ubud','seminyak','canggu','kuta','legian','sanur','nusa dua','uluwatu','jimbaran')
    or lower(coalesce(address, '')) like '%bali%'
  );

-- Conservative fallback: preserve the old city label when no exception applies.
update public.places
set destination = coalesce(destination, city, google_admin_area_level_1)
where destination is null;

create index if not exists places_destination_idx
  on public.places (destination, country);
create index if not exists places_destination_area_idx
  on public.places (destination, country, area);
