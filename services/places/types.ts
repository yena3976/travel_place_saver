export type PlaceStatus =
  | 'open'
  | 'temporarily_closed'
  | 'permanently_closed'
  | 'unknown';

export type PlaceInput = {
  name: string;
  category?: string | null;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  destination?: string | null;
  area?: string | null;
  googleLocality?: string | null;
  googleAdminAreaLevel1?: string | null;
  googleAdminAreaLevel2?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  googleMapsUrl?: string | null;
  status?: PlaceStatus;
  instagramReelUrl: string;
  instagramThumbnail?: string | null;
  sourceTitle?: string | null;
  sourceCaption?: string | null;
  confidence?: number | null;
};

export type RegionSummary = {
  destination: string;
  country: string;
  count: number;
  thumbnailUrl: string | null;
};
export type SavedPlaceView = {
  id: string;
  placeId: string;
  name: string;
  category: string | null;
  country: string | null;
  city: string | null;
  destination: string | null;
  area: string | null;
  thumbnailUrl: string | null;
  instagramUrl: string;
  googleMapsUrl: string | null;
};

export type PlaceCategory =
  | 'Restaurant'
  | 'Cafe'
  | 'Bar'
  | 'Hotel'
  | 'Attraction'
  | 'Shopping'
  | 'Activity'
  | 'Nature'
  | 'Other';
export type PlaceSearchResult = {
  googlePlaceId: string;
  name: string;
  address: string | null;
  category: PlaceCategory;
  country: string | null;
  city: string | null;
  destination: string | null;
  area: string | null;
  googleLocality: string | null;
  googleAdminAreaLevel1: string | null;
  googleAdminAreaLevel2: string | null;
};
export type VerifiedPlace = Omit<PlaceInput, 'instagramReelUrl'> & {
  googlePlaceId: string;
  category: PlaceCategory;
};
export type VerificationInput = {
  name: string;
  country?: string | null;
  city?: string | null;
  area?: string | null;
};
export type MatchStatus = 'verified' | 'needs_confirmation' | 'not_found';
export type VerificationResult = {
  verified: boolean;
  matchStatus: MatchStatus;
  confidence: number;
  nameSimilarity: number;
  place: VerifiedPlace | null;
  candidates: PlaceSearchResult[];
};
