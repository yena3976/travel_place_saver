import { createClient } from '@supabase/supabase-js';
import { normalizeRegion } from '../services/places/normalizeRegion.ts';

process.loadEnvFile?.('.env.local');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey)
  throw new Error('Supabase server environment variables are required.');

const db = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type PlaceRow = {
  id: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  destination: string | null;
  area: string | null;
  address: string | null;
  google_formatted_address: string | null;
  google_locality: string | null;
  google_sublocality: string | null;
  google_neighborhood: string | null;
  google_admin_area_level_1: string | null;
  google_admin_area_level_2: string | null;
  google_route: string | null;
};

const { data, error } = await db
  .from('places')
  .select(
    'id,country,country_code,city,destination,area,address,google_formatted_address,google_locality,google_sublocality,google_neighborhood,google_admin_area_level_1,google_admin_area_level_2,google_route',
  );
if (error) throw error;

const isLegacyRoute = (value?: string | null) =>
  Boolean(
    value &&
    (/(?:^|[-\s])(?:road|street|st|rd|route)$/iu.test(value) ||
      /-(?:ro|gil)$/iu.test(value) ||
      /(?:로|길)$/u.test(value)),
  );

let updated = 0;
for (const row of (data ?? []) as PlaceRow[]) {
  const googleRoute =
    row.google_route ?? (isLegacyRoute(row.area) ? row.area : null);
  const googleFormattedAddress =
    row.google_formatted_address ?? row.address ?? null;
  const normalized = normalizeRegion({
    country: row.country,
    countryCode: row.country_code,
    locality: row.google_locality ?? row.city,
    adminArea1: row.google_admin_area_level_1,
    adminArea2: row.google_admin_area_level_2,
    neighborhood: row.google_neighborhood,
    sublocality1: row.google_sublocality,
    route: googleRoute,
    formattedAddress: googleFormattedAddress,
    fallbackArea: row.area,
  });
  const { error: updateError } = await db
    .from('places')
    .update({
      country: normalized.country ?? row.country,
      destination: normalized.destination ?? row.destination ?? row.city,
      area: normalized.area,
      google_formatted_address: googleFormattedAddress,
      google_route: googleRoute,
    })
    .eq('id', row.id);
  if (updateError) throw updateError;
  updated += 1;
}

console.info(`Normalized ${updated} saved place rows.`);
