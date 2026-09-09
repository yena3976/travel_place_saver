import 'server-only';
import { normalizeInstagramUrl } from '@/lib/instagram/normalizeInstagramUrl';
import { reelAnalysisModel } from '../ai/config';
import { AiProviderError, extractPlaces } from '../ai/extractPlaces';
import { mergePlaceExtraction } from '../ai/mergeExtraction';
import type { ReelAnalysisResult } from '../ai/types';
import { verifyPlace } from '../places/verifyPlace';
import {
  classifyVerifiedPlaces,
  normalizeAnalysisRegions,
  REEL_ANALYSIS_VERSION,
} from './classifyAnalysis';
import { getReelContent, ReelAccessError } from './getReelContent';
import { getPostImages } from './getPostImages';
import { getReelVideo } from './getReelVideo';
import {
  beginAnalysis,
  completeAnalysis,
  failAnalysis,
  findExistingAnalysis,
} from './repository';

export async function analyzeReel(value: string): Promise<ReelAnalysisResult> {
  const normalizedUrl = normalizeInstagramUrl(value);
  const existing = await findExistingAnalysis(normalizedUrl);
  if (existing?.result?.analysisVersion === REEL_ANALYSIS_VERSION)
    return normalizeAnalysisRegions({ ...existing.result, cached: true });
  const id = await beginAnalysis(normalizedUrl);
  let aiStarted = 0;
  try {
    const content = await getReelContent(normalizedUrl);
    let video = await getReelVideo(content.video);
    let images = video ? [] : await getPostImages(content.imageUrls);
    aiStarted = Date.now();
    const buildPrompt = () =>
      [
        `Instagram post title: ${content.title ?? 'unknown'}`,
        `Instagram post caption and metadata: ${content.caption}`,
        video
          ? 'Analyze only the sampled visual frames for video evidence. Ignore audio and speech.'
          : images.length
            ? `Analyze all ${images.length} supplied post images for visual evidence.`
            : 'No visual media is available. Analyze the caption only.',
      ].join('\n');
    let ai;
    try {
      ai = await extractPlaces(buildPrompt(), { video, images });
    } catch (error) {
      if (
        (!video && !images.length) ||
        (error instanceof AiProviderError &&
          (error.kind === 'config' || error.kind === 'quota'))
      )
        throw error;
      console.warn('instagram_visual_analysis_failed', {
        operation: video
          ? 'instagram_video_analysis'
          : 'instagram_image_analysis',
        frameCount: video?.frameCount ?? 0,
        imageCount: images.length,
      });
      video = null;
      images = [];
      ai = await extractPlaces(buildPrompt());
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
            name: place.name,
            alternateNames: place.searchName ? [place.searchName] : [],
            country: place.country,
            city: place.city,
            destination: place.city,
            area: place.area,
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
      operation: video
        ? 'instagram_caption_video_analysis'
        : images.length
          ? 'instagram_caption_image_analysis'
          : 'instagram_text_analysis',
      frameCount: video?.frameCount ?? 0,
      imageCount: images.length,
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
            : '이 인스타그램 게시물을 분석하지 못했어요. 다시 시도하거나 직접 검색해 주세요.',
    };
  }
}
