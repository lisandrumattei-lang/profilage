import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateKey, emptyDay, effort, initialJournal, numberInput, parseJournal, progress, reduceJournal, totals } from '../src/model.ts';

test('les saisies restent associées à leur journée, sans reporter les données démo', () => {
  const initial = initialJournal('2026-10-08');
  const changed = reduceJournal(initial, { type: 'water', date: '2026-10-09', delta: 250 });
  assert.equal(changed.days['2026-10-09'].water, 250);
  assert.deepEqual(changed.days['2026-10-09'].meals, []);
  assert.equal(initial.days['2026-10-08'].water, 1250);
  assert.equal(dateKey(new Date(2026, 9, 8, 23, 59)), '2026-10-08');
});
test('ajouter et retirer un repas actualise les macros sans modifier les autres jours', () => {
  const initial = reduceJournal(initialJournal('2026-10-08'), { type: 'clear' });
  const added = reduceJournal(initial, { type: 'meal', date: '2026-10-08', meal: { id: '1', name: 'Déjeuner', calories: 500, protein: 30, carbs: 60, fat: 15 } });
  assert.deepEqual(totals(added.days['2026-10-08']), { calories: 500, protein: 30, carbs: 60, fat: 15 });
  const removed = reduceJournal(added, { type: 'removeMeal', date: '2026-10-08', id: '1' });
  assert.equal(totals(removed.days['2026-10-08']).calories, 0);
  assert.equal(initial.demo, false);
});
test('la charge utilise durée et effort perçu, et se recalcule après suppression', () => {
  const state = reduceJournal(initialJournal('2026-10-08'), { type: 'workout', date: '2026-10-09', workout: { id: 'w', name: 'Vélo', minutes: 30, intensity: 4 } });
  assert.equal(effort(state.days['2026-10-09']), 120);
  assert.equal(effort(reduceJournal(state, { type: 'removeWorkout', date: '2026-10-09', id: 'w' }).days['2026-10-09']), 0);
});
test('hydratation et jauges restent bornées', () => {
  const state = reduceJournal(initialJournal('2026-10-08'), { type: 'water', date: '2026-10-09', delta: -250 });
  assert.equal(state.days['2026-10-09'].water, 0);
  assert.equal(progress(3000, 2500), 1);
  assert.equal(progress(-1, 2500), 0);
  assert.equal(progress(1, 0), 0);
  assert.equal(totals(emptyDay()).calories, 0);
});
test('les nombres français sont acceptés et les valeurs invalides sont refusées', () => {
  assert.equal(numberInput('7,5', 0, 24), 7.5);
  for (const invalid of ['', '-2', 'NaN', '1e3', '25', '3abc']) assert.equal(numberInput(invalid, 0, 24), null);
});
test('le stockage est validé avant chargement et les données altérées sont rejetées', () => {
  const state = initialJournal('2026-10-08');
  assert.deepEqual(parseJournal(JSON.stringify(state)), state);
  assert.throws(() => parseJournal('{broken'));
  assert.throws(() => parseJournal(JSON.stringify({ ...state, version: 2 })));
  assert.throws(() => parseJournal(JSON.stringify({ ...state, goals: { ...state.goals, calories: 0 } })));
  assert.throws(() => parseJournal(JSON.stringify({ ...state, days: { '2026-10-08': { ...state.days['2026-10-08'], water: '1000' } } })));
});
