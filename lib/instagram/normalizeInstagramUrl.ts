const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);

export type InstagramContentKind = 'reel' | 'post';

export function normalizeInstagramUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Invalid Instagram post or Reel URL.');
  }
  if (
    url.protocol !== 'https:' ||
    !INSTAGRAM_HOSTS.has(url.hostname.toLowerCase())
  )
    throw new Error('Invalid Instagram post or Reel URL.');
  const match = url.pathname.match(/^\/(reel|reels|p)\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) throw new Error('Invalid Instagram post or Reel URL.');
  const kind = match[1] === 'p' ? 'p' : 'reel';
  return `https://www.instagram.com/${kind}/${match[2]}/`;
}

export function instagramContentKind(url: string): InstagramContentKind {
  return new URL(normalizeInstagramUrl(url)).pathname.startsWith('/p/')
    ? 'post'
    : 'reel';
}
