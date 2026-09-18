const DEFAULT_CARIMAGES_API_KEY = 'ci_07fa36a7f62771e51458ba93f9159eb7007b9470a176db3aa194222f';

let runtimePromise: Promise<void> | null = null;

export function getCarImagesApiKey() {
  return (
    import.meta.env.VITE_CARIMAGES_API_KEY ?? DEFAULT_CARIMAGES_API_KEY
  ) as string | undefined;
}

export function loadCarImagesRuntime(apiKey: string) {
  if (runtimePromise) return runtimePromise;

  runtimePromise = new Promise<void>((resolve, reject) => {
    const modelViewerScript = document.createElement('script');
    modelViewerScript.type = 'module';
    modelViewerScript.src =
      'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    modelViewerScript.dataset.velociaModelViewer = 'true';

    const carImagesScript = document.createElement('script');
    carImagesScript.src = 'https://carimagesapi.com/assets/js/carimages.js';
    carImagesScript.dataset.apiKey = apiKey;
    carImagesScript.dataset.velociaCarImages = 'true';

    modelViewerScript.addEventListener('error', () => {
      runtimePromise = null;
      reject(new Error('The 3D model runtime could not be loaded.'));
    });

    carImagesScript.addEventListener('error', () => {
      runtimePromise = null;
      reject(new Error('The CarImages runtime could not be loaded.'));
    });

    modelViewerScript.addEventListener('load', () => {
      document.head.appendChild(carImagesScript);
    });

    carImagesScript.addEventListener('load', () => resolve());
    document.head.appendChild(modelViewerScript);
  });

  return runtimePromise;
}