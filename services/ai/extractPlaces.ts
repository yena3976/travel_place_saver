import 'server-only';
import { estimateCost, reelAnalysisConfig, reelAnalysisModel } from './config';
import { parsePlaceExtraction, placeExtractionSchema } from './schemas';
import type { ExtractPlacesResult } from './types';
import type { InstagramImageInput, ReelVideoInput } from '../reels/types';

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
};

export class AiProviderError extends Error {
  constructor(public kind: 'config' | 'quota' | 'temporary' | 'invalid') {
    super(
      kind === 'config'
        ? 'Gemini 분석 설정이 필요해요.'
        : kind === 'quota'
          ? 'Gemini 사용 한도에 도달했어요. API 프로젝트의 할당량을 확인해 주세요.'
          : 'AI 분석에 실패했어요.',
    );
  }
}

function responseText(data: GeminiResponse) {
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('');
}

export async function extractPlaces(
  content: string,
  media?: {
    video?: ReelVideoInput | null;
    images?: InstagramImageInput[];
  },
): Promise<ExtractPlacesResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiProviderError('config');
  const model = reelAnalysisModel();
  const started = Date.now();
  let lastError: unknown;
  for (
    let attempt = 0;
    attempt < reelAnalysisConfig.maxAttempts;
    attempt += 1
  ) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': key,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(reelAnalysisConfig.timeoutMs),
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: `Extract only explicitly supported real travel venues from the supplied Instagram caption and visual media. Return all distinct cafes, restaurants, shops, hotels, attractions, or activities in one response, up to ${reelAnalysisConfig.maxPlacesPerReel}. Read image and video overlays, signs, location stickers, and map labels, including small Korean or Latin-script text. Do not treat a broad neighborhood or city such as Seochon or Seoul as a visitable venue: put it in detectedLocation and use it as the location hint for actual venues. Mark each venue source as caption, video_text, image_text, or both, and deduplicate venues seen in multiple inputs. Ignore ordinary text unrelated to places and do not use audio or speech as evidence. Never invent a place. For searchName, provide the official Latin-script or Google Maps-friendly name when known; otherwise repeat the visible name. Use null for unknown locations and lower confidence when evidence is weak.`,
                },
              ],
            },
            contents: [
              {
                role: 'user',
                parts: [
                  ...(media?.video
                    ? [
                        {
                          inlineData: {
                            data: media.video.data,
                            mimeType: media.video.mimeType,
                          },
                          videoMetadata: { fps: media.video.fps },
                        },
                      ]
                    : []),
                  ...(media?.images ?? []).map((image) => ({
                    inlineData: image,
                  })),
                  { text: content.slice(0, 12_000) },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 1200,
              responseFormat: {
                text: {
                  mimeType: 'APPLICATION_JSON',
                  schema: placeExtractionSchema,
                },
              },
            },
          }),
        },
      );
      if (!response.ok) {
        console.error('gemini_response_rejected', {
          httpStatus: response.status,
        });
        if (
          (response.status === 429 || response.status >= 500) &&
          attempt === 0
        ) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          continue;
        }
        throw new AiProviderError(
          response.status === 429
            ? 'quota'
            : response.status >= 500
              ? 'temporary'
              : 'invalid',
        );
      }
      const data = (await response.json()) as GeminiResponse;
      const outputText = responseText(data);
      if (!outputText) {
        console.error('gemini_response_rejected', {
          finishReason: data.candidates?.[0]?.finishReason ?? 'missing',
        });
        throw new AiProviderError('invalid');
      }
      const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens =
        (data.usageMetadata?.candidatesTokenCount ?? 0) +
        (data.usageMetadata?.thoughtsTokenCount ?? 0);
      return {
        extraction: parsePlaceExtraction(JSON.parse(outputText)),
        usage: {
          model,
          inputTokens,
          outputTokens,
          totalTokens:
            data.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens,
          estimatedCost: estimateCost(model, inputTokens, outputTokens),
          durationMs: Date.now() - started,
        },
      };
    } catch (error) {
      lastError = error;
      if (error instanceof AiProviderError && error.kind !== 'temporary')
        throw error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
    }
  }
  throw lastError instanceof AiProviderError
    ? lastError
    : new AiProviderError('temporary');
}
