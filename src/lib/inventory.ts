import { cars, type Car } from '@/data/cars';

export type InventoryQuery = {
  make: string;
  model: string;
  year: string;
  body: string;
  fuel: string;
  price: string;
};

export const EMPTY_QUERY: InventoryQuery = {
  make: '',
  model: '',
  year: '',
  body: '',
  fuel: '',
  price: '',
};

export const PRICE_BANDS = [
  { id: 'lt15', min: 0, max: 1_50_00_000 },
  { id: '15-20', min: 1_50_00_000, max: 2_00_00_000 },
  { id: '20-30', min: 2_00_00_000, max: 3_00_00_000 },
  { id: 'gt30', min: 3_00_00_000, max: Number.POSITIVE_INFINITY },
] as const;

export function parseInventoryQuery(search: string): InventoryQuery {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return {
    make: params.get('make') ?? '',
    model: params.get('model') ?? '',
    year: params.get('year') ?? '',
    body: params.get('body') ?? '',
    fuel: params.get('fuel') ?? '',
    price: params.get('price') ?? '',
  };
}

export function toInventorySearch(query: InventoryQuery) {
  const params = new URLSearchParams();
  (Object.keys(EMPTY_QUERY) as Array<keyof InventoryQuery>).forEach((key) => {
    if (query[key]) params.set(key, query[key]);
  });
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function uniqueMakes() {
  return Array.from(new Set(cars.map((car) => car.brand))).sort();
}

export function uniqueModels(make = '') {
  return Array.from(
    new Set(cars.filter((car) => !make || car.brand === make).map((car) => car.model)),
  ).sort();
}

export function uniqueYears() {
  return Array.from(new Set(cars.map((car) => String(car.year)))).sort((a, b) => Number(b) - Number(a));
}

export function uniqueBodies() {
  return Array.from(new Set(cars.map((car) => car.bodyType))).sort();
}

export function uniqueFuels() {
  return Array.from(new Set(cars.map((car) => car.fuel))).sort();
}

export function filterInventory(query: InventoryQuery, list: Car[] = cars) {
  const band = PRICE_BANDS.find((item) => item.id === query.price);
  return list.filter((car) => {
    if (query.make && car.brand !== query.make) return false;
    if (query.model && car.model !== query.model) return false;
    if (query.year && String(car.year) !== query.year) return false;
    if (query.body && car.bodyType !== query.body) return false;
    if (query.fuel && car.fuel !== query.fuel) return false;
    if (band && (car.price < band.min || car.price >= band.max)) return false;
    return true;
  });
}

export function groupByBrand(list: Car[]) {
  const groups: Array<{ brand: string; cars: Car[] }> = [];
  const index = new Map<string, number>();
  list.forEach((car) => {
    const existing = index.get(car.brand);
    if (existing === undefined) {
      index.set(car.brand, groups.length);
      groups.push({ brand: car.brand, cars: [car] });
      return;
    }
    groups[existing].cars.push(car);
  });
  return groups;
}

export function brandSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/g, '');
}
