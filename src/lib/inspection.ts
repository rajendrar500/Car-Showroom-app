import type { Car } from '@/data/cars';

export const INSPECT_ZONES = ['paint', 'glass', 'cabin', 'power', 'underside', 'tyres'] as const;
export type InspectZone = (typeof INSPECT_ZONES)[number];

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function inspectScores(car: Car) {
  const scores = Object.fromEntries(
    INSPECT_ZONES.map((zone, index) => {
      const n = hash(`${car.id}:${zone}:${index}`);
      return [zone, 86 + (n % 13)];
    }),
  ) as Record<InspectZone, number>;
  const average = Math.round(INSPECT_ZONES.reduce((sum, zone) => sum + scores[zone], 0) / INSPECT_ZONES.length);
  const grade = average >= 95 ? 'A+' : average >= 90 ? 'A' : 'A−';
  return { scores, average, grade };
}
