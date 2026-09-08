import 'server-only';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { AiUsage, ReelAnalysisResult } from '../ai/types';
import type { CompleteAnalysisInput, StoredReelAnalysis } from './types';

function mapRow(row: Record<string, unknown>): StoredReelAnalysis {
  return {
    id: row.id as string,
    normalizedUrl: row.normalized_reel_url as string,
    status: row.status as StoredReelAnalysis['status'],
    result: (row.analysis_result as ReelAnalysisResult | null) ?? null,
  };
}

export async function findExistingAnalysis(normalizedUrl: string) {
  const { data, error } = await createServerSupabaseClient()
    .from('reel_analyses')
    .select('id, normalized_reel_url, status, analysis_result')
    .eq('normalized_reel_url', normalizedUrl)
    .in('status', ['completed', 'not_found'])
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function beginAnalysis(normalizedUrl: string) {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('reel_analyses')
    .upsert(
      {
        normalized_reel_url: normalizedUrl,
        status: 'processing',
        analysis_result: null,
        error_code: null,
      },
      { onConflict: 'normalized_reel_url' },
    )
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function completeAnalysis(
  id: string,
  input: CompleteAnalysisInput,
) {
  const { usage, result } = input;
  const { error } = await createServerSupabaseClient()
    .from('reel_analyses')
    .update({
      status: result.status === 'not_found' ? 'not_found' : 'completed',
      source_caption: input.sourceCaption,
      analysis_result: result,
      ai_model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      total_tokens: usage.totalTokens,
      estimated_cost: usage.estimatedCost,
      ai_duration_ms: usage.durationMs,
      error_code: null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function failAnalysis(
  id: string,
  errorCode: string,
  usage?: Partial<AiUsage>,
) {
  const { error } = await createServerSupabaseClient()
    .from('reel_analyses')
    .update({
      status: 'failed',
      error_code: errorCode,
      ai_model: usage?.model ?? null,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
      total_tokens: usage?.totalTokens ?? null,
      estimated_cost: usage?.estimatedCost ?? null,
      ai_duration_ms: usage?.durationMs ?? null,
    })
    .eq('id', id);
  if (error) console.error('reel_analysis_failure_log_failed');
}
