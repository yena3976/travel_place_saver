export const reelAnalysisConfig = {
  defaultModel: 'gpt-4.1-mini',
  maxPlacesPerReel: 5,
  timeoutMs: 20_000,
  maxAttempts: 2,
  pricesPerMillionTokens: {
    'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  } as Record<string, { input: number; output: number }>,
};

export function reelAnalysisModel() {
  return (
    process.env.OPENAI_REEL_ANALYSIS_MODEL || reelAnalysisConfig.defaultModel
  );
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
) {
  const price = reelAnalysisConfig.pricesPerMillionTokens[model];
  if (!price) return 0;
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
}
