const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);

export function normalizeReelUrl(value: string): string {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('Invalid Instagram Reel URL.'); }
  if (url.protocol !== 'https:' || !INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())) throw new Error('Invalid Instagram Reel URL.');
  const match = url.pathname.match(/^\/(?:reel|reels)\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) throw new Error('Invalid Instagram Reel URL.');
  return `https://www.instagram.com/reel/${match[1]}/`;
}
