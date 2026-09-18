import type { Car } from '@/data/cars';

export type GalleryShot = {
  url: string;
  angle: string;
};

const ANGLES = [
  'angleFrontQ',
  'angleFront',
  'angleSide',
  'angleRearQ',
  'angleRear',
  'angleDetail',
] as const;

const SKIP = /logo|icon|svg|diagram|blueprint|drawing|wordmark|flag|map|coa|badge|crest|cropped/i;

function commonsFile(fileName: string, width = 960) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`;
}

function labelShots(urls: string[]): GalleryShot[] {
  return urls.filter(Boolean).map((url, index) => ({
    url,
    angle: ANGLES[Math.min(index, ANGLES.length - 1)],
  }));
}

const MOCK_FILES: Record<string, string[]> = {
  'aston-martin-vantage-2022': [
    'Aston Martin V8 Vantage Roadster IMG 8846.jpg',
    '2019 Aston Martin Vantage V8 Automatic 4.0 (1).jpg',
    'Aston Martin Vantage (2017) F1 Edition 1X7A0358.jpg',
    'Aston Martin Vantage, Paris Motor Show 2018, Paris (1Y7A1615).jpg',
    'Aston Martin V8 Vantage, GIMS 2018, Le Grand-Saconnex (1X7A1588).jpg',
    'Aston Martin V12 Vantage, TC 24, Essen (TCE42642).jpg',
    'Aston Martin V12 Vantage, TC 24, Essen (TCE42645).jpg',
    'Aston MArtin Vantage GTE, GIMS 2018, Le Grand-Saconnex (1X7A1590).jpg',
  ],
  'porsche-911-carrera-2021': [
    'Porsche 992 Turbo S 1X7A0413.jpg',
    'Porsche 992 Carrera 4 GTS 1X7A7209.jpg',
    'Porsche 911, EMS 2024, Essen (P1032183).jpg',
    'Porsche 992 Carrera GTS Spirit 70 IAA 2025 DSC 1981.jpg',
    'Porsche 992 Carrera GTS Spirit 70 IAA 2025 DSC 1987.jpg',
    '2025 Porsche 992 Carrera convertible DSC 7024.jpg',
    '2025 Porsche 992 Carrera convertible DSC 7026.jpg',
    '2025 Porsche 992 Carrera GTS Targa Autofrühling Ulm 2025 DSC 8749.jpg',
  ],
  'ferrari-roma-2023': [
    'Ferrari Roma IMG 9620.jpg',
    '2021 Ferrari Roma 6.jpg',
    '2021 Ferrari Roma 7.jpg',
    '2021 Ferrari Roma 8.jpg',
    '2022 Ferrari Roma 5.jpg',
    'Ferrari Roma 1X7A0309.jpg',
    'Ferrari Roma Auto Zuerich 2021 IMG 0414.jpg',
    '2023 Ferrari Roma 2.jpg',
  ],
  'mercedes-amg-gt-2020': [
    'Mercedes-AMG C192 1X7A0832.jpg',
    '2018 Mercedes AMG GT R Auto.jpg',
    '2018 Mercedes AMG GT R Auto 2.jpg',
    '2018 Mercedes AMG GT R Premium Auto 2.jpg',
  ],
  'bmw-m4-competition-2022': [
    'BMW M4, EMS 23, Essen (P1170092).jpg',
  ],
  'audi-rs5-sportback-2021': [
    'Audi RS5, Binz (P1090702).jpg',
  ],
  'jaguar-f-type-r-2022': [
    '2020 Jaguar F-Type Convertible IMG 5821.jpg',
  ],
  'bentley-continental-gt-2019': [
    'Bentley Continental GT (4th gen.) IMG 0556.jpg',
    'Bentley Continental GT (4th gen.) IMG 0553.jpg',
    'Bentley Continental GT (4th gen.) DSC 6978.jpg',
    'Bentley Continental GT, IAA 2017, Frankfurt (1Y7A2192).jpg',
    'Bentley Continental GT, IAA 2017, Frankfurt (1Y7A2237).jpg',
    'Bentley Continental GT, GIMS 2019, Le Grand-Saconnex (GIMS1036).jpg',
    'Bentley Continental GT (3rd gen.) Azure 1X7A6807.jpg',
  ],
  'porsche-taycan-4s-2022': [
    'Porsche Taycan Sport Turismo GTS 1X7A0416.jpg',
    'Porsche Taycan 4S 1X7A0337.jpg',
    '2024 Porsche Taycan IMG 0046.jpg',
    '2024 Porsche Taycan GTS IAA 2025 DSC 1988.jpg',
    '2024 Porsche Taycan Sport Turismo IMG 9326.jpg',
    'Porsche Taycan Cross Turismo 4S IMG 7870.jpg',
    'Porsche Taycan GTS, IAA Open Space 2025, Munich (20250909-P1050259).jpg',
  ],
  'land-rover-defender-v8-2021': [
    'Land Rover Defender (L663) V8 IMG 6604.jpg',
    'Land Rover Defender 110 First Edition 2020 - rear.jpg',
    'Land Rover Defender (L663) DSC 9062.jpg',
    'Land Rover Defender (L663) DSC 9063.jpg',
    'Land Rover Defender (L663) Auto Zuerich 2021 IMG 0432.jpg',
    'Land Rover Defender 110 (L663) 1X7A1919.jpg',
  ],
  'lexus-lc500-2020': [
    'Lexus LC.jpg',
  ],
};

export function mockGallery(car: Car): GalleryShot[] {
  const files = MOCK_FILES[car.id] ?? [];
  const urls = [
    car.images[0],
    ...files.map((file) => commonsFile(file)),
  ];
  const unique = [...new Set(urls)];
  return labelShots(unique).slice(0, 6);
}

type WikiPage = {
  title?: string;
  imageinfo?: Array<{
    url: string;
    thumburl?: string;
    mime?: string;
    width?: number;
    height?: number;
  }>;
};

async function searchCommons(query: string, limit = 6): Promise<string[]> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: String(limit),
    gsrsearch: query,
    prop: 'imageinfo',
    iiprop: 'url|mime|size',
    iiurlwidth: '960',
  });

  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
  if (!response.ok) return [];
  const data = await response.json() as { query?: { pages?: Record<string, WikiPage> } };
  const pages = Object.values(data.query?.pages ?? {});

  return pages.flatMap((page) => {
    const info = page.imageinfo?.[0];
    const title = page.title ?? '';
    const raw = info?.thumburl || info?.url;
    if (!raw) return [];
    if (SKIP.test(title) || SKIP.test(raw)) return [];
    if (info.mime && !info.mime.startsWith('image/')) return [];
    if (info.mime === 'image/svg+xml') return [];
    if ((info.width ?? 0) < 900) return [];
    return [raw];
  });
}

export async function fetchCarAngles(car: Car): Promise<GalleryShot[]> {
  const buckets: Array<[string, string]> = [
    [`${car.brand} ${car.model}`, 'angleFrontQ'],
    [`${car.brand} ${car.model} side`, 'angleSide'],
    [`${car.brand} ${car.model} rear`, 'angleRear'],
    [`${car.brand} ${car.model} interior`, 'angleInterior'],
  ];

  const collected: GalleryShot[] = [];
  const seen = new Set<string>();

  for (const [query, angle] of buckets) {
    try {
      const urls = await searchCommons(query, 4);
      for (const url of urls) {
        if (seen.has(url)) continue;
        seen.add(url);
        collected.push({ url, angle });
      }
    } catch {
      /* keep mock if Commons is rate-limited */
    }
  }

  return collected;
}

export function mergeGallery(base: GalleryShot[], live: GalleryShot[]): GalleryShot[] {
  const seen = new Set(base.map((shot) => shot.url));
  const extra = live.filter((shot) => {
    if (seen.has(shot.url)) return false;
    seen.add(shot.url);
    return true;
  });
  return [...base, ...extra].slice(0, 8);
}
