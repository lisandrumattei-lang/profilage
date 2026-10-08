import type { FoodProduct } from './food.ts';
type Row = [string, string, number | null, number | null, number | null, number | null];
const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function searchCiqual(rows: Row[], query: string, page = 1): { products: FoodProduct[]; more: boolean; count: number } {
  const words = fold(query.trim()).split(/\s+/).filter(Boolean);
  if (query.trim().length < 2) return { products: [], more: false, count: 0 };
  const matches = rows.filter(row => words.every(word => fold(row[1]).includes(word)));
  return { count: matches.length, more: page * 20 < matches.length, products: matches.slice((page - 1) * 20, page * 20).map(([code, name, calories, protein, carbs, fat]) => ({ id: `ciqual:${code}`, source: 'ciqual', ciqualCode: code, name: name.slice(0, 200), brand: 'Anses · Ciqual 2025', per100: { calories, protein, carbs, fat } })) };
}
export type { Row as CiqualRow };
