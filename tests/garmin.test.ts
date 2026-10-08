import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseGarminTcx } from '../src/garmin.ts';
import { initialJournal, parseJournal, reduceJournal } from '../src/model.ts';
const tcx = `<?xml version="1.0"?><TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><Activities><Activity Sport="Biking"><Id>2026-10-08T12:00:00Z</Id><Lap StartTime="2026-10-08T12:00:00Z"><TotalTimeSeconds>1200</TotalTimeSeconds><DistanceMeters>8000</DistanceMeters></Lap><Lap StartTime="2026-10-08T12:20:00Z"><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>4000</DistanceMeters></Lap></Activity></Activities></TrainingCenterDatabase>`;
test('l’import Garmin additionne les tours et conserve la date, durée et distance', () => {
  const result = parseGarminTcx(tcx);
  assert.equal(result.name, 'Vélo'); assert.equal(result.minutes, 30); assert.equal(result.distanceKm, 12);
  assert.equal(result.date, '2026-10-08');
  assert.ok(result.id.startsWith('garmin-tcx:'));
});
test('un TCX préfixé est accepté et la distance absente reste inconnue', () => {
  const xml = `<tcx:TrainingCenterDatabase xmlns:tcx="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"><tcx:Activities><tcx:Activity Sport="Running"><tcx:Id>2026-10-08T12:00:00Z</tcx:Id><tcx:Lap><tcx:TotalTimeSeconds>60</tcx:TotalTimeSeconds></tcx:Lap></tcx:Activity></tcx:Activities></tcx:TrainingCenterDatabase>`;
  const result = parseGarminTcx(xml); assert.equal(result.minutes, 1); assert.equal(result.distanceKm, undefined);
});
test('les fichiers illisibles, trop volumineux, avec entités ou durées invalides sont refusés', () => {
  for (const xml of ['<wrong/>', '<TrainingCenterDatabase>', '<!DOCTYPE foo [<!ENTITY x "test">]>' + tcx, 'x'.repeat(2000001), tcx.replace('1200', 'NaN'), tcx.replace('2026-10-08T12:00:00Z', 'invalid-date')]) assert.throws(() => parseGarminTcx(xml));
});
test('une activité déjà importée n’est pas comptée deux fois', () => {
  const result = parseGarminTcx(tcx); const { date, ...workout } = result;
  const action = { type: 'workout' as const, date, workout: { ...workout, intensity: 6, source: 'garmin-tcx' as const } };
  const first = reduceJournal(initialJournal('2026-10-09'), action);
  assert.strictEqual(reduceJournal(first, action), first);
  assert.equal(first.days[date].workouts.length, 1);
  assert.deepEqual(parseJournal(JSON.stringify(first)), first);
});
test('les anciens journaux restent compatibles et les photos/produits sont validés', () => {
  const initial = initialJournal('2026-10-08'); assert.deepEqual(parseJournal(JSON.stringify(initial)), initial);
  const meal = { id: 'm', name: 'Eau minérale', calories: 0, protein: 0, carbs: 0, fat: 0, photoUri: 'data:image/jpeg;base64,abc', foodSource: 'ciqual' as const, ciqualCode: '18000', portion: 250 };
  const state = reduceJournal(initial, { type: 'meal', date: '2026-10-08', meal });
  assert.deepEqual(parseJournal(JSON.stringify(state)), state);
  state.days['2026-10-08'].meals.at(-1)!.photoUri = 'javascript:bad';
  assert.throws(() => parseJournal(JSON.stringify(state)), /Photo/);
});
