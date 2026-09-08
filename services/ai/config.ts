export const reelAnalysisConfig = {
  defaultModel: 'gemini-3.5-flash-lite',
  maxPlacesPerReel: 5,
  timeoutMs: 20_000,
  maxAttempts: 2,
  pricesPerMillionTokens: {
    'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
  } as Record<string, { input: number; output: number }>,
};

export function reelAnalysisModel() {
  return (
    process.env.GEMINI_REEL_ANALYSIS_MODEL || reelAnalysisConfig.defaultModel
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
