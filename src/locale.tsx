import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { localeCopy, tx, type Copy, type Locale } from '@/i18n';
import type { AuctionState, Car } from '@/data/cars';
import { localizedCarText } from '@/data/carCopy';

export type { Copy, Locale };
export { tx, localeCopy };

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Copy;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => undefined,
  t: localeCopy.en,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try { return (localStorage.getItem('xanox-locale') as Locale) || 'en'; } catch { return 'en'; }
  });
  const setLocale = (next: Locale) => setLocaleState(next);
  useEffect(() => {
    localStorage.setItem('xanox-locale', locale);
    document.documentElement.lang = locale === 'ko' ? 'ko' : locale === 'ar' ? 'ar' : 'en';
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.title = localeCopy[locale].pageTitle;
  }, [locale]);
  return <LocaleContext.Provider value={{ locale, setLocale, t: localeCopy[locale] }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function labelBody(t: Copy, body: string) {
  const map: Record<string, string> = {
    Coupe: t.bodyCoupe,
    Sedan: t.bodySedan,
    SUV: t.bodySuv,
    Convertible: t.bodyConvertible,
    Wagon: t.bodyWagon,
    Hatchback: t.bodyHatchback,
    'Grand Tourer': t.bodyGrandTourer,
    Sportback: t.bodySportback,
    'Sports Saloon': t.bodySportsSaloon,
  };
  return map[body] ?? body;
}

export function labelState(t: Copy, state: AuctionState | string) {
  if (state === 'For sale') return t.stateForSale;
  if (state === 'Live auction') return t.stateLive;
  if (state === 'Coming soon') return t.stateSoon;
  return state;
}

export function labelAngle(t: Copy, angle: string) {
  const map: Record<string, string> = {
    angleFrontQ: t.angleFrontQ,
    angleFront: t.angleFront,
    angleSide: t.angleSide,
    angleRearQ: t.angleRearQ,
    angleRear: t.angleRear,
    angleInterior: t.angleInterior,
    angleCabin: t.angleCabin,
    angleWheel: t.angleWheel,
    angleDetail: t.angleDetail,
    angleEngine: t.angleEngine,
  };
  return map[angle] ?? angle;
}

export function labelFuel(t: Copy, fuel: string) {
  if (fuel === 'Petrol') return t.fuelPetrol;
  if (fuel === 'Electric') return t.fuelElectric;
  return fuel;
}

export function labelDrivetrain(t: Copy, drivetrain: string) {
  if (drivetrain === 'Rear-wheel drive') return t.driveRwd;
  if (drivetrain === 'All-wheel drive') return t.driveAwd;
  if (drivetrain === 'Quattro AWD') return t.driveQuattro;
  return drivetrain;
}

export function labelTransmission(t: Copy, value: string) {
  const n = value.match(/^(\d+)-speed/)?.[1];
  if (!n) return value;
  if (value.endsWith('automatic')) return tx(t.transAuto, { n });
  if (value.endsWith('PDK')) return tx(t.transPdk, { n });
  if (value.endsWith('DCT')) return tx(t.transDct, { n });
  if (value.endsWith('dual clutch')) return tx(t.transDual, { n });
  if (value.endsWith('tiptronic')) return tx(t.transTiptronic, { n });
  return value;
}

export function labelLocation(t: Copy, location: string) {
  const map: Record<string, string> = {
    'Mumbai, MH': t.locMumbai,
    'New Delhi, DL': t.locDelhi,
    'Bengaluru, KA': t.locBengaluru,
    'Pune, MH': t.locPune,
    'Hyderabad, TS': t.locHyderabad,
    'Chennai, TN': t.locChennai,
    'Goa, GA': t.locGoa,
  };
  return map[location] ?? location;
}

const ENGINE_KO: Record<string, string> = {
  '4.0L V8 Twin Turbo': '4.0L V8 트윈 터보',
  '3.0L Flat-Six Turbo': '3.0L 수평대향 6기통 터보',
  '3.9L V8 Twin Turbo': '3.9L V8 트윈 터보',
  '4.0L V8 Biturbo': '4.0L V8 바이터보',
  '3.0L TwinPower Turbo': '3.0L 트윈파워 터보',
  '2.9L V6 Twin Turbo': '2.9L V6 트윈 터보',
  '5.0L Supercharged V8': '5.0L 슈퍼차저 V8',
  '6.0L W12 Twin Turbo': '6.0L W12 트윈 터보',
  'Dual electric motor': '듀얼 전기 모터',
  '5.0L Naturally Aspirated V8': '5.0L 자연흡기 V8',
};

const ENGINE_AR: Record<string, string> = {
  '4.0L V8 Twin Turbo': '4.0L V8 توين توربو',
  '3.0L Flat-Six Turbo': '3.0L فلات-سيكس توربو',
  '3.9L V8 Twin Turbo': '3.9L V8 توين توربو',
  '4.0L V8 Biturbo': '4.0L V8 بيتوربو',
  '3.0L TwinPower Turbo': '3.0L توين باور توربو',
  '2.9L V6 Twin Turbo': '2.9L V6 توين توربو',
  '5.0L Supercharged V8': '5.0L V8 سوبرتشارج',
  '6.0L W12 Twin Turbo': '6.0L W12 توين توربو',
  'Dual electric motor': 'محرك كهربائي مزدوج',
  '5.0L Naturally Aspirated V8': '5.0L V8 سحب طبيعي',
};

export function labelEngine(engine: string, locale: Locale) {
  if (locale === 'ko') return ENGINE_KO[engine] ?? engine;
  if (locale === 'ar') return ENGINE_AR[engine] ?? engine;
  return engine;
}

export function carStory(car: Car, locale: Locale) {
  return localizedCarText(car.id, locale, { description: car.description, features: car.features });
}
