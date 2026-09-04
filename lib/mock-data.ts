import type { PlaceInput } from '@/services/places/types';

export type AnalysisPlace = PlaceInput & { id: string; image: string };

export const featuredPlace: AnalysisPlace = {
  id: 'wyah-ubud', name: 'WYAH Art & Creative Space', category: 'Cafe', area: 'Ubud', city: 'Bali', country: 'Indonesia', countryCode: 'ID',
  address: 'Jl. RSI Markandya II, Ubud', latitude: -8.4739, longitude: 115.2551, googlePlaceId: 'mock_wyah_ubud',
  googleMapsUrl: 'https://maps.google.com/?q=WYAH+Art+Creative+Space+Bali', status: 'open',
  instagramReelUrl: 'https://www.instagram.com/reel/C8mockplace/', instagramThumbnail: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=85',
  sourceTitle: 'Ubud cafe worth saving', confidence: 0.94,
  image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=85',
};

export const analysisPlaces: AnalysisPlace[] = [
  featuredPlace,
  { ...featuredPlace, id: 'wapa-di-ume', name: 'Wapa di Ume Ubud', category: 'Hotel', googlePlaceId: 'mock_wapa_di_ume_ubud', googleMapsUrl: 'https://maps.google.com/?q=Wapa+di+Ume+Ubud', confidence: 0.88 },
];
