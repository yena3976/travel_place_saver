import 'server-only';
import { normalizeReelUrl } from '@/lib/reels/normalizeReelUrl';
import { parseReelHtml } from './reelMetadata';
import type { ReelContent } from './types';

export class ReelAccessError extends Error {
  constructor() {
    super('This Reel is private, deleted, or unavailable.');
  }
}

export async function getReelContent(value: string): Promise<ReelContent> {
  const url = normalizeReelUrl(value);
  let response: Response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ReelPlaceSaver/0.1)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  } catch {
    throw new ReelAccessError();
  }
  if (!response.ok) throw new ReelAccessError();
  const content = parseReelHtml(url, await response.text());
  if (!content) throw new ReelAccessError();
  return content;
}
