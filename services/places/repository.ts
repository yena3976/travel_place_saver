import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { normalizeInstagramUrl } from '@/lib/instagram/normalizeInstagramUrl';
import type {
  PlaceCategory,
  PlaceInput,
  PlaceStatus,
  RegionSummary,
  SavedPlaceView,
  VerifiedPlace,
} from './types';

type JoinedPlace = {
  id?: string;
  name?: string;
  category?: string | null;
  country?: string | null;
  city?: string | null;
  area?: string | null;
  google_maps_url?: string | null;
};
type JoinedRow = {
  id: string;
  instagram_reel_url: string;
  instagram_thumbnail: string | null;
  places: JoinedPlace | JoinedPlace[] | null;
};
const one = (value: JoinedRow['places']) =>
  Array.isArray(value) ? value[0] : value;

export async function getRegions(): Promise<{
  total: number;
  regions: RegionSummary[];
}> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('saved_places')
    .select(
      'id, instagram_thumbnail, instagram_reel_url, places!inner(city,country)',
    );
  if (error) throw error;
  const grouped = new Map<string, RegionSummary>();
  for (const row of (data ?? []) as JoinedRow[]) {
    const place = one(row.places);
    const region = place?.city ?? 'Unknown';
    const country = place?.country ?? 'Unknown';
    const key = `${region}\u0000${country}`;
    const current = grouped.get(key);
    if (current) current.count += 1;
    else
      grouped.set(key, {
        region,
        country,
        count: 1,
        thumbnailUrl: row.instagram_thumbnail,
      });
  }
  return {
    total: data?.length ?? 0,
    regions: [...grouped.values()].sort((a, b) =>
      a.region.localeCompare(b.region),
    ),
  };
}

export async function getRegionPlaces(
  region: string,
  country?: string | null,
): Promise<SavedPlaceView[]> {
  const db = createServerSupabaseClient();
  let query = db
    .from('saved_places')
    .select(
      'id, instagram_reel_url, instagram_thumbnail, places!inner(id,name,category,country,city,area,google_maps_url)',
    )
    .eq('places.city', region);
  if (country) query = query.eq('places.country', country);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as JoinedRow[]).map((row) => {
    const place = one(row.places)!;
    return {
      id: row.id,
      placeId: place.id ?? '',
      name: place.name ?? 'Unnamed place',
      category: place.category ?? null,
      country: place.country ?? null,
      city: place.city ?? null,
      area: place.area ?? null,
      thumbnailUrl: row.instagram_thumbnail,
      instagramUrl: row.instagram_reel_url,
      googleMapsUrl: place.google_maps_url ?? null,
    };
  });
}

export async function findDuplicatePlace(
  googlePlaceId: string | null | undefined,
) {
  if (!googlePlaceId) return null;
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('places')
    .select('id, saved_places(id)')
    .eq('google_place_id', googlePlaceId)
    .maybeSingle();
  if (error) throw error;
  const saved = data?.saved_places as { id: string }[] | undefined;
  return saved?.[0]?.id ?? null;
}

export async function findPlaceByGoogleId(
  googlePlaceId: string,
): Promise<VerifiedPlace | null> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('places')
    .select('*')
    .eq('google_place_id', googlePlaceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    name: data.name,
    category: (data.category ?? 'Other') as PlaceCategory,
    country: data.country,
    countryCode: data.country_code,
    city: data.city,
    area: data.area,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    googlePlaceId: data.google_place_id,
    googleMapsUrl: data.google_maps_url,
    status: (data.status ?? 'unknown') as PlaceStatus,
  };
}

export async function savePlace(input: PlaceInput) {
  const db = createServerSupabaseClient();
  const normalizedReelUrl = normalizeInstagramUrl(input.instagramReelUrl);
  let placeId: string | null = null;
  if (input.googlePlaceId) {
    const { data, error } = await db
      .from('places')
      .select('id')
      .eq('google_place_id', input.googlePlaceId)
      .maybeSingle();
    if (error) throw error;
    placeId = data?.id ?? null;
  }
  if (!placeId) {
    const { data, error } = await db
      .from('places')
      .insert({
        name: input.name,
        category: input.category ?? null,
        country: input.country ?? null,
        country_code: input.countryCode ?? null,
        city: input.city ?? null,
        area: input.area ?? null,
        address: input.address ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        google_place_id: input.googlePlaceId ?? null,
        google_maps_url: input.googleMapsUrl ?? null,
        status: input.status ?? 'unknown',
      })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505' && input.googlePlaceId) {
        const found = await db
          .from('places')
          .select('id')
          .eq('google_place_id', input.googlePlaceId)
          .single();
        if (found.error) throw found.error;
        placeId = found.data.id;
      } else throw error;
    } else placeId = data.id;
  }
  const { data: duplicate, error: duplicateError } = await db
    .from('saved_places')
    .select('id')
    .eq('place_id', placeId)
    .maybeSingle();
  if (duplicateError) throw duplicateError;
  if (duplicate)
    return {
      status: 'duplicate' as const,
      savedPlaceId: duplicate.id,
      region: input.city ?? 'Unknown',
    };
  const { data, error } = await db
    .from('saved_places')
    .insert({
      place_id: placeId,
      instagram_reel_url: input.instagramReelUrl,
      normalized_reel_url: normalizedReelUrl,
      instagram_thumbnail: input.instagramThumbnail ?? null,
      source_title: input.sourceTitle ?? null,
      source_caption: input.sourceCaption ?? null,
      confidence: input.confidence ?? null,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505')
      return {
        status: 'duplicate' as const,
        savedPlaceId: null,
        region: input.city ?? 'Unknown',
      };
    throw error;
  }
  return {
    status: 'saved' as const,
    savedPlaceId: data.id,
    region: input.city ?? 'Unknown',
  };
}

export async function deleteSavedPlace(id: string) {
  const db = createServerSupabaseClient();
  const { error } = await db.from('saved_places').delete().eq('id', id);
  if (error) throw error;
}
