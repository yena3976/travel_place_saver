import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { normalizeInstagramUrl } from '@/lib/instagram/normalizeInstagramUrl';
import { groupDestinations } from './groupDestinations';
import { normalizeDestination } from './normalizeDestination';
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
  destination?: string | null;
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
      'id, instagram_thumbnail, instagram_reel_url, places!inner(destination,country)',
    );
  if (error) throw error;
  const regions = groupDestinations(
    ((data ?? []) as JoinedRow[]).map((row) => ({
      destination: one(row.places)?.destination,
      country: one(row.places)?.country,
      thumbnailUrl: row.instagram_thumbnail,
    })),
  );
  return {
    total: data?.length ?? 0,
    regions,
  };
}

export async function getRegionPlaces(
  destination: string,
  country?: string | null,
): Promise<SavedPlaceView[]> {
  const db = createServerSupabaseClient();
  let query = db
    .from('saved_places')
    .select(
      'id, instagram_reel_url, instagram_thumbnail, places!inner(id,name,category,country,city,destination,area,google_maps_url)',
    )
    .eq('places.destination', destination);
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
      destination: place.destination ?? null,
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
    destination: data.destination,
    area: data.area,
    googleLocality: data.google_locality,
    googleAdminAreaLevel1: data.google_admin_area_level_1,
    googleAdminAreaLevel2: data.google_admin_area_level_2,
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
  const normalizedLocation = normalizeDestination({
    country: input.country,
    countryCode: input.countryCode,
    locality: input.googleLocality ?? input.city,
    adminArea1: input.googleAdminAreaLevel1,
    adminArea2: input.googleAdminAreaLevel2,
    fallbackArea: input.area,
  });
  const destination =
    input.destination ?? normalizedLocation.destination ?? input.city ?? null;
  const area = input.destination
    ? input.area
    : (normalizedLocation.area ?? input.area ?? null);
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
        destination,
        area,
        google_locality: input.googleLocality ?? null,
        google_admin_area_level_1: input.googleAdminAreaLevel1 ?? null,
        google_admin_area_level_2: input.googleAdminAreaLevel2 ?? null,
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
      region: destination ?? 'Unknown',
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
        region: destination ?? 'Unknown',
      };
    throw error;
  }
  return {
    status: 'saved' as const,
    savedPlaceId: data.id,
    region: destination ?? 'Unknown',
  };
}

export async function deleteSavedPlace(id: string) {
  const db = createServerSupabaseClient();
  const { error } = await db.from('saved_places').delete().eq('id', id);
  if (error) throw error;
}
