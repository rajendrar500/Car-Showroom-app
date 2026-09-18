import { useEffect, useState } from 'react';
import type { Car } from '@/data/cars';
import { fetchCarAngles, mergeGallery, mockGallery, type GalleryShot } from '@/lib/carGallery';

export function useCarGallery(car: Car | undefined) {
  const [shots, setShots] = useState<GalleryShot[]>(() => (car ? mockGallery(car) : []));

  useEffect(() => {
    if (!car) {
      setShots([]);
      return;
    }

    const fallback = mockGallery(car);
    setShots(fallback);

    let cancelled = false;
    fetchCarAngles(car).then((live) => {
      if (cancelled || live.length === 0) return;
      setShots(mergeGallery(fallback, live));
    });

    return () => {
      cancelled = true;
    };
  }, [car?.id]);

  return shots;
}
