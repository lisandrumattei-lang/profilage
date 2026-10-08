import React, { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { GarminActivity, parseGarminTcx } from './garmin';
import { numberInput, Workout } from './model';

export function GarminImport({ onImport, exists }: { onImport: (date: string, workout: Workout) => void; exists: (id: string) => boolean }) {
  const [activity, setActivity] = useState<GarminActivity | null>(null); const [intensity, setIntensity] = useState('5');
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function pick() {
    setMessage(''); setActivity(null); setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false, base64: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!/\.tcx$/i.test(asset.name)) throw new Error('Choisissez un fichier .tcx exporté depuis Garmin Connect.');
      if (asset.size !== undefined && asset.size > 2000000) throw new Error('Le fichier doit faire moins de 2 Mo.');
      const xml = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
      const parsed = parseGarminTcx(xml);
      if (exists(parsed.id)) throw new Error('Cette activité a déjà été importée.');
      setActivity(parsed);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Impossible de lire ce fichier.'); }
    finally { setBusy(false); }
  }
  function confirm() {
    if (!activity) return;
    const value = numberInput(intensity, 1, 10);
    if (value === null) { setMessage('Indiquez votre effort perçu entre 1 et 10.'); return; }
    if (exists(activity.id)) { setMessage('Cette activité a déjà été importée.'); return; }
    const { date, ...workout } = activity;
    onImport(date, { ...workout, intensity: value, source: 'garmin-tcx' });
  }
  return <View style={styles.root}>
    <View style={styles.status}><Text style={styles.title}>Garmin · import manuel</Text><Text style={styles.body}>La synchronisation automatique nécessite l’accès officiel au programme développeur Garmin et un serveur de connexion. Aucun compte Garmin n’est connecté à Profilage pour le moment.</Text></View>
    <Pressable accessibilityRole="link" style={styles.button} onPress={() => void Linking.openURL('https://connect.garmin.com/modern/activities').catch(() => setMessage('Impossible d’ouvrir Garmin Connect.'))}><Text style={styles.buttonText}>Ouvrir Garmin Connect</Text></Pressable>
    <Text style={styles.body}>Sur votre Mac : ouvrez une activité dans Garmin Connect, utilisez le menu d’export et choisissez TCX. Enregistrez le fichier dans iCloud Drive, puis sélectionnez-le ici sur votre iPhone.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void pick()} style={styles.button}><Text style={styles.buttonText}>Choisir un fichier Garmin (.tcx)</Text></Pressable>
    {busy && <ActivityIndicator color="#B2F481" />}
    {activity && <View style={styles.status}><Text style={styles.title}>{activity.name}</Text><Text style={styles.body}>{activity.minutes} min{activity.distanceKm !== undefined ? ` · ${activity.distanceKm} km` : ''}</Text><Text style={styles.body}>Journal du {new Date(`${activity.date}T12:00:00`).toLocaleDateString('fr-FR')}</Text><Text style={styles.body}>Effort perçu (1–10), à renseigner par vous</Text><TextInput accessibilityLabel="Effort perçu pour l’activité Garmin" value={intensity} onChangeText={setIntensity} keyboardType="decimal-pad" maxLength={4} style={styles.input} /><Pressable accessibilityRole="button" onPress={confirm} style={[styles.button, { backgroundColor: '#B2F481' }]}><Text style={[styles.buttonText, { color: '#0B1118' }]}>Confirmer l’import Garmin</Text></Pressable></View>}
    {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    <Text style={styles.small}>Le fichier est traité sur votre appareil. Aucun mot de passe Garmin n’est demandé. Cet import récupère la durée et la distance, pas le sommeil ni les scores de récupération.</Text>
  </View>;
}
const styles = StyleSheet.create({ root: { gap: 18 }, status: { backgroundColor: '#141D27', padding: 18, borderRadius: 18, gap: 12, borderWidth: 1, borderColor: '#26323E' }, title: { color: '#F2F5F6', fontSize: 17, fontWeight: '700' }, body: { color: '#96A7B8', fontSize: 14, lineHeight: 22 }, small: { color: '#96A7B8', fontSize: 11, lineHeight: 18 }, button: { minHeight: 50, padding: 14, justifyContent: 'center', alignItems: 'center', borderRadius: 14, backgroundColor: '#21303E' }, buttonText: { color: '#F2F5F6', fontWeight: '700', fontSize: 14 }, input: { color: '#F2F5F6', fontSize: 17, padding: 14, backgroundColor: '#0B1118', borderRadius: 12, borderWidth: 1, borderColor: '#26323E' }, message: { color: '#FFBD7A', fontSize: 13, lineHeight: 22 } });
