import type { AiUsage, ReelAnalysisResult } from '../ai/types';

export type ReelContent = {
  url: string;
  title: string | null;
  caption: string;
  thumbnailUrl: string | null;
  video: ReelVideoSource | null;
  imageUrls: string[];
};

export type ReelVideoSource = {
  videoUrl: string;
  durationMs: number | null;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

export type ReelVideoInput = {
  data: string;
  mimeType: string;
  durationMs: number | null;
  fps: number;
  frameCount: number;
};

export type InstagramImageInput = {
  data: string;
  mimeType: string;
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
