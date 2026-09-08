export type GoogleText = { text?: string; languageCode?: string };
export type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};
export type GooglePlace = {
  id?: string;
  displayName?: GoogleText;
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
};
