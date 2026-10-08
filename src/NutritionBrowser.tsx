import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { findBarcode, FoodProduct, searchFoods } from './food';
import { CiqualRow, searchCiqual } from './ciqual';
import ciqual from './data/ciqual-2025.json';

export function NutritionBrowser({ onPick, startWithScan = false }: { onPick: (product: FoodProduct) => void; startWithScan?: boolean }) {
  const [query, setQuery] = useState(''); const [barcode, setBarcode] = useState('');
  const [catalogue, setCatalogue] = useState<'ciqual' | 'brands'>('ciqual');
  const [products, setProducts] = useState<FoodProduct[]>([]);
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(startWithScan); const [page, setPage] = useState(1);
  const [more, setMore] = useState(false); const [lastQuery, setLastQuery] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function run(code?: string, nextPage = 1) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setBusy(true); setMessage(''); setScanning(false);
    if (nextPage === 1) { setProducts([]); setMore(false); }
    try {
      if (code !== undefined) {
        setCatalogue('brands');
        setBarcode(code); const product = await findBarcode(code, controller.signal);
        if (controller.signal.aborted) return;
        setProducts(product ? [product] : []); setMore(false);
        if (!product) setMessage('Produit introuvable ou sans fiche exploitable. Vous pouvez saisir son étiquette manuellement.');
      } else {
        const term = nextPage === 1 ? query : lastQuery;
        if (term.trim().length < 2) throw new Error('Saisissez au moins deux caractères.');
        const result = catalogue === 'ciqual' ? searchCiqual(ciqual as CiqualRow[], term, nextPage) : await searchFoods(term, nextPage, controller.signal);
        if (controller.signal.aborted) return;
        setProducts(current => nextPage === 1 ? result.products : [...current, ...result.products.filter(product => !current.some(item => item.id === product.id))]);
        setPage(nextPage); setLastQuery(term); setMore(result.more);
        if (!result.products.length) setMessage('Aucun résultat exploitable. Essayez une marque ou un code-barres, ou saisissez l’aliment manuellement.');
      }
    } catch (error) { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'La recherche a échoué.'); }
    finally { if (request.current === controller) setBusy(false); }
  }
  return <View style={styles.root}>
    <Text style={styles.body}>{catalogue === 'ciqual' ? '3 484 aliments et plats de la table Anses Ciqual 2025, consultables même sans connexion.' : 'Recherchez vos marques dans Open Food Facts. Les fiches sont collaboratives : vérifiez les valeurs avec l’étiquette.'}</Text>
    <View style={styles.row}>{[{ id: 'ciqual', label: 'Aliments · Ciqual' }, { id: 'brands', label: 'Produits de marque' }].map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: catalogue === item.id }} onPress={() => { request.current?.abort(); setBusy(false); setCatalogue(item.id as 'ciqual' | 'brands'); setProducts([]); setMore(false); setMessage(''); }} style={[styles.secondary, styles.flex, catalogue === item.id && { borderWidth: 1, borderColor: '#B2F481' }]}><Text style={styles.buttonText}>{item.label}</Text></Pressable>)}</View>
    <Text style={styles.label}>Aliment ou marque</Text>
    <View style={styles.row}><TextInput accessibilityLabel="Rechercher un aliment ou une marque" placeholder="Ex. yaourt nature, pâtes…" placeholderTextColor="#96A7B8" value={query} onChangeText={setQuery} onSubmitEditing={() => void run()} returnKeyType="search" maxLength={100} style={[styles.input, styles.flex]} /><Pressable accessibilityRole="button" accessibilityLabel="Lancer la recherche alimentaire" disabled={busy} onPress={() => void run()} style={styles.square}><Ionicons name="search" size={23} color="#0B1118" /></Pressable></View>
    <Text style={styles.label}>Code-barres</Text><View style={styles.row}><TextInput accessibilityLabel="Chiffres du code-barres" placeholder="8, 12, 13 ou 14 chiffres" placeholderTextColor="#96A7B8" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" maxLength={20} style={[styles.input, styles.flex]} /><Pressable accessibilityRole="button" accessibilityLabel="Chercher ce code-barres" disabled={busy} onPress={() => void run(barcode)} style={styles.square}><Ionicons name="arrow-forward" size={23} color="#0B1118" /></Pressable></View>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setScanning(value => !value); setMessage(''); }} style={styles.secondary}><Ionicons name="barcode-outline" size={22} color="#8DB9FF" /><Text style={styles.buttonText}>{scanning ? 'Fermer le scanner' : 'Scanner avec la caméra'}</Text></Pressable>
    {scanning && <BarcodeScanner onRead={code => void run(code)} />}
    {busy && <View style={styles.row}><ActivityIndicator color="#B2F481" /><Text style={styles.body}>Recherche en cours…</Text></View>}
    {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    {products.map(product => <Pressable key={product.id} accessibilityRole="button" accessibilityLabel={`Choisir ${product.name}`} onPress={() => onPick(product)} style={styles.product}><View style={styles.row}><Ionicons name="nutrition-outline" size={24} color="#B2F481" /><View style={styles.flex}><Text style={styles.title}>{product.name}</Text><Text style={styles.small}>{product.brand || 'Marque non renseignée'} · {product.barcode ?? product.ciqualCode}</Text></View><Ionicons name="chevron-forward" color="#B2F481" size={18} /></View><Text style={styles.body}>{product.per100.calories === null ? 'Calories non renseignées' : `${Math.round(product.per100.calories)} kcal`} · pour {product.source === 'ciqual' ? '100 g' : '100 g / ml'}</Text><Text style={styles.small}>P {product.per100.protein ?? '—'} · G {product.per100.carbs ?? '—'} · L {product.per100.fat ?? '—'} g</Text>{Object.values(product.per100).some(value => value === null) && <Text style={styles.message}>Fiche incomplète : complétez les valeurs avant d’enregistrer.</Text>}</Pressable>)}
    {more && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void run(undefined, page + 1)} style={styles.secondary}><Text style={styles.buttonText}>Voir plus de résultats</Text></Pressable>}
    <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(catalogue === 'ciqual' ? 'https://ciqual.anses.fr/' : 'https://world.openfoodfacts.org').catch(() => setMessage('Impossible d’ouvrir le site de la base alimentaire.'))}><Text style={styles.small}>{catalogue === 'ciqual' ? 'Source : Anses. 2025. Table de composition nutritionnelle Ciqual. Les valeurs moyennes ne remplacent pas une étiquette spécifique.' : 'Source : Open Food Facts · Base ODbL, contenus DbCL. Une large base de produits emballés, sans garantie d’exhaustivité.'}</Text></Pressable>
  </View>;
}

