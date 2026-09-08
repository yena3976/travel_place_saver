import type { PlaceCategory, VerifiedPlace } from '../places/types';

export type ExtractedPlace = {
  name: string;
  country: string | null;
  city: string | null;
  area: string | null;
  category: PlaceCategory;
  confidence: number;
  evidence: string;
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

export type AnalyzedPlace = VerifiedPlace & {
  id: string;
  confidence: number;
  evidence: string;
};

export type ReelAnalysisResult = {
  status: 'single' | 'candidates' | 'multiple' | 'not_found' | 'error';
  reel: {
    url: string;
    thumbnailUrl: string | null;
  };
  places: AnalyzedPlace[];
  cached: boolean;
  message?: string;
};
