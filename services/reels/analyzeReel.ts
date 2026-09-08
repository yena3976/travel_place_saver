import 'server-only';
import { normalizeReelUrl } from '@/lib/reels/normalizeReelUrl';
import { reelAnalysisModel } from '../ai/config';
import { AiProviderError, extractPlaces } from '../ai/extractPlaces';
import { mergePlaceExtraction } from '../ai/mergeExtraction';
import type { ReelAnalysisResult } from '../ai/types';
import { verifyPlace } from '../places/verifyPlace';
import {
  classifyVerifiedPlaces,
  REEL_ANALYSIS_VERSION,
} from './classifyAnalysis';
import { getReelContent, ReelAccessError } from './getReelContent';
import { getReelVideo } from './getReelVideo';
import {
  beginAnalysis,
  completeAnalysis,
  failAnalysis,
  findExistingAnalysis,
} from './repository';

export async function analyzeReel(value: string): Promise<ReelAnalysisResult> {
  const normalizedUrl = normalizeReelUrl(value);
  const existing = await findExistingAnalysis(normalizedUrl);
  if (existing?.result?.analysisVersion === REEL_ANALYSIS_VERSION)
    return { ...existing.result, cached: true };
  const id = await beginAnalysis(normalizedUrl);
  let aiStarted = 0;
  try {
    const content = await getReelContent(normalizedUrl);
    let video = await getReelVideo(content.video);
    aiStarted = Date.now();
    const prompt = [
      `Reel title: ${content.title ?? 'unknown'}`,
      `Reel caption and metadata: ${content.caption}`,
      video
        ? 'Analyze only the sampled visual frames for video evidence. Ignore audio and speech.'
        : 'No video frames are available. Analyze the caption only.',
    ].join('\n');
    let ai;
    try {
      ai = await extractPlaces(prompt, video);
    } catch (error) {
      if (
        !video ||
        (error instanceof AiProviderError &&
          (error.kind === 'config' || error.kind === 'quota'))
      )
        throw error;
      console.warn('reel_video_analysis_failed', {
        operation: 'reel_video_analysis',
        frameCount: video.frameCount,
      });
      video = null;
      ai = await extractPlaces(
        prompt.replace(
          'Analyze only the sampled visual frames for video evidence. Ignore audio and speech.',
          'No video frames are available. Analyze the caption only.',
        ),
        null,
      );
    }
    const extraction = mergePlaceExtraction(ai.extraction);
    const reel = { url: normalizedUrl, thumbnailUrl: content.thumbnailUrl };
    let result: ReelAnalysisResult;
    if (!extraction.places.length) {
      result = {
        analysisVersion: REEL_ANALYSIS_VERSION,
        status: 'not_found',
        reel,
        places: [],
        cached: false,
      };
    } else {
      const extracted = extraction.places.slice(0, 5);
      console.info('reel_extraction', {
        count: extracted.length,
        places: extracted.map((place) => ({
          name: place.name,
          searchName: place.searchName,
          confidence: place.confidence,
        })),
      });
      const verified = await Promise.all(
        extracted.map((place) =>
          verifyPlace({
            ...place,
            name: place.searchName ?? place.name,
          }),
        ),
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
      operation: video ? 'reel_caption_video_analysis' : 'reel_text_analysis',
      frameCount: video?.frameCount ?? 0,
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
      analysisVersion: REEL_ANALYSIS_VERSION,
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
