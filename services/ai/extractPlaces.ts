import 'server-only';
import { estimateCost, reelAnalysisConfig, reelAnalysisModel } from './config';
import { parsePlaceExtraction, placeExtractionSchema } from './schemas';
import type { ExtractPlacesResult } from './types';

type OpenAIResponse = {
  status?: string;
  error?: { code?: string } | null;
  incomplete_details?: { reason?: string } | null;
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
};

function responseText(data: OpenAIResponse) {
  if (data.output_text) return data.output_text;
  return (data.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text ?? '')
    .join('');
}

export class AiProviderError extends Error {
  constructor(public kind: 'config' | 'quota' | 'temporary' | 'invalid') {
    super(
      kind === 'config'
        ? 'AI analysis is not configured.'
        : kind === 'quota'
          ? 'OpenAI usage limit reached. Check project billing or quota.'
          : 'AI analysis failed.',
    );
  }
}

export async function extractPlaces(
  content: string,
): Promise<ExtractPlacesResult> {
  const key = process.env.OPENAI_API_KEY;
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
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(reelAnalysisConfig.timeoutMs),
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: 1200,
          instructions: `Extract only explicitly supported real travel places from Instagram Reel metadata. Return all places in one response, up to ${reelAnalysisConfig.maxPlacesPerReel}. Never invent a place. Use null for unknown locations and lower confidence when evidence is weak.`,
          input: content.slice(0, 12_000),
          text: {
            format: {
              type: 'json_schema',
              name: 'reel_places',
              strict: true,
              schema: placeExtractionSchema,
            },
          },
        }),
      });
      if (!response.ok) {
        console.error('openai_response_rejected', {
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
      const data = (await response.json()) as OpenAIResponse;
      const outputText = responseText(data);
      if (data.status !== 'completed' || !outputText) {
        console.error('openai_response_rejected', {
          responseStatus: data.status ?? 'missing',
          errorCode: data.error?.code ?? null,
          incompleteReason: data.incomplete_details?.reason ?? null,
          hasOutputText: Boolean(outputText),
        });
        throw new AiProviderError('invalid');
      }
      const inputTokens = data.usage?.input_tokens ?? 0;
      const outputTokens = data.usage?.output_tokens ?? 0;
      return {
        extraction: parsePlaceExtraction(JSON.parse(outputText)),
        usage: {
          model,
          inputTokens,
          outputTokens,
          totalTokens: data.usage?.total_tokens ?? inputTokens + outputTokens,
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
