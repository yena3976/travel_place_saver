import type { MatchStatus } from '../services/places/types.ts';

type SelectablePlace = {
  id?: string | null;
  googlePlaceId?: string | null;
  name: string;
  matchStatus?: MatchStatus;
};

export function resultPlaceId(place: SelectablePlace) {
  return place.id ?? place.googlePlaceId ?? place.name;
}

export function canSelectResult(place: SelectablePlace) {
  return place.matchStatus !== 'not_found';
}

export function defaultSelectedResultIds(places: SelectablePlace[]) {
  return places
    .filter((place) => place.matchStatus === 'verified')
    .map(resultPlaceId);
}
