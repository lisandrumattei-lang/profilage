import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Action, dateKey, effort, emptyDay, initialJournal, Journal, numberInput, parseJournal, PRESETS, progress, reduceJournal, totals } from './src/model';

const C = { bg: '#0B1118', card: '#141D27', line: '#26323E', text: '#F2F5F6', muted: '#96A7B8', green: '#B2F481', blue: '#8DB9FF', orange: '#FFBD7A', red: '#FF9E9E' };
const STORAGE = 'profilage.journal.v1';
type Tab = 'today' | 'activity' | 'nutrition';
type Sheet = 'meal' | 'workout' | 'recovery' | 'goals' | 'clear' | null;
type IconName = React.ComponentProps<typeof Ionicons>['name'];
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function Icon({ name, color = C.muted, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}
function Button({ title, onPress, icon, secondary = false, disabled = false }: { title: string; onPress: () => void; icon?: IconName; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondaryButton, (pressed || disabled) && { opacity: 0.55 }]}>
    {icon && <Icon name={icon} color={secondary ? C.text : C.bg} size={19} />}<Text style={[s.buttonText, secondary && { color: C.text }]}>{title}</Text>
  </Pressable>;
}
function Bar({ value, goal, color = C.green }: { value: number; goal: number; color?: string }) {
  return <View style={s.track}><View style={[s.fill, { width: `${progress(value, goal) * 100}%`, backgroundColor: color }]} /></View>;
}
function Ring({ value, goal, color = C.green, label, caption, size = 120 }: { value: number; goal: number; color?: string; label: string; caption: string; size?: number }) {
  const radius = (size - 12) / 2; const circumference = 2 * Math.PI * radius;
  return <View accessibilityLabel={`${caption} : ${label}`} style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={C.line} strokeWidth={7} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={7} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - progress(value, goal))} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </Svg>
    <Text style={[s.ringNumber, { color, fontSize: size > 140 ? 36 : 25 }]}>{label}</Text><Text style={s.ringCaption}>{caption}</Text>
  </View>;
}
function Section({ title, label, onPress }: { title: string; label?: string; onPress?: () => void }) {
  return <View style={s.sectionHeading}><Text style={s.sectionTitle}>{title}</Text>{label && <Pressable accessibilityRole="button" onPress={onPress} hitSlop={10}><Text style={s.link}>{label} <Icon name="arrow-forward" size={13} color={C.green} /></Text></Pressable>}</View>;
}
function Empty({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return <View style={s.empty}><Icon name={icon} color={C.blue} size={32} /><Text style={s.emptyTitle}>{title}</Text><Text style={s.body}>{text}</Text></View>;
}
function Field({ label, value, onChange, numeric = false, placeholder }: { label: string; value: string; onChange: (text: string) => void; numeric?: boolean; placeholder?: string }) {
  return <View style={s.field}><Text style={s.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.muted} keyboardType={numeric ? 'decimal-pad' : 'default'} maxLength={numeric ? 8 : 80} style={s.input} /></View>;
}

export default function App() { return <SafeAreaProvider><JournalApp /></SafeAreaProvider>; }
function JournalApp() {
  const [journal, setJournal] = useState<Journal>(() => initialJournal());
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [tab, setTab] = useState<Tab>('today');
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [today, setToday] = useState(dateKey());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const formDate = useRef(selectedDate);
  const day = journal.days[selectedDate] ?? emptyDay();
  const sum = totals(day);
  const goals = journal.goals;
  const isToday = selectedDate === today;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE).then(raw => {
      if (!active) return;
      if (raw !== null) {
        try { setJournal(parseJournal(raw)); }
        catch { setStorageBlocked(true); setStorageError('Le journal enregistré est illisible. Il est conservé. Effacez-le dans les réglages pour repartir de zéro.'); }
      }
      setLoaded(true);
    }).catch(() => { if (active) { setStorageBlocked(true); setStorageError('Impossible de lire la sauvegarde. Réessayez avant de saisir des données.'); setLoaded(true); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!loaded || storageBlocked) return;
    const raw = JSON.stringify(journal);
    saveQueue.current = saveQueue.current.then(() => AsyncStorage.setItem(STORAGE, raw)).then(() => setStorageError('')).catch(() => setStorageError('La sauvegarde a échoué. Vos dernières saisies sont uniquement en mémoire.'));
  }, [journal, loaded, storageBlocked]);
  useEffect(() => {
    const refresh = () => {
      const next = dateKey();
      setToday(previous => { if (previous !== next) setSelectedDate(selected => selected === previous ? next : selected); return next; });
    };
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    const timer = setInterval(refresh, 30000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);
  const dispatch = (action: Action) => {
    if (storageBlocked && action.type !== 'clear') return;
    if (action.type === 'clear') { setStorageBlocked(false); setStorageError(''); }
    setJournal(current => reduceJournal(current, action));
  };
  function open(target: Sheet) {
    formDate.current = selectedDate;
    setError('');
    if (target === 'meal') setForm({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    if (target === 'workout') setForm({ name: 'Course à pied', minutes: '30', intensity: '5' });
    if (target === 'recovery') setForm({ sleep: String(day.sleep || 8).replace('.', ','), energy: String(day.energy || 3) });
    if (target === 'goals') setForm(Object.fromEntries(Object.entries(goals).map(([key, value]) => [key, String(value).replace('.', ',')])));
    setSheet(target);
  }
  function saveForm() {
    if (storageBlocked && sheet !== 'clear') { setError('La sauvegarde doit être rétablie avant toute saisie.'); return; }
    const numeric = (key: string, min: number, max: number) => numberInput(form[key] ?? '', min, max);
    if (sheet === 'meal') {
      const calories = numeric('calories', 1, 10000), protein = numeric('protein', 0, 1000), carbs = numeric('carbs', 0, 1000), fat = numeric('fat', 0, 1000);
      if (!form.name?.trim() || calories === null || protein === null || carbs === null || fat === null) { setError('Ajoutez un nom, 1 à 10 000 kcal et des macros entre 0 et 1 000 g.'); return; }
      dispatch({ type: 'meal', date: formDate.current, meal: { id: uid(), name: form.name.trim(), calories, protein, carbs, fat } });
    } else if (sheet === 'workout') {
      const minutes = numeric('minutes', 1, 600), intensity = numeric('intensity', 1, 10);
      if (!form.name?.trim() || minutes === null || intensity === null) { setError('Ajoutez un nom, une durée de 1 à 600 min et un effort de 1 à 10.'); return; }
      dispatch({ type: 'workout', date: formDate.current, workout: { id: uid(), name: form.name.trim(), minutes, intensity } });
    } else if (sheet === 'recovery') {
      const sleep = numeric('sleep', 0, 24), energy = numeric('energy', 1, 5);
      if (sleep === null || energy === null || !Number.isInteger(energy)) { setError('Indiquez 0 à 24 h de sommeil et une énergie de 1 à 5.'); return; }
      dispatch({ type: 'recovery', date: formDate.current, sleep, energy });
    } else if (sheet === 'goals') {
      const calories = numeric('calories', 500, 10000), protein = numeric('protein', 10, 500), water = numeric('water', 250, 10000), sleep = numeric('sleep', 1, 16);
      if (calories === null || protein === null || water === null || sleep === null) { setError('Objectifs acceptés : 500–10 000 kcal, 10–500 g de protéines, 250–10 000 ml d’eau, 1–16 h de sommeil.'); return; }
      dispatch({ type: 'goals', goals: { calories, protein, water, sleep } });
    } else if (sheet === 'clear') { dispatch({ type: 'clear' }); }
    setSheet(null);
  }
  function shiftDate(delta: number) {
    const d = new Date(`${selectedDate}T12:00:00`); d.setDate(d.getDate() + delta);
    const key = dateKey(d); if (key <= today) setSelectedDate(key);
  }
  const dateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const titles: Record<Tab, string> = { today: 'Votre équilibre.', activity: 'Chaque mouvement compte.', nutrition: 'Bien manger. Mieux vivre.' };
  const sheetTitles: Record<Exclude<Sheet, null>, string> = { meal: 'Ajouter un repas', workout: 'Enregistrer une activité', recovery: 'Comment vous sentez-vous ?', goals: 'Vos objectifs', clear: 'Repartir de zéro ?' };

  if (!loaded) return <SafeAreaView style={s.screen}><StatusBar style="light" /><View style={s.loading}><ActivityIndicator color={C.green} /><Text style={s.body}>Votre journal se prépare…</Text></View></SafeAreaView>;
  return <SafeAreaView style={s.screen} edges={['top', 'left', 'right']}><StatusBar style="light" />
    <View style={s.container}>
      <View style={s.header}><View style={s.brand}><View style={s.brandMark}><Icon name="pulse" color={C.bg} size={23} /></View><Text style={s.brandName}>profilage<Text style={{ color: C.green }}>.</Text></Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir les objectifs et réglages" onPress={() => open('goals')} style={s.iconButton}><Icon name="options-outline" color={C.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.dateRow}><Pressable accessibilityRole="button" accessibilityLabel="Jour précédent" onPress={() => shiftDate(-1)} style={s.dateArrow}><Icon name="chevron-back" size={18} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Revenir à aujourd’hui" onPress={() => setSelectedDate(today)}><Text style={s.dateText}>{isToday ? 'AUJOURD’HUI' : 'VOTRE JOURNAL'} · {dateLabel.toUpperCase()}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Jour suivant" disabled={isToday} onPress={() => shiftDate(1)} style={[s.dateArrow, isToday && { opacity: 0.25 }]}><Icon name="chevron-forward" size={18} /></Pressable></View>
        <Text style={s.pageTitle}>{titles[tab]}</Text><Text style={s.subtitle}>{tab === 'today' ? 'Un peu plus à l’écoute de vous, chaque jour.' : tab === 'activity' ? 'Vos séances, votre rythme, vos progrès.' : 'Faites le plein pour ce qui vous attend.'}</Text>
        {journal.demo && <View style={s.demoBanner}><Icon name="sparkles-outline" size={16} color={C.orange} /><Text style={s.demoText}>Journal prérempli pour découvrir l’app.</Text><Pressable accessibilityRole="button" onPress={() => open('clear')}><Text style={s.demoLink}>Effacer</Text></Pressable></View>}
        {!!storageError && <View style={s.errorBanner}><Text accessibilityRole="alert" style={s.error}>{storageError}</Text><Button secondary title="Réessayer la sauvegarde" onPress={() => {
          if (storageBlocked) AsyncStorage.getItem(STORAGE).then(raw => { if (raw !== null) setJournal(parseJournal(raw)); setStorageBlocked(false); setStorageError(''); }).catch(() => setStorageError('Lecture toujours impossible. Les données existantes sont conservées.'));
          else setJournal(current => ({ ...current }));
        }} /></View>}

        {tab === 'today' && <>
          <View style={s.hero}><View style={s.heroTop}><View style={s.pill}><View style={s.dot} /><Text style={s.pillText}>VOTRE RESSENTI</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Modifier sommeil et énergie" onPress={() => open('recovery')}><Icon name="create-outline" color={C.muted} size={22} /></Pressable></View>
            <View style={s.heroBody}><Ring value={day.energy} goal={5} size={154} label={day.energy ? `${day.energy}/5` : '—'} caption="ÉNERGIE" /><View style={s.heroCopy}><Text style={s.heroTitle}>{day.energy >= 4 ? 'Une belle énergie.' : day.energy ? 'Écoutez votre rythme.' : 'Prenez de vos nouvelles.'}</Text><Text style={s.body}>{day.energy ? 'Votre ressenti guide votre journée. Ajustez vos activités à vos sensations.' : 'Notez votre sommeil et votre énergie pour commencer votre journée.'}</Text><Pressable accessibilityRole="button" onPress={() => open('recovery')}><Text style={s.link}>Faire mon bilan <Icon name="arrow-forward" color={C.green} size={14} /></Text></Pressable></View></View>
            <View style={s.heroFooter}><Icon name="moon-outline" color={C.blue} size={17} /><Text style={s.heroFooterText}>{day.sleep ? `${day.sleep.toLocaleString('fr-FR')} h de sommeil saisies` : 'Sommeil à renseigner'}</Text><Text style={s.small}>Objectif {goals.sleep.toLocaleString('fr-FR')} h</Text></View>
          </View>
          <View style={s.duo}><Pressable accessibilityRole="button" accessibilityLabel="Voir mes activités" onPress={() => setTab('activity')} style={[s.card, s.half]}><Icon name="fitness-outline" color={C.orange} /><Text style={s.metric}>{day.workouts.reduce((n, w) => n + w.minutes, 0)}<Text style={s.unit}> min</Text></Text><Text style={s.metricLabel}>En mouvement</Text><Text style={s.small}>{day.workouts.length} séance{day.workouts.length > 1 ? 's' : ''} enregistrée{day.workouts.length > 1 ? 's' : ''}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Voir ma nutrition" onPress={() => setTab('nutrition')} style={[s.card, s.half]}><Icon name="restaurant-outline" color={C.green} /><Text style={s.metric}>{fmt(sum.calories)}<Text style={s.unit}> kcal</Text></Text><Text style={s.metricLabel}>Énergie consommée</Text><Bar value={sum.calories} goal={goals.calories} /><Text style={s.small}>sur {fmt(goals.calories)} kcal</Text></Pressable></View>
          <Section title="Vos essentiels" />
          <View style={s.card}><View style={s.row}><View style={[s.tileIcon, { backgroundColor: '#213348' }]}><Icon name="water-outline" color={C.blue} /></View><View style={s.flex}><Text style={s.cardTitle}>Un verre à la fois</Text><Text style={s.small}>{(day.water / 1000).toLocaleString('fr-FR')} / {(goals.water / 1000).toLocaleString('fr-FR')} L d’eau</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Ajouter 250 ml d’eau" onPress={() => dispatch({ type: 'water', date: selectedDate, delta: 250 })} style={s.addCircle}><Icon name="add" color={C.blue} /></Pressable></View><Bar value={day.water} goal={goals.water} color={C.blue} /></View>
          <Section title="Les 7 derniers jours" label="Activité" onPress={() => setTab('activity')} />
          <View style={s.card}><Text style={s.cardTitle}>Votre régularité</Text><Text style={s.small}>Minutes d’activité enregistrées</Text><View style={s.chart}>{Array.from({ length: 7 }, (_, i) => {
            const d = new Date(`${selectedDate}T12:00:00`); d.setDate(d.getDate() - 6 + i); const key = dateKey(d); const minutes = (journal.days[key]?.workouts ?? []).reduce((n, w) => n + w.minutes, 0);
            const all = Object.values(journal.days).map(v => v.workouts.reduce((n, w) => n + w.minutes, 0)); const max = Math.max(60, ...all);
            return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${d.toLocaleDateString('fr-FR')}, ${minutes} minutes. Ouvrir ce jour`} onPress={() => setSelectedDate(key)} style={s.chartColumn}><Text style={s.chartValue}>{minutes || '·'}</Text><View style={s.chartTrack}><View style={[s.chartBar, { height: Math.max(3, minutes / max * 74), backgroundColor: i === 6 ? C.green : '#375249' }]} /></View><Text style={[s.small, i === 6 && { color: C.green }]}>{d.toLocaleDateString('fr-FR', { weekday: 'short' }).slice(0, 3)}</Text></Pressable>;
          })}</View></View>
        </>}

        {tab === 'activity' && <>
          <View style={s.card}><View style={s.row}><View style={s.flex}><Text style={s.overline}>TEMPS ACTIF</Text><Text style={s.bigMetric}>{day.workouts.reduce((n, w) => n + w.minutes, 0)}<Text style={s.unit}> min</Text></Text><Text style={s.small}>{day.workouts.length} séance{day.workouts.length > 1 ? 's' : ''} · {isToday ? 'aujourd’hui' : 'ce jour'}</Text></View><View style={[s.activityGlyph, { backgroundColor: '#302A24' }]}><Icon name="fitness-outline" size={42} color={C.orange} /></View></View><View style={s.divider} /><View style={s.row}><Text style={s.body}>Charge déclarée</Text><Text style={[s.cardTitle, { color: C.orange }]}>{fmt(effort(day))} unités</Text></View><Text style={s.small}>Durée × effort perçu (1–10). Sans mesure de capteur.</Text></View>
          <Button title="Enregistrer une activité" icon="add" onPress={() => open('workout')} disabled={storageBlocked} />
          <Section title="Vos séances" />
          {day.workouts.length === 0 ? <Empty icon="walk-outline" title="À votre rythme" text="Une marche, une course ou une séance de yoga : chaque mouvement a sa place ici." /> : day.workouts.map(workout => <View key={workout.id} style={s.card}><View style={s.row}><View style={[s.tileIcon, { backgroundColor: '#302A24' }]}><Icon name="barbell-outline" color={C.orange} /></View><View style={s.flex}><Text style={s.cardTitle}>{workout.name}</Text><Text style={s.small}>{workout.minutes} min · Effort {workout.intensity}/10</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`Supprimer l’activité ${workout.name}`} onPress={() => dispatch({ type: 'removeWorkout', date: selectedDate, id: workout.id })} hitSlop={10}><Icon name="trash-outline" size={18} /></Pressable></View><Bar value={workout.intensity} goal={10} color={C.orange} /></View>)}
          <View style={s.note}><Icon name="information-circle-outline" color={C.orange} /><Text style={[s.body, s.flex]}>L’effort perçu est votre propre évaluation : 1 pour très facile, 10 pour maximal. Ce journal ne mesure ni la fréquence cardiaque ni les calories dépensées.</Text></View>
        </>}

        {tab === 'nutrition' && <>
          <View style={s.card}><View style={s.row}><View style={s.flex}><Text style={s.overline}>VOTRE APPORT DU JOUR</Text><Text style={s.bigMetric}>{fmt(sum.calories)}<Text style={s.unit}> kcal</Text></Text><Text style={s.small}>Objectif personnel · {fmt(goals.calories)} kcal</Text></View><Ring value={sum.calories} goal={goals.calories} label={`${Math.round(sum.calories / goals.calories * 100)}%`} caption="OBJECTIF" size={100} /></View><Bar value={sum.calories} goal={goals.calories} /><Text style={s.body}>{sum.calories <= goals.calories ? `${fmt(goals.calories - sum.calories)} kcal jusqu’à votre objectif` : `${fmt(sum.calories - goals.calories)} kcal au-dessus de votre objectif`}</Text><View style={s.macros}>{[{ name: 'Protéines', value: sum.protein, color: C.green }, { name: 'Glucides', value: sum.carbs, color: C.blue }, { name: 'Lipides', value: sum.fat, color: C.orange }].map(macro => <View key={macro.name} style={s.macro}><View style={[s.macroDot, { backgroundColor: macro.color }]} /><Text style={s.cardTitle}>{fmt(macro.value)} g</Text><Text style={s.small}>{macro.name}</Text></View>)}</View><Text style={s.small}>Protéines : {fmt(sum.protein)} / {fmt(goals.protein)} g</Text></View>
          <Button title="Ajouter un repas" icon="add" onPress={() => open('meal')} disabled={storageBlocked} />
          <Section title="Votre journal alimentaire" />
          {day.meals.length === 0 ? <Empty icon="restaurant-outline" title="Une page à remplir" text="Ajoutez votre premier repas et retrouvez vos apports au fil de la journée." /> : day.meals.map(meal => <View key={meal.id} style={s.card}><View style={s.row}><View style={[s.tileIcon, { backgroundColor: '#273525' }]}><Icon name="leaf-outline" color={C.green} /></View><View style={s.flex}><Text style={s.cardTitle}>{meal.name}</Text><Text style={s.small}>P {fmt(meal.protein)} · G {fmt(meal.carbs)} · L {fmt(meal.fat)} g</Text></View><Text style={s.mealKcal}>{fmt(meal.calories)}<Text style={s.small}> kcal</Text></Text><Pressable accessibilityRole="button" accessibilityLabel={`Supprimer le repas ${meal.name}`} onPress={() => dispatch({ type: 'removeMeal', date: selectedDate, id: meal.id })} hitSlop={10}><Icon name="close" size={20} /></Pressable></View></View>)}
          <Section title="Hydratation" /><View style={s.card}><View style={s.row}><Icon name="water-outline" color={C.blue} size={28} /><Text style={[s.metric, s.flex]}>{fmt(day.water)}<Text style={s.unit}> ml</Text></Text><Text style={s.small}>/ {fmt(goals.water)} ml</Text></View><Bar value={day.water} goal={goals.water} color={C.blue} /><View style={s.row}><View style={s.flex}><Button title="− 250 ml" secondary disabled={storageBlocked || day.water === 0} onPress={() => dispatch({ type: 'water', date: selectedDate, delta: -250 })} /></View><View style={s.flex}><Button title="+ 250 ml" secondary disabled={storageBlocked || day.water === 10000} onPress={() => dispatch({ type: 'water', date: selectedDate, delta: 250 })} /></View></View></View>
        </>}
        <Text style={s.footer}>VOTRE JOURNAL. VOTRE RYTHME.</Text>
      </ScrollView>
      <SafeAreaView edges={['bottom']} style={s.nav}><View style={s.navRow}>{([{ key: 'today', label: 'Aujourd’hui', icon: 'grid-outline' }, { key: 'activity', label: 'Activité', icon: 'pulse-outline' }, { key: 'nutrition', label: 'Nutrition', icon: 'restaurant-outline' }] as { key: Tab; label: string; icon: IconName }[]).map(item => <Pressable key={item.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: tab === item.key }} onPress={() => setTab(item.key)} style={s.navItem}><View style={[s.navIcon, tab === item.key && { backgroundColor: '#253726' }]}><Icon name={item.icon} color={tab === item.key ? C.green : C.muted} size={22} /></View><Text style={[s.navLabel, tab === item.key && { color: C.green }]}>{item.label}</Text></Pressable>)}</View></SafeAreaView>
    </View>

    <Modal visible={sheet !== null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
      <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><Pressable accessibilityRole="button" accessibilityLabel="Fermer le formulaire" style={StyleSheet.absoluteFill} onPress={() => setSheet(null)} /><SafeAreaView style={s.sheet} edges={['bottom']}><View style={s.sheetHandle} /><View style={s.sheetHeading}><Text style={s.sheetTitle}>{sheet ? sheetTitles[sheet] : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={() => setSheet(null)} style={s.iconButton}><Icon name="close" color={C.text} /></Pressable></View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.sheetContent}>
          {sheet === 'meal' && <><Text style={s.body}>Renseignez les valeurs de votre repas ou partez d’un exemple à ajuster.</Text><View style={s.presetRow}>{PRESETS.map(preset => <Pressable accessibilityRole="button" key={preset.name} onPress={() => setForm(Object.fromEntries(Object.entries(preset).map(([key, value]) => [key, String(value)])))} style={s.chip}><Text style={s.chipText}>{preset.name}</Text></Pressable>)}</View><Field label="Nom du repas" value={form.name ?? ''} onChange={name => setForm(current => ({ ...current, name }))} placeholder="Ex. Déjeuner" />{[{ key: 'calories', label: 'Énergie (kcal)' }, { key: 'protein', label: 'Protéines (g)' }, { key: 'carbs', label: 'Glucides (g)' }, { key: 'fat', label: 'Lipides (g)' }].map(field => <Field key={field.key} label={field.label} numeric value={form[field.key] ?? ''} onChange={value => setForm(current => ({ ...current, [field.key]: value }))} />)}<Text style={s.small}>Les exemples sont des estimations, sans base alimentaire connectée.</Text></>}
          {sheet === 'workout' && <><View style={s.presetRow}>{['Course à pied', 'Musculation', 'Vélo', 'Marche', 'Yoga'].map(name => <Pressable accessibilityRole="button" key={name} onPress={() => setForm(current => ({ ...current, name }))} style={[s.chip, form.name === name && s.selectedChip]}><Text style={[s.chipText, form.name === name && { color: C.green }]}>{name}</Text></Pressable>)}</View><Field label="Activité" value={form.name ?? ''} onChange={name => setForm(current => ({ ...current, name }))} /><Field label="Durée (minutes)" numeric value={form.minutes ?? ''} onChange={minutes => setForm(current => ({ ...current, minutes }))} /><Text style={s.fieldLabel}>Effort perçu · {form.intensity}/10</Text><View style={s.effortRow}>{Array.from({ length: 10 }, (_, i) => i + 1).map(value => <Pressable accessibilityRole="button" accessibilityLabel={`Effort ${value} sur 10`} accessibilityState={{ selected: form.intensity === String(value) }} key={value} onPress={() => setForm(current => ({ ...current, intensity: String(value) }))} style={[s.effortStep, form.intensity === String(value) && { backgroundColor: C.orange }]}><Text style={[s.chipText, form.intensity === String(value) && { color: C.bg }]}>{value}</Text></Pressable>)}</View><View style={s.row}><Text style={s.small}>Très facile</Text><Text style={s.small}>Maximal</Text></View></>}
          {sheet === 'recovery' && <><Text style={s.body}>Un bilan personnel, sans capteur ni score médical.</Text><Field label="Sommeil (heures)" numeric value={form.sleep ?? ''} onChange={sleep => setForm(current => ({ ...current, sleep }))} /><Text style={s.fieldLabel}>Votre énergie · {form.energy}/5</Text><View style={s.energyRow}>{['À plat', 'Basse', 'Correcte', 'Bonne', 'Au top'].map((label, index) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={`Énergie ${index + 1} sur 5, ${label}`} accessibilityState={{ selected: form.energy === String(index + 1) }} onPress={() => setForm(current => ({ ...current, energy: String(index + 1) }))} style={[s.energyStep, form.energy === String(index + 1) && s.selectedChip]}><Text style={[s.energyNumber, form.energy === String(index + 1) && { color: C.green }]}>{index + 1}</Text><Text style={s.energyLabel}>{label}</Text></Pressable>)}</View></>}
          {sheet === 'goals' && <><Text style={s.body}>Des repères que vous choisissez. Les valeurs proposées ne sont pas des recommandations personnalisées.</Text>{[{ key: 'calories', label: 'Énergie quotidienne (kcal)' }, { key: 'protein', label: 'Protéines quotidiennes (g)' }, { key: 'water', label: 'Eau quotidienne (ml)' }, { key: 'sleep', label: 'Sommeil (heures)' }].map(field => <Field key={field.key} label={field.label} numeric value={form[field.key] ?? ''} onChange={value => setForm(current => ({ ...current, [field.key]: value }))} />)}<View style={s.note}><Icon name="lock-closed-outline" color={C.blue} /><Text style={[s.body, s.flex]}>Le journal est enregistré sur cet appareil, sans compte ni synchronisation. Aucune connexion à WHOOP ou à une montre pour le moment.</Text></View><Button secondary title="Effacer le journal" icon="trash-outline" onPress={() => open('clear')} /></>}
          {sheet === 'clear' && <Text style={s.body}>Tous les repas, activités et bilans enregistrés sur cet appareil seront effacés, y compris les exemples. Vos objectifs seront conservés. Cette action est définitive.</Text>}
          {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
          <Button title={sheet === 'clear' ? 'Confirmer l’effacement' : 'Enregistrer'} onPress={saveForm} />
        </ScrollView>
      </SafeAreaView></KeyboardAvoidingView>
    </Modal>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg }, container: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 16 }, brand: { flexDirection: 'row', alignItems: 'center', gap: 10 }, brandMark: { width: 34, height: 34, backgroundColor: C.green, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, brandName: { color: C.text, fontSize: 25, fontWeight: '800', letterSpacing: -1 }, iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: C.card },
  content: { paddingHorizontal: 22, paddingBottom: 24, gap: 16 }, dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }, dateArrow: { padding: 5 }, dateText: { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textAlign: 'center' }, pageTitle: { color: C.text, fontSize: 33, fontWeight: '800', letterSpacing: -1.1, marginTop: 4 }, subtitle: { color: C.muted, fontSize: 14, lineHeight: 22, marginTop: -10 },
  card: { backgroundColor: C.card, borderRadius: 22, padding: 20, borderWidth: 1, borderColor: '#1F2B36', gap: 12 }, duo: { flexDirection: 'row', gap: 12 }, half: { flex: 1, padding: 17 }, row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, flex: { flex: 1, gap: 4 }, cardTitle: { color: C.text, fontSize: 15, fontWeight: '700', lineHeight: 22 }, body: { color: C.muted, fontSize: 14, lineHeight: 22 }, small: { color: C.muted, fontSize: 11, lineHeight: 17 }, overline: { color: C.muted, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' }, metric: { color: C.text, fontSize: 27, fontWeight: '700', letterSpacing: -0.7 }, bigMetric: { color: C.text, fontSize: 40, fontWeight: '700', letterSpacing: -1.4 }, unit: { color: C.muted, fontSize: 13, fontWeight: '500', letterSpacing: 0 }, metricLabel: { color: C.text, fontSize: 12, fontWeight: '600' },
  hero: { backgroundColor: '#18261F', borderRadius: 24, borderWidth: 1, borderColor: '#2A4130', padding: 20, gap: 18 }, heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, pill: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }, pillText: { color: C.green, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 }, heroBody: { flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' }, heroCopy: { flex: 1, minWidth: 120, gap: 10 }, heroTitle: { color: C.text, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.5 }, heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: '#304034', paddingTop: 16, flexWrap: 'wrap' }, heroFooterText: { color: C.text, fontSize: 12, flex: 1 }, ringNumber: { fontWeight: '800', letterSpacing: -1 }, ringCaption: { color: C.muted, fontSize: 9, letterSpacing: 1, marginTop: 4, fontWeight: '600' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }, sectionTitle: { color: C.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.4 }, link: { color: C.green, fontSize: 12, fontWeight: '600', lineHeight: 20 }, track: { height: 5, borderRadius: 4, backgroundColor: C.line, overflow: 'hidden' }, fill: { height: 5, borderRadius: 4 }, tileIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, addCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#243549', alignItems: 'center', justifyContent: 'center' }, activityGlyph: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, divider: { height: 1, backgroundColor: C.line, marginVertical: 4 },
  button: { minHeight: 50, borderRadius: 16, backgroundColor: C.green, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 }, secondaryButton: { backgroundColor: '#21303E', borderWidth: 1, borderColor: C.line }, buttonText: { color: C.bg, fontSize: 14, fontWeight: '700', textAlign: 'center' },
  demoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#29251F', borderRadius: 12, padding: 12 }, demoText: { color: C.orange, fontSize: 11, lineHeight: 17, flex: 1 }, demoLink: { color: C.orange, fontSize: 11, fontWeight: '700', paddingVertical: 6 }, errorBanner: { backgroundColor: '#33242C', padding: 16, borderRadius: 14, gap: 12 }, error: { color: C.red, fontSize: 13, lineHeight: 20 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 }, chartColumn: { flex: 1, alignItems: 'center', gap: 7 }, chartValue: { color: C.muted, fontSize: 10 }, chartTrack: { height: 74, justifyContent: 'flex-end', width: 23 }, chartBar: { width: 23, borderRadius: 5 }, note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8 }, empty: { padding: 32, alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 22 }, emptyTitle: { color: C.text, fontSize: 18, fontWeight: '700' }, macros: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.line, paddingTop: 18, marginTop: 4 }, macro: { flex: 1, alignItems: 'center', gap: 4 }, macroDot: { height: 3, width: 24, borderRadius: 3, marginBottom: 4 }, mealKcal: { color: C.text, fontSize: 15, fontWeight: '700' }, footer: { color: '#536675', fontSize: 9, letterSpacing: 2, textAlign: 'center', paddingVertical: 12 },
  nav: { borderTopWidth: 1, borderTopColor: C.line, backgroundColor: '#0F1720' }, navRow: { flexDirection: 'row', paddingTop: 8, paddingBottom: 10 }, navItem: { flex: 1, alignItems: 'center', gap: 5 }, navIcon: { width: 56, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, navLabel: { color: C.muted, fontSize: 10, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' }, sheet: { backgroundColor: C.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, width: '100%', maxWidth: 680, maxHeight: '92%', alignSelf: 'center', borderWidth: 1, borderColor: C.line }, sheetHandle: { alignSelf: 'center', width: 38, height: 4, backgroundColor: C.line, borderRadius: 3, marginTop: 12 }, sheetHeading: { paddingHorizontal: 22, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, sheetTitle: { color: C.text, fontSize: 21, fontWeight: '700', flex: 1 }, sheetContent: { paddingHorizontal: 22, paddingBottom: 24, gap: 18 }, field: { gap: 8 }, fieldLabel: { color: C.text, fontSize: 13, fontWeight: '600' }, input: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, color: C.text, backgroundColor: C.card, fontSize: 16, minHeight: 50 }, presetRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, chip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.card, borderWidth: 1, borderColor: C.line }, selectedChip: { borderColor: C.green, backgroundColor: '#203424' }, chipText: { color: C.text, fontSize: 12, fontWeight: '600' }, effortRow: { flexDirection: 'row', gap: 4 }, effortStep: { flex: 1, minHeight: 44, borderRadius: 8, backgroundColor: C.card, justifyContent: 'center', alignItems: 'center' }, energyRow: { flexDirection: 'row', gap: 6 }, energyStep: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 }, energyNumber: { color: C.text, fontSize: 22, fontWeight: '700' }, energyLabel: { color: C.muted, fontSize: 9 },
});
