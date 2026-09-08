import type {
  MatchStatus,
  PlaceCategory,
  VerifiedPlace,
} from '../places/types';

export type ExtractedPlace = {
  name: string;
  searchName: string | null;
  country: string | null;
  city: string | null;
  area: string | null;
  category: PlaceCategory;
  confidence: number;
  evidence: string;
  source: 'caption' | 'video_text' | 'image_text' | 'both';
};

export type PlaceExtraction = {
  places: ExtractedPlace[];
  detectedLocation: {
    country: string | null;
    city: string | null;
    area: string | null;
  } | null;
};

export type AiUsage = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  durationMs: number;
};

export type ExtractPlacesResult = {
  extraction: PlaceExtraction;
  usage: AiUsage;
};

export type AnalyzedPlace = Omit<VerifiedPlace, 'googlePlaceId'> & {
  googlePlaceId: string | null;
  id: string;
  confidence: number;
  detectedPlaceName: string;
  googlePlaceName: string | null;
  matchStatus: MatchStatus;
  verificationScore: number;
  evidence: string;
  source: ExtractedPlace['source'];
};

export type ReelAnalysisResult = {
  analysisVersion: number;
  status: 'single' | 'candidates' | 'multiple' | 'not_found' | 'error';
  reel: {
    url: string;
    thumbnailUrl: string | null;
  };
  places: AnalyzedPlace[];
  cached: boolean;
  message?: string;
};
