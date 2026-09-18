import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const secret = process.env.MOTOMARKS_SECRET_KEY;
if (!secret) {
  console.error('Set MOTOMARKS_SECRET_KEY before fetching the Motomarks catalog.');
  process.exit(1);
}

const response = await fetch('https://api.motomarks.io/brands', {
  headers: {
    Authorization: `Bearer ${secret}`,
    Accept: 'application/json',
    Origin: 'http://localhost:5173',
    Referer: 'http://localhost:5173/',
  },
});

if (!response.ok) {
  console.error(`Motomarks brands request failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const raw = await response.json();
const brands = raw
  .map((brand) => ({
    id: brand.id,
    name: brand.name,
    color: brand.color ?? null,
    vehicleTypes: brand.vehicleTypes ?? [],
  }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));

const out = resolve(import.meta.dirname, '../src/data/motomarks-brands.json');
writeFileSync(out, JSON.stringify(brands));
console.log(`Wrote ${brands.length} brands to ${out}`);
