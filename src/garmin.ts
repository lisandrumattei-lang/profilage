import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { dateKey } from './model.ts';
export type GarminActivity = { id: string; date: string; name: string; minutes: number; distanceKm?: number };
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const array = (value: unknown): unknown[] => value === undefined ? [] : Array.isArray(value) ? value : [value];
function numeric(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) throw new Error('Le fichier contient une durée ou distance invalide.');
  const n = Number(value); if (!Number.isFinite(n)) throw new Error('Valeur numérique invalide.'); return n;
}
export function parseGarminTcx(xml: string): GarminActivity {
  if (xml.length > 2000000) throw new Error('Le fichier TCX doit faire moins de 2 Mo.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Ce fichier XML n’est pas un TCX valide.');
  const document: unknown = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, processEntities: false }).parse(xml);
  if (!object(document) || !object(document.TrainingCenterDatabase) || !object(document.TrainingCenterDatabase.Activities)) throw new Error('Choisissez un export d’activité Garmin au format TCX.');
  const activities = array(document.TrainingCenterDatabase.Activities.Activity);
  if (activities.length !== 1 || !object(activities[0])) throw new Error('Exportez une seule activité à la fois au format TCX.');
  const activity = activities[0];
  const timestamp = activity.Id;
  if (typeof timestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) throw new Error('La date de l’activité est absente ou invalide.');
  const laps = array(activity.Lap);
  if (!laps.length) throw new Error('Aucune durée d’activité trouvée.');
  let seconds = 0, meters = 0, hasDistance = false;
  for (const lap of laps) {
    if (!object(lap)) throw new Error('Données de séance invalides.');
    seconds += numeric(lap.TotalTimeSeconds);
    if (lap.DistanceMeters !== undefined) { meters += numeric(lap.DistanceMeters); hasDistance = true; }
  }
  if (seconds < 60 || seconds > 36000 || meters > 1000000) throw new Error('Activité prise en charge : de 1 à 600 minutes, au plus 1 000 km.');
  const sport = String(activity['@_Sport'] ?? 'Other');
  const names: Record<string, string> = { Running: 'Course à pied', Biking: 'Vélo', Other: 'Activité Garmin' };
  return { id: `garmin-tcx:${new Date(timestamp).toISOString()}:${sport.slice(0, 30)}`, date: dateKey(new Date(timestamp)), name: names[sport] ?? 'Activité Garmin', minutes: Math.round(seconds / 60 * 10) / 10, ...(hasDistance ? { distanceKm: Math.round(meters / 10) / 100 } : {}) };
}
