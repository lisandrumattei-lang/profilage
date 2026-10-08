import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findBarcode, normalizeBarcode, normalizeProduct, portionNutrients, searchFoods } from '../src/food.ts';
import { searchCiqual, type CiqualRow } from '../src/ciqual.ts';

const sample = { code: '3017620422003', product_name_fr: 'Aliment de test', brands: 'Test', nutriments: { 'energy-kcal_100g': 200, proteins_100g: 8, carbohydrates_100g: 30, fat_100g: 5 } };
test('les codes EAN/UPC sont validés sans perdre les zéros initiaux', () => {
  assert.equal(normalizeBarcode('3017 6204 2200 3'), '3017620422003');
  assert.equal(normalizeBarcode('0036000291452'), '0036000291452');
  for (const code of ['3017620422004', 'abc', '123', '123456789']) assert.throws(() => normalizeBarcode(code));
});
test('la portion applique les valeurs pour 100 g et conserve les nutriments manquants', () => {
  const product = normalizeProduct(sample)!;
  assert.deepEqual(portionNutrients(product, 250), { calories: 500, protein: 20, carbs: 75, fat: 12.5 });
  const incomplete = normalizeProduct({ ...sample, nutriments: { 'energy-kj_100g': 418.4, fat_100g: 0 } })!;
  assert.ok(Math.abs(incomplete.per100.calories! - 100) < 1e-10);
  assert.equal(incomplete.per100.protein, null);
  assert.equal(incomplete.per100.fat, 0);
  assert.equal(portionNutrients(incomplete, 150).protein, null);
  assert.throws(() => portionNutrients(product, 0));
  assert.throws(() => portionNutrients(product, NaN));
});
test('les produits invalides ne deviennent pas des repas à zéro calorie', () => {
  assert.equal(normalizeProduct({ code: '3017620422003' }), null);
  assert.equal(normalizeProduct({ ...sample, code: 'undefined' }), null);
  const product = normalizeProduct({ ...sample, nutriments: { 'energy-kcal_100g': -2, fat_100g: 'unknown', proteins_100g: 9999 } })!;
  assert.equal(product.per100.calories, null);
  assert.equal(product.per100.protein, null);
});
test('le catalogue Anses 2025 contient tous les aliments et recherche accents, mots et pages', () => {
  const rows = JSON.parse(readFileSync(new URL('../src/data/ciqual-2025.json', import.meta.url), 'utf8')) as CiqualRow[];
  assert.equal(rows.length, 3484);
  assert.equal(new Set(rows.map(row => row[0])).size, 3484);
  const chicken = searchCiqual(rows, 'poulet');
  assert.ok(chicken.products.length > 0);
  assert.ok(chicken.count > 20);
  assert.equal(chicken.more, true);
  const second = searchCiqual(rows, 'poulet', 2);
  assert.ok(second.products.every(product => !chicken.products.some(first => first.id === product.id)));
  assert.equal(searchCiqual(rows, 'legumes').count, searchCiqual(rows, 'légumes').count);
  assert.ok(searchCiqual(rows, 'banane crue').products.length > 0);
  assert.equal(searchCiqual(rows, 'alimentinexistant987').products.length, 0);
  assert.ok(rows.some(row => row.slice(2).includes(null)));
});
test('les réponses API, les indisponibilités, le cache et la limite de recherche sont gérés', async t => {
  let clock = Date.now(); t.mock.method(Date, 'now', () => clock);
  let payload: unknown = { status: 1, product: sample }; let status = 200; let calls = 0;
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL | Request) => { calls++; urls.push(String(url)); return new Response(JSON.stringify(payload), { status }); });
  assert.equal((await findBarcode(sample.code))?.name, sample.product_name_fr);
  assert.equal((await findBarcode(sample.code))?.name, sample.product_name_fr);
  assert.equal(calls, 1);
  assert.ok(urls[0].includes('/api/v2/product/3017620422003.json'));
  payload = { products: [sample, { code: 'bad' }] };
  assert.equal((await searchFoods('yaourt')).products.length, 1);
  assert.ok(urls.at(-1)?.includes('/cgi/search.pl?'));
  await assert.rejects(() => searchFoods('pomme'), /Attendez/);
  clock += 7000; status = 429;
  await assert.rejects(() => searchFoods('pomme'), /une minute/);
  clock += 7000; status = 503;
  await assert.rejects(() => searchFoods('pomme'), /indisponible/);
  clock += 7000; status = 200; payload = {};
  await assert.rejects(() => searchFoods('pomme'), /inattendue/);
});
