import 'server-only';
import { estimateCost, reelAnalysisConfig, reelAnalysisModel } from './config';
import { parsePlaceExtraction, placeExtractionSchema } from './schemas';
import type { ExtractPlacesResult } from './types';

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
        ? 'Gemini analysis is not configured.'
        : kind === 'quota'
          ? 'Gemini usage limit reached. Check the API project quota.'
          : 'AI analysis failed.',
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
                  text: `Extract only explicitly supported real travel places from Instagram Reel metadata. Return all places in one response, up to ${reelAnalysisConfig.maxPlacesPerReel}. Never invent a place. Use null for unknown locations and lower confidence when evidence is weak.`,
                },
              ],
            },
            contents: [
              { role: 'user', parts: [{ text: content.slice(0, 12_000) }] },
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
