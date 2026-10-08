export type Meal = { id: string; name: string; calories: number; protein: number; carbs: number; fat: number };
export type Workout = { id: string; name: string; minutes: number; intensity: number };
export type Day = { meals: Meal[]; workouts: Workout[]; water: number; sleep: number; energy: number };
export type Goals = { calories: number; protein: number; water: number; sleep: number };
export type Journal = { version: 1; days: Record<string, Day>; goals: Goals; demo: boolean };
export const DEFAULT_GOALS: Goals = { calories: 2200, protein: 120, water: 2500, sleep: 8 };
export const PRESETS: Omit<Meal, 'id'>[] = [
  { name: 'Bowl poulet & quinoa', calories: 540, protein: 42, carbs: 58, fat: 16 },
  { name: 'Yaourt, avoine & fruits', calories: 340, protein: 22, carbs: 46, fat: 8 },
  { name: 'Saumon & légumes', calories: 480, protein: 36, carbs: 32, fat: 23 },
  { name: 'Banane & amandes', calories: 210, protein: 5, carbs: 29, fat: 9 },
];
export const emptyDay = (): Day => ({ meals: [], workouts: [], water: 0, sleep: 0, energy: 0 });
export function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function initialJournal(today = dateKey()): Journal {
  return { version: 1, demo: true, goals: { ...DEFAULT_GOALS }, days: {
    [today]: { meals: PRESETS.slice(0, 2).map((meal, i) => ({ ...meal, id: `demo-meal-${i}` })), workouts: [{ id: 'demo-workout', name: 'Course à pied', minutes: 32, intensity: 6 }], water: 1250, sleep: 7.5, energy: 4 },
  } };
}
export function totals(day: Day) {
  return day.meals.reduce((sum, meal) => ({ calories: sum.calories + meal.calories, protein: sum.protein + meal.protein, carbs: sum.carbs + meal.carbs, fat: sum.fat + meal.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
}
export function effort(day: Day): number { return day.workouts.reduce((sum, workout) => sum + workout.minutes * workout.intensity, 0); }
export function progress(value: number, goal: number): number { return goal > 0 ? Math.max(0, Math.min(1, value / goal)) : 0; }
export function numberInput(value: string, min: number, max: number): number | null {
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim())) return null;
  const number = Number(value.trim().replace(',', '.'));
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}
export type Action =
  | { type: 'meal'; date: string; meal: Meal }
  | { type: 'workout'; date: string; workout: Workout }
  | { type: 'removeMeal' | 'removeWorkout'; date: string; id: string }
  | { type: 'water'; date: string; delta: number }
  | { type: 'recovery'; date: string; sleep: number; energy: number }
  | { type: 'goals'; goals: Goals }
  | { type: 'clear' };
export function reduceJournal(state: Journal, action: Action): Journal {
  if (action.type === 'clear') return { version: 1, demo: false, goals: { ...state.goals }, days: {} };
  if (action.type === 'goals') return { ...state, goals: action.goals };
  const day = { ...(state.days[action.date] ?? emptyDay()) };
  switch (action.type) {
    case 'meal': day.meals = [...day.meals, action.meal]; break;
    case 'workout': day.workouts = [...day.workouts, action.workout]; break;
    case 'removeMeal': day.meals = day.meals.filter(meal => meal.id !== action.id); break;
    case 'removeWorkout': day.workouts = day.workouts.filter(workout => workout.id !== action.id); break;
    case 'water': day.water = Math.max(0, Math.min(10000, day.water + action.delta)); break;
    case 'recovery': day.sleep = action.sleep; day.energy = action.energy; break;
  }
  return { ...state, days: { ...state.days, [action.date]: day } };
}
const finite = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
export function parseJournal(raw: string): Journal {
  const data: unknown = JSON.parse(raw);
  if (!object(data) || data.version !== 1 || typeof data.demo !== 'boolean' || !object(data.goals) || !object(data.days)) throw new Error('Format de journal invalide');
  const g = data.goals;
  if (!finite(g.calories, 500, 10000) || !finite(g.protein, 10, 500) || !finite(g.water, 250, 10000) || !finite(g.sleep, 1, 16)) throw new Error('Objectifs invalides');
  for (const [date, day] of Object.entries(data.days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !object(day) || !finite(day.water, 0, 10000) || !finite(day.sleep, 0, 24) || !finite(day.energy, 0, 5) || !Number.isInteger(day.energy) || !Array.isArray(day.meals) || !Array.isArray(day.workouts)) throw new Error('Journée invalide');
    for (const meal of day.meals) {
      if (!object(meal) || !text(meal.id) || !text(meal.name) || !finite(meal.calories, 1, 10000) || !finite(meal.protein, 0, 1000) || !finite(meal.carbs, 0, 1000) || !finite(meal.fat, 0, 1000)) throw new Error('Repas invalide');
    }
    for (const workout of day.workouts) {
      if (!object(workout) || !text(workout.id) || !text(workout.name) || !finite(workout.minutes, 1, 600) || !finite(workout.intensity, 1, 10)) throw new Error('Activité invalide');
    }
  }
  return data as Journal;
}
