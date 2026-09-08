import type { ReelVideoInput, ReelVideoSource } from './types.ts';

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const MAX_VIDEO_FRAMES = 18;

function decodeEmbeddedMarkup(html: string) {
  return html
    .replace(/\\u003C/gi, '<')
    .replace(/\\u003E/gi, '>')
    .replace(/\\u0026/gi, '&')
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, '&');
}

function numberAttribute(attributes: string, name: string) {
  const value = attributes.match(new RegExp(`${name}="(\\d+)"`, 'i'))?.[1];
  return value ? Number(value) : null;
}

export function parseReelVideoSource(
  html: string,
  thumbnailUrl?: string | null,
): ReelVideoSource | null {
  const markup = decodeEmbeddedMarkup(html);
  const durationSeconds = Number(
    markup.match(/mediaPresentationDuration="PT([\d.]+)S"/i)?.[1] ?? NaN,
  );
  const representations = [...markup.matchAll(/<Representation\b([^>]*)>([\s\S]*?)<\/Representation>/gi)]
    .flatMap((match) => {
      const attributes = match[1];
      if (!/mimeType="video\/mp4"/i.test(attributes)) return [];
      const videoUrl = match[2].match(/<BaseURL>(https?:\/\/[^<]+)<\/BaseURL>/i)?.[1];
      if (!videoUrl) return [];
      return [{
        videoUrl,
        durationMs: Number.isFinite(durationSeconds)
          ? Math.round(durationSeconds * 1000)
          : null,
        thumbnailUrl,
        width: numberAttribute(attributes, 'width'),
        height: numberAttribute(attributes, 'height'),
      }];
    })
    .sort((a, b) => (b.width ?? 0) * (b.height ?? 0) - (a.width ?? 0) * (a.height ?? 0));
  return representations[0] ?? null;
}

export function videoSampling(durationMs: number | null) {
  if (!durationMs || durationMs <= 0)
    return { fps: 0.25, frameCount: MAX_VIDEO_FRAMES };
  const seconds = durationMs / 1000;
  const fps = Math.min(1, MAX_VIDEO_FRAMES / seconds);
  return {
    fps: Math.round(fps * 1000) / 1000,
    frameCount: Math.min(MAX_VIDEO_FRAMES, Math.max(1, Math.ceil(seconds * fps))),
  };
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

export async function getReelVideo(
  source: ReelVideoSource | null,
): Promise<ReelVideoInput | null> {
  if (!source) return null;
  try {
    const response = await fetch(source.videoUrl, {
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'video/mp4,video/*' },
    });
    const declaredSize = Number(response.headers.get('content-length') ?? 0);
    if (!response.ok || declaredSize > MAX_VIDEO_BYTES) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_VIDEO_BYTES) return null;
    const sampling = videoSampling(source.durationMs);
    return {
      data: bytesToBase64(bytes),
      mimeType: response.headers.get('content-type')?.split(';')[0] || 'video/mp4',
      durationMs: source.durationMs,
      ...sampling,
    };
  } catch {
    return null;
  }
}
