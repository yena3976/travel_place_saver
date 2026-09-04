export type PlaceStatus = 'open' | 'temporarily_closed' | 'permanently_closed' | 'unknown';

export type PlaceInput = {
  name: string; category?: string | null; country?: string | null; countryCode?: string | null;
  city?: string | null; area?: string | null; address?: string | null; latitude?: number | null;
  longitude?: number | null; googlePlaceId?: string | null; googleMapsUrl?: string | null;
  status?: PlaceStatus; instagramReelUrl: string; instagramThumbnail?: string | null;
  sourceTitle?: string | null; sourceCaption?: string | null; confidence?: number | null;
};

export type RegionSummary = { region: string; country: string; count: number; thumbnailUrl: string | null };
export type SavedPlaceView = {
  id: string; placeId: string; name: string; category: string | null; country: string | null;
  city: string | null; area: string | null; thumbnailUrl: string | null;
  instagramUrl: string; googleMapsUrl: string | null;
};
