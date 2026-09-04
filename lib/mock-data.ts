export type Place = {
  id: string; name: string; category: string; area: string; city: string; country: string;
  image: string; instagramUrl: string; mapsUrl: string;
};

export const featuredPlace: Place = {
  id: 'wyah-ubud', name: 'WYAH Art & Creative Space', category: 'Cafe', area: 'Ubud', city: 'Bali', country: 'Indonesia',
  image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=85',
  instagramUrl: 'https://www.instagram.com/reel/C8mockplace/', mapsUrl: 'https://maps.google.com/?q=WYAH+Art+Creative+Space+Bali',
};

export const mockRegions = [
  { name: 'Bali', country: 'Indonesia', count: 12, image: featuredPlace.image },
  { name: 'Tokyo', country: 'Japan', count: 8, image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=400&q=80' },
  { name: 'Bangkok', country: 'Thailand', count: 5, image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=400&q=80' },
];

export const baliPlaces: Place[] = [
  featuredPlace,
  { ...featuredPlace, id: 'cretya', name: 'Cretya Ubud', category: 'Attraction', image: 'https://images.unsplash.com/photo-1533669955142-6a73332af4db?auto=format&fit=crop&w=700&q=80' },
  { ...featuredPlace, id: 'potato-head', name: 'Potato Head Beach Club', category: 'Bar', area: 'Seminyak', image: 'https://images.unsplash.com/photo-1539367628448-4bc5c9d171c8?auto=format&fit=crop&w=700&q=80' },
];
