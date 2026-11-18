import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppTheme } from '../../theme/AppThemeContext';
import type { RootStackParamList } from '../../navigation/types';
import { saveAccountPreferences } from '../../services/launchFeatureService';

type Props = NativeStackScreenProps<RootStackParamList, 'Themes'>;
const OPTIONS = [
  { id: 'midnight', name: 'Midnight', detail: 'Classic black and gold' },
  { id: 'ocean', name: 'Ocean', detail: 'Calm teal tones' },
  { id: 'dusk', name: 'Dusk', detail: 'Warm violet and rose' },
] as const;
export default function ThemesScreen({ navigation }: Props) {
  const { themeId, palette, applyTheme } = useAppTheme();
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<string>(themeId);
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { supabase } = await import('../../../lib/supabase');
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error('Sign in to save a theme.');
      const id = selected as 'midnight' | 'ocean' | 'dusk';
      await saveAccountPreferences(data.user.id, { theme_id: id, custom_theme_name: 'Custom theme', background_path: null, custom_accent_color: null });
      applyTheme(id, 'Custom theme', null, null);
      Alert.alert('Theme saved', 'Your theme preference was updated.');
    } catch (error) {
      Alert.alert('Could not save theme', error instanceof Error ? error.message : 'Please try again.');
    } finally { setSaving(false); }
  };
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Choose a theme</Text><Text style={styles.body}>Select an appearance for BRITUME.</Text>
    {OPTIONS.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: selected === item.id }} onPress={() => setSelected(item.id)} style={[styles.card, selected === item.id && styles.selected]}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.body}>{item.detail}</Text></Pressable>)}
    <Pressable accessibilityRole="button" disabled={saving} onPress={() => void save()} style={styles.button}><Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save theme'}</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Gallery', { selectForTheme: true })} style={styles.secondary}><Text style={styles.secondaryText}>Choose wallpaper from Gallery</Text></Pressable>
  </ScrollView>;
}
function makeStyles(p: { background: string; surface: string; text: string; muted: string; border: string; accent: string }) { return StyleSheet.create({ container: { flexGrow: 1, backgroundColor: p.background, padding: 20 }, title: { color: p.text, fontSize: 26, fontWeight: '900' }, body: { color: p.muted, fontSize: 14, marginTop: 7 }, card: { backgroundColor: p.surface, borderColor: p.border, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 13 }, selected: { borderColor: p.accent, borderWidth: 2 }, cardTitle: { color: p.text, fontSize: 17, fontWeight: '800' }, button: { minHeight: 48, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center', borderRadius: 13, marginTop: 18 }, buttonText: { color: p.background, fontWeight: '900' }, secondary: { minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 9 }, secondaryText: { color: p.accent, fontWeight: '700' } }); }
