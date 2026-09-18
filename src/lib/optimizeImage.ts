const MAX_WIDTH = 1280;

function clampWidth(width: number) {
  return Math.min(MAX_WIDTH, Math.max(160, Math.round(width)));
}

function wikimediaFileName(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.hostname === 'commons.wikimedia.org') {
      const marker = '/Special:FilePath/';
      const index = url.pathname.indexOf(marker);
      if (index >= 0) return decodeURIComponent(url.pathname.slice(index + marker.length));
    }
    if (url.hostname === 'upload.wikimedia.org') {
      const parts = url.pathname.split('/').filter(Boolean);
      const thumb = parts.indexOf('thumb');
      if (thumb >= 0 && parts[thumb + 3]) return decodeURIComponent(parts[thumb + 3]);
      return decodeURIComponent(parts[parts.length - 1] ?? '');
    }
  } catch {
    return null;
  }
  return null;
}

export function isWikimediaUrl(src: string) {
  return /wikimedia\.org|wikipedia\.org/i.test(src);
}

export function wikimediaThumbUrl(src: string, width: number) {
  const fileName = wikimediaFileName(src);
  if (!fileName) return src;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${clampWidth(width)}`;
}

export function optimizedImageUrl(src: string, width: number) {
  if (!src.startsWith('http')) return src;
  if (src.includes('motomarks')) return src;

  const size = clampWidth(width);
  if (isWikimediaUrl(src)) return wikimediaThumbUrl(src, size);

  return `https://images.weserv.nl/?url=${encodeURIComponent(src)}&w=${size}&q=62&output=webp&il`;
}
