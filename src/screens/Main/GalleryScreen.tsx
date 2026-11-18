import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme/AppThemeContext';

export default function GalleryScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Gallery'>) {
  const { palette, selectGalleryBackground } = useAppTheme();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Permission needed', 'Allow photo access to choose an image.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
      if (!result.canceled && result.assets[0]?.uri) setUri(result.assets[0].uri);
    } catch { Alert.alert('Gallery unavailable', 'Could not open your photo library.'); }
  };
  const useAsWallpaper = () => {
    if (!uri) return;
    selectGalleryBackground(uri);
    navigation.navigate('Themes');
  };
  return <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
    <Text style={[styles.title, { color: palette.text }]}>Gallery</Text>
    <Text style={[styles.body, { color: palette.muted }]}>Choose a photo from your device. Media stays on your device unless you explicitly upload it elsewhere.</Text>
    <Pressable accessibilityRole="button" onPress={() => void choose()} style={[styles.button, { backgroundColor: palette.accent }]}><Text style={{ color: palette.background, fontWeight: '900' }}>Choose photo</Text></Pressable>
    {busy && <ActivityIndicator color={palette.accent} />}
    {uri ? <View style={[styles.previewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}><Image source={{ uri }} resizeMode="cover" style={styles.preview} /><Pressable accessibilityRole="button" onPress={useAsWallpaper} style={[styles.button, { backgroundColor: palette.accent }]}><Text style={{ color: palette.background, fontWeight: '900' }}>Use as theme wallpaper</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setUri(null)}><Text style={[styles.clear, { color: palette.muted }]}>Clear selection</Text></Pressable></View> : <Text style={[styles.empty, { color: palette.muted }]}>{route.params?.selectForTheme ? 'Select a photo to use as your wallpaper.' : 'No photo selected yet.'}</Text>}
  </ScrollView>;
}
const styles = StyleSheet.create({ container: { flexGrow: 1, padding: 20 }, title: { fontSize: 26, fontWeight: '900' }, body: { fontSize: 14, lineHeight: 21, marginTop: 8 }, button: { minHeight: 46, paddingHorizontal: 15, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 16 }, previewCard: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 20 }, preview: { width: '100%', height: 260, borderRadius: 12 }, clear: { textAlign: 'center', padding: 13 }, empty: { textAlign: 'center', marginTop: 30 } });
