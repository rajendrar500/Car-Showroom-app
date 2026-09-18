export type MotomarksBrand = {
  id: string;
  name: string;
  color: string | null;
  vehicleTypes: string[];
};

const DEFAULT_MOTOMARKS_KEY = 'pk_700ec9f3216a96050332ffe676b98d5d';

export function getMotomarksKey() {
  return (import.meta.env.VITE_MOTOMARKS_KEY as string | undefined) || DEFAULT_MOTOMARKS_KEY;
}

export function getMotomarksLogoUrl(
  slug: string,
  options?: { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; type?: 'full' | 'badge' | 'wordmark'; format?: 'webp' | 'png' },
) {
  const params = new URLSearchParams({
    token: getMotomarksKey(),
    size: options?.size ?? 'sm',
    type: options?.type ?? 'badge',
    format: options?.format ?? 'webp',
    aspect: 'square',
  });
  return `https://motomarks.io/img/${encodeURIComponent(slug)}?${params.toString()}`;
}
