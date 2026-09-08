import type { ReelContent } from './types.ts';

function decodeHtml(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function meta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      'i',
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      'i',
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1].trim());
  }
  return null;
}

export function parseReelHtml(url: string, html: string): ReelContent | null {
  const caption = meta(html, 'og:description') ?? meta(html, 'description');
  const title = meta(html, 'og:title');
  if (
    !caption ||
    /login • instagram|page isn't available/i.test(`${title} ${caption}`)
  )
    return null;
  return { url, title, caption, thumbnailUrl: meta(html, 'og:image') };
}
