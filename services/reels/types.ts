import type { AiUsage, ReelAnalysisResult } from '../ai/types';

export type ReelContent = {
  url: string;
  title: string | null;
  caption: string;
  thumbnailUrl: string | null;
};

export type StoredReelAnalysis = {
  id: string;
  normalizedUrl: string;
  status: 'processing' | 'completed' | 'not_found' | 'failed';
  result: ReelAnalysisResult | null;
};

export type CompleteAnalysisInput = {
  sourceCaption: string | null;
  result: ReelAnalysisResult;
  usage: AiUsage;
};
