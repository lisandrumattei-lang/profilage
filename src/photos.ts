import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Directory, File, Paths } from 'expo-file-system';

export async function pickMealPhoto(camera: boolean): Promise<string | null> {
  if (camera) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Autorisez la caméra dans les réglages pour prendre une photo. Vous pouvez aussi choisir une image existante.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, allowsEditing: false, exif: false };
  const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];
  const context = ImageManipulator.manipulate(asset.uri);
  if (asset.width > 1280) context.resize({ width: 1280 });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: Platform.OS === 'web' });
  if (Platform.OS === 'web') {
    if (!saved.base64 || saved.base64.length > 1200000) throw new Error('La photo est trop volumineuse. Choisissez une image plus petite.');
    return `data:image/jpeg;base64,${saved.base64}`;
  }
  const directory = new Directory(Paths.document, 'meal-photos');
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`);
  new File(saved.uri).copy(file);
  return file.uri;
}

export function removeMealPhoto(uri: string | undefined): void {
  if (!uri || Platform.OS === 'web') return;
  // Only delete images that this app copied to its private meal directory.
  const prefix = new Directory(Paths.document, 'meal-photos').uri;
  if (!uri.startsWith(`${prefix.replace(/\/$/, '')}/`)) return;
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* A missing image must not prevent journal edits. */ }
}
