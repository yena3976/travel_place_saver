import 'server-only';
import { normalizeReelUrl } from '@/lib/reels/normalizeReelUrl';
import { reelAnalysisModel } from '../ai/config';
import { extractPlaces } from '../ai/extractPlaces';
import type { ReelAnalysisResult } from '../ai/types';
import { verifyPlace } from '../places/verifyPlace';
import { classifyVerifiedPlaces } from './classifyAnalysis';
import { getReelContent, ReelAccessError } from './getReelContent';
import {
  beginAnalysis,
  completeAnalysis,
  failAnalysis,
  findExistingAnalysis,
} from './repository';

export async function analyzeReel(value: string): Promise<ReelAnalysisResult> {
  const normalizedUrl = normalizeReelUrl(value);
  const existing = await findExistingAnalysis(normalizedUrl);
  if (existing?.result) return { ...existing.result, cached: true };
  const id = await beginAnalysis(normalizedUrl);
  let aiStarted = 0;
  try {
    const content = await getReelContent(normalizedUrl);
    aiStarted = Date.now();
    const ai = await extractPlaces(
      [
        `Reel title: ${content.title ?? 'unknown'}`,
        `Reel caption and metadata: ${content.caption}`,
      ].join('\n'),
    );
    const reel = { url: normalizedUrl, thumbnailUrl: content.thumbnailUrl };
    let result: ReelAnalysisResult;
    if (!ai.extraction.places.length) {
      result = { status: 'not_found', reel, places: [], cached: false };
    } else {
      const extracted = ai.extraction.places.slice(0, 5);
      const verified = await Promise.all(
        extracted.map((place) => verifyPlace(place)),
      );
      result = classifyVerifiedPlaces(reel, extracted, verified);
    }
    await completeAnalysis(id, {
      sourceCaption: content.caption,
      result,
      usage: ai.usage,
    });
    console.info('ai_usage', {
      provider: 'gemini',
      model: ai.usage.model,
      inputTokens: ai.usage.inputTokens,
      outputTokens: ai.usage.outputTokens,
      totalTokens: ai.usage.totalTokens,
      estimatedCost: ai.usage.estimatedCost,
      success: true,
      durationMs: ai.usage.durationMs,
      createdAt: new Date().toISOString(),
    });
    return result;
  } catch (error) {
    const code =
      error instanceof ReelAccessError ? 'reel_access' : 'analysis_failed';
    await failAnalysis(
      id,
      code,
      aiStarted
        ? {
            model: reelAnalysisModel(),
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
            durationMs: Date.now() - aiStarted,
          }
        : undefined,
    );
    console.error('ai_usage', {
      provider: 'gemini',
      success: false,
      errorCode: code,
      createdAt: new Date().toISOString(),
    });
    return {
      status: 'error',
      reel: { url: normalizedUrl, thumbnailUrl: null },
      places: [],
      cached: false,
      message:
        error instanceof ReelAccessError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'We could not analyze this Reel. Please try again or search manually.',
    };
  }
}