function BarcodeScanner({ onRead }: { onRead: (code: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions(); const lock = useRef(false); const [cameraError, setCameraError] = useState('');
  if (!permission) return <ActivityIndicator color="#B2F481" />;
  if (!permission.granted) return <View style={styles.product}><Text style={styles.body}>La caméra est nécessaire pour lire le code-barres. Vous pouvez aussi saisir les chiffres sans autoriser la caméra.</Text><Pressable accessibilityRole="button" onPress={() => void (permission.canAskAgain ? requestPermission() : Linking.openSettings()).catch(() => setCameraError('Impossible d’ouvrir les autorisations caméra.'))} style={styles.secondary}><Text style={styles.buttonText}>{permission.canAskAgain ? 'Autoriser la caméra' : 'Ouvrir les réglages caméra'}</Text></Pressable>{!!cameraError && <Text style={styles.message}>{cameraError}</Text>}</View>;
  if (cameraError) return <Text accessibilityRole="alert" style={styles.message}>{cameraError}</Text>;
  return <View style={styles.scanner}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'itf14'] }} onMountError={() => setCameraError('Caméra indisponible. Saisissez les chiffres du code-barres.')} onBarcodeScanned={({ data }) => { if (!lock.current) { lock.current = true; onRead(data); } }} /><View pointerEvents="none" style={styles.scanFrame} /><Text style={styles.scanHint}>Placez le code-barres dans le cadre</Text></View>;
}
const styles = StyleSheet.create({
  root: { gap: 14 }, row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, flex: { flex: 1, gap: 4 }, body: { color: '#96A7B8', fontSize: 14, lineHeight: 22 }, small: { color: '#96A7B8', fontSize: 11, lineHeight: 18 }, label: { color: '#F2F5F6', fontSize: 13, fontWeight: '600' }, input: { minHeight: 50, backgroundColor: '#141D27', borderWidth: 1, borderColor: '#26323E', borderRadius: 14, padding: 14, color: '#F2F5F6', fontSize: 15 }, square: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#B2F481', justifyContent: 'center', alignItems: 'center' }, secondary: { minHeight: 50, backgroundColor: '#21303E', borderRadius: 14, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', padding: 12 }, buttonText: { color: '#F2F5F6', fontWeight: '700', fontSize: 13 }, product: { borderWidth: 1, borderColor: '#26323E', borderRadius: 18, padding: 16, backgroundColor: '#141D27', gap: 10 }, title: { color: '#F2F5F6', fontWeight: '700', fontSize: 15, lineHeight: 21 }, message: { color: '#FFBD7A', fontSize: 13, lineHeight: 21 }, scanner: { height: 240, borderRadius: 18, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#141D27' }, scanFrame: { width: '80%', height: 100, borderRadius: 12, borderWidth: 2, borderColor: '#B2F481' }, scanHint: { color: '#FFFFFF', backgroundColor: '#000000AA', padding: 8, borderRadius: 8, position: 'absolute', bottom: 12, fontSize: 12 },
});
