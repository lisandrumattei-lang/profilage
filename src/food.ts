export type Nutrients = { calories: number | null; protein: number | null; carbs: number | null; fat: number | null };
export type FoodProduct = { id: string; source: 'openfoodfacts' | 'ciqual'; barcode?: string; ciqualCode?: string; name: string; brand: string; per100: Nutrients };
type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value);
const nutrient = (value: unknown, max: number): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};
export function normalizeProduct(raw: unknown): FoodProduct | null {
  if (!object(raw) || typeof raw.code !== 'string' || !/^\d{8,14}$/.test(raw.code)) return null;
  const names = [raw.product_name_fr, raw.product_name, raw.generic_name_fr, raw.generic_name];
  const name = names.find(n => typeof n === 'string' && n.trim());
  if (typeof name !== 'string') return null;
  const n = object(raw.nutriments) ? raw.nutriments : {};
  const kcal = nutrient(n['energy-kcal_100g'], 1000);
  const kj = nutrient(n['energy-kj_100g'] ?? (n.energy_unit === 'kJ' ? n.energy_100g : undefined), 4184);
  return { id: `off:${raw.code}`, source: 'openfoodfacts', barcode: raw.code, name: name.trim().slice(0, 80), brand: typeof raw.brands === 'string' ? raw.brands.slice(0, 100) : '', per100: {
    calories: kcal ?? (kj === null ? null : kj / 4.184),
    protein: nutrient(n.proteins_100g, 100), carbs: nutrient(n.carbohydrates_100g, 100), fat: nutrient(n.fat_100g, 100),
  } };
}
export function portionNutrients(product: FoodProduct, portion: number): Nutrients {
  if (!Number.isFinite(portion) || portion < 1 || portion > 5000) throw new Error('Quantité : 1 à 5 000 g ou ml.');
  return Object.fromEntries(Object.entries(product.per100).map(([key, value]) => [key, value === null ? null : Math.round(value * portion / 100 * 10) / 10])) as Nutrients;
}
export function normalizeBarcode(value: string): string {
  const code = value.replace(/[\s-]/g, '');
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(code)) throw new Error('Saisissez les 8, 12, 13 ou 14 chiffres du code-barres.');
  let sum = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) sum += Number(code[i]) * weight;
  if ((10 - sum % 10) % 10 !== Number(code.at(-1))) throw new Error('Le code-barres semble incomplet ou incorrect. Vérifiez les chiffres.');
  return code;
}
const FIELDS = 'code,product_name,product_name_fr,generic_name,generic_name_fr,brands,nutriments';
let nextSearch = 0; let nextBarcode = 0;
const barcodeCache = new Map<string, FoodProduct>();
async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, 15000);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') headers['User-Agent'] = 'Profilage/1.1 (https://github.com/lisandrumattei-lang/profilage)';
    const response = await fetch(url, { signal: controller.signal, headers });
    if (response.status === 429) throw new Error('La base est très sollicitée. Attendez une minute avant de réessayer.');
    if (response.status === 404) return { status: 0 };
    if (!response.ok) throw new Error('La base alimentaire est indisponible. Réessayez plus tard ou saisissez le repas manuellement.');
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (signal?.aborted) throw error;
      throw new Error('La recherche a pris trop de temps. Vérifiez votre connexion puis réessayez.');
    }
    if (error instanceof TypeError) throw new Error('Connexion à Open Food Facts impossible. Vous pouvez toujours saisir le repas manuellement.');
    throw error;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export async function findBarcode(value: string, signal?: AbortSignal): Promise<FoodProduct | null> {
  const code = normalizeBarcode(value);
  const cached = barcodeCache.get(code); if (cached) return cached;
  if (Date.now() < nextBarcode) throw new Error('Attendez quelques secondes avant de scanner un autre produit.');
  nextBarcode = Date.now() + 4100;
  // API v2 is still supported and preserves the per-100g nutriments used here.
  const data = await getJson(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${FIELDS}`, signal);
  if (!object(data) || data.status === 0) return null;
  if (!object(data.product)) throw new Error('Réponse alimentaire inattendue. Réessayez plus tard.');
  const product = normalizeProduct({ ...data.product, code });
  if (!product) return null;
  if (barcodeCache.size >= 100) barcodeCache.delete(barcodeCache.keys().next().value!);
  barcodeCache.set(code, product); return product;
}
export async function searchFoods(query: string, page = 1, signal?: AbortSignal): Promise<{ products: FoodProduct[]; more: boolean }> {
  if (query.trim().length < 2) throw new Error('Saisissez au moins deux caractères.');
  if (Date.now() < nextSearch) throw new Error('Attendez quelques secondes entre deux recherches.');
  nextSearch = Date.now() + 6100;
  // OFF's structured v2 search does not support full text; legacy search does.
  const params = new URLSearchParams({ search_terms: query.trim().slice(0, 100), search_simple: '1', action: 'process', json: '1', page_size: '20', page: String(page), fields: FIELDS, lc: 'fr' });
  const data = await getJson(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, signal);
  if (!object(data) || !Array.isArray(data.products)) throw new Error('Réponse de recherche inattendue. Réessayez plus tard.');
  return { products: data.products.map(normalizeProduct).filter((p): p is FoodProduct => p !== null), more: data.products.length === 20 };
}
