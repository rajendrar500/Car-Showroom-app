import { Box, CircleAlert, Rotate3D } from 'lucide-react';
import { createElement, useEffect, useRef, useState } from 'react';
import type { Car } from '@/data/cars';
import {
  getCarImagesApiKey,
  loadCarImagesRuntime,
} from '@/lib/carImagesApi';
import { useLocale } from '@/locale';

type ViewerState = 'idle' | 'loading' | 'ready' | 'unavailable';

export function Car3DViewer({ car }: { car: Car }) {
  const { t } = useLocale();
  const [state, setState] = useState<ViewerState>('idle');
  const modelRef = useRef<HTMLElement | null>(null);
  const carIdRef = useRef(car.id);
  const apiKey = getCarImagesApiKey();
  carIdRef.current = car.id;

  useEffect(() => {
    setState('idle');
  }, [car.id]);

  const requestPreview = () => {
    if (!car.has3d || !apiKey) {
      setState('unavailable');
      return;
    }
    const requestedId = car.id;
    setState('loading');
    loadCarImagesRuntime(apiKey)
      .then(() => {
        if (carIdRef.current !== requestedId) return;
        setState('ready');
      })
      .catch(() => {
        if (carIdRef.current !== requestedId) return;
        setState('unavailable');
      });
  };

  useEffect(() => {
    if (state !== 'ready' || !modelRef.current) return;

    const model = modelRef.current;
    const handleLoaded = () => setState('ready');
    const handleError = () => setState('unavailable');
    model.addEventListener('load', handleLoaded);
    model.addEventListener('error', handleError);

    return () => {
      model.removeEventListener('load', handleLoaded);
      model.removeEventListener('error', handleError);
    };
  }, [state]);

  const modelViewer =
    state === 'ready'
      ? createElement('model-viewer', {
          ref: (node: HTMLElement | null) => {
            modelRef.current = node;
          },
          'data-ci-type': 'car',
          'data-ci-make': car.brand,
          'data-ci-model': car.model,
          'data-ci-year': String(car.year),
          'data-ci-view': 'front34',
          'data-ci-speed': '8',
          'data-ci-backdrop': 'graphite',
          'camera-controls': true,
          'auto-rotate': true,
          'interaction-prompt': 'none',
          className: 'viewer-model',
          style: { width: '100%', height: '100%', background: 'transparent' },
        })
      : null;

  return (
    <div className={`viewer ${state === 'ready' ? 'viewer-ready' : ''}`} data-testid={`viewer-${car.id}`}>
      {state !== 'ready' && <div className="viewer-grid" />}
      {modelViewer}
      {state === 'ready' ? (
        <button
          className="btn-line viewer-btn viewer-close"
          type="button"
          onClick={() => setState('idle')}
          data-testid={`button-close-3d-${car.id}`}
        >
          {t.returnGallery}
        </button>
      ) : (
        <div className="viewer-content">
          {state === 'loading' && <Rotate3D size={29} className="gold animate-pulse" />}
          {state === 'unavailable' && <CircleAlert size={29} className="gold" />}
          {state === 'idle' && <Box size={29} className="gold" />}
          <h3>
            {state === 'loading' ? t.previewPreparing : state === 'unavailable' ? t.previewUnavailable : t.explore3d}
          </h3>
          <p>
            {state === 'unavailable' ? t.previewUnavailableCopy : t.previewIdleCopy}
          </p>
          {state === 'idle' && (
            <button className="btn-line viewer-btn" type="button" onClick={requestPreview} data-testid={`button-load-3d-${car.id}`}>
              <Rotate3D size={13} /> {car.has3d ? t.loadPreview : t.checkAvailability}
            </button>
          )}
          {state === 'unavailable' && (
            <span className="eyebrow">{t.galleryFallback}</span>
          )}
        </div>
      )}
    </div>
  );
}