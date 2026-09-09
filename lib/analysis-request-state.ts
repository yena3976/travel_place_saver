export type AnalysisPhase =
  | 'idle'
  | 'analyzing'
  | 'single'
  | 'candidates'
  | 'multiple'
  | 'not_found'
  | 'error';

export type AnalysisRequestState<T> = {
  phase: AnalysisPhase;
  requestId: string | null;
  analysisUrl: string | null;
  places: T[];
  result: T | null;
  message: string;
};

export function idleAnalysisRequest<T>(): AnalysisRequestState<T> {
  return {
    phase: 'idle',
    requestId: null,
    analysisUrl: null,
    places: [],
    result: null,
    message: '',
  };
}

export function startAnalysisRequest<T>(
  requestId: string,
  analysisUrl: string,
): AnalysisRequestState<T> {
  return {
    phase: 'analyzing',
    requestId,
    analysisUrl,
    places: [],
    result: null,
    message: '',
  };
}

export function resolveAnalysisRequest<T>(
  current: AnalysisRequestState<T>,
  requestId: string,
  next: Pick<
    AnalysisRequestState<T>,
    'phase' | 'places' | 'result' | 'message'
  >,
) {
  if (current.requestId !== requestId) return current;
  return { ...current, ...next };
}

export function isDuplicateAnalysisRequest<T>(
  current: AnalysisRequestState<T>,
  analysisUrl: string,
) {
  return current.phase === 'analyzing' && current.analysisUrl === analysisUrl;
}

export function analysisUrlLabel(value: string | null) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return `${url.hostname.replace(/^www\./u, '')}${url.pathname.replace(/\/$/u, '')}`;
  } catch {
    return value;
  }
}
