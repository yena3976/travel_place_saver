import type { InstagramImageInput } from './types.ts';

export const MAX_POST_IMAGES = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 24 * 1024 * 1024;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function bestImageUrl(media: JsonObject) {
  const versions = isObject(media.image_versions2)
    ? media.image_versions2
    : null;
  const candidates = Array.isArray(versions?.candidates)
    ? versions.candidates.filter(isObject)
    : [];
  const best = candidates.sort(
    (a, b) =>
      Number(b.width ?? 0) * Number(b.height ?? 0) -
      Number(a.width ?? 0) * Number(a.height ?? 0),
  )[0];
  if (typeof best?.url === 'string') return best.url;
  return typeof media.display_url === 'string' ? media.display_url : null;
}

function collectMediaImages(media: JsonObject) {
  const carousel = Array.isArray(media.carousel_media)
    ? media.carousel_media.filter(isObject)
    : [];
  const items = carousel.length ? carousel : [media];
  return items.flatMap((item) => {
    const url = bestImageUrl(item);
    return url ? [url] : [];
  });
}

function findPostMedia(value: unknown, shortcode: string): JsonObject | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPostMedia(item, shortcode);
      if (found) return found;
    }
    return null;
  }
  if (!isObject(value)) return null;
  if (
    (value.code === shortcode || value.shortcode === shortcode) &&
    (value.image_versions2 || value.carousel_media || value.display_url)
  )
    return value;
  for (const child of Object.values(value)) {
    const found = findPostMedia(child, shortcode);
    if (found) return found;
  }
  return null;
}

export function parsePostImageUrls(
  url: string,
  html: string,
  fallbackUrl?: string | null,
) {
  const shortcode = new URL(url).pathname.split('/').filter(Boolean)[1];
  const scriptBodies = [
    ...html.matchAll(
      /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  for (const match of scriptBodies) {
    try {
      const media = findPostMedia(JSON.parse(match[1]), shortcode);
      if (media) {
        const urls = [...new Set(collectMediaImages(media))];
        if (urls.length) return urls.slice(0, MAX_POST_IMAGES);
      }
    } catch {
      // Instagram may include unrelated script blocks that are not valid JSON.
    }
  }
  return fallbackUrl ? [fallbackUrl] : [];
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

export async function getPostImages(urls: string[]) {
  const images: InstagramImageInput[] = [];
  let totalBytes = 0;
  for (const url of urls.slice(0, MAX_POST_IMAGES)) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: 'image/*' },
      });
      const declaredSize = Number(response.headers.get('content-length') ?? 0);
      if (!response.ok || declaredSize > MAX_IMAGE_BYTES) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (
        !bytes.length ||
        bytes.length > MAX_IMAGE_BYTES ||
        totalBytes + bytes.length > MAX_TOTAL_IMAGE_BYTES
      )
        continue;
      const mimeType = response.headers.get('content-type')?.split(';')[0];
      if (!mimeType?.startsWith('image/')) continue;
      totalBytes += bytes.length;
      images.push({ data: bytesToBase64(bytes), mimeType });
    } catch {
      // A missing carousel image must not fail caption analysis.
    }
  }
  return images;
}
