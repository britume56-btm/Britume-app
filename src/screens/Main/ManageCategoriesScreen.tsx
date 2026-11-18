import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCategoryStore, DEFAULTS, MAX_SHORTCUTS } from '../../store/useCategoryStore';

const CATEGORIES = [
  { id: 'SOCIAL', name: 'Social', icon: '👥' },
  { id: 'CHAT', name: 'Chat', icon: '💬' },
  { id: 'TECHNOLOGIES', name: 'Technology', icon: '⚡' },
  { id: 'TV', name: 'TV', icon: '▶️' },
  { id: 'STUDIOS', name: 'Studios', icon: '🎬' },
  { id: 'WEAR', name: 'Wear', icon: '👕' },
  { id: 'GAMES', name: 'Games', icon: '🎮' },
  { id: 'FOUNDATION', name: 'Foundation', icon: '◇' },
  { id: 'LABS', name: 'Labs', icon: '🧪' },
  { id: 'THEMES', name: 'Themes', icon: '🎨' },
  { id: 'GALLERY', name: 'Gallery', icon: '🖼️' },
  { id: 'NOTIFICATIONS', name: 'Notifications', icon: '🔔' },
  { id: 'PREMIUM', name: 'Premium', icon: '✦' },
  { id: 'SECURITY', name: 'Security', icon: '🔒' },
] as const;

const BLUE = '#5598F5';
const TEXT = '#203450';
const MUTED = '#71839D';

export default function ManageCategoriesScreen() {
  const { selected, loading, saving, loadCategories, toggleCategory, resetDefaults } = useCategoryStore();

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const handleToggle = (id: string) => {
    void toggleCategory(
      id,
      () => Alert.alert('Six categories maximum', 'Remove one of your current shortcuts before adding another.'),
      (message: string) => Alert.alert('Could not save', message),
    );
  };

  const handleReset = () => {
    void resetDefaults((message: string) => Alert.alert('Reset failed', message));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>BRITUME</Text>
      <Text style={styles.heading}>Manage Categories</Text>
      <Text style={styles.description}>Choose up to six shortcuts for your LIVING dashboard.</Text>

      <View style={styles.counterCard}>
        <Text style={styles.counterTitle}>Your LIVING shortcuts</Text>
        <Text style={styles.counter}>{selected.length} of {MAX_SHORTCUTS} selected</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(selected.length / MAX_SHORTCUTS, 1) * 100}%` }]} />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} size="large" style={styles.loader} />
      ) : (
        <View>
          {CATEGORIES.map((category) => {
            const active = selected.includes(category.id);
            return (
              <Pressable
                key={category.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active, disabled: saving }}
                disabled={saving}
                onPress={() => handleToggle(category.id)}
                style={[styles.category, active && styles.categoryActive]}
              >
                <Text style={styles.emoji}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={[styles.check, active && styles.checkActive]}>{active ? '✓' : '+'}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable accessibilityRole="button" disabled={saving} onPress={handleReset} style={styles.resetButton}>
        <Text style={styles.resetText}>Restore default six</Text>
      </Pressable>
      {saving && <Text style={styles.saving}>Saving your preferences…</Text>}
      <Text style={styles.note}>Preferences are stored on this device.</Text>
      <Text accessibilityElementsHidden>{DEFAULTS.length}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F2F7FF' },
  content: { padding: 18, paddingBottom: 40 },
  brand: { color: '#2869C7', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
  heading: { color: TEXT, fontSize: 26, fontWeight: '900', marginTop: 8 },
  description: { color: MUTED, fontSize: 13, lineHeight: 20, marginTop: 9, marginBottom: 20 },
  counterCard: { backgroundColor: '#FFFFFF', borderColor: '#D7E7FC', borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 18 },
  counterTitle: { color: TEXT, fontSize: 15, fontWeight: '800' },
  counter: { color: BLUE, fontSize: 12, fontWeight: '800', marginTop: 7 },
  progressTrack: { height: 7, backgroundColor: '#EAF3FF', borderRadius: 5, overflow: 'hidden', marginTop: 11 },
  progressFill: { height: '100%', backgroundColor: BLUE, borderRadius: 5 },
  loader: { marginVertical: 30 },
  category: { minHeight: 65, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D7E7FC', borderWidth: 1, borderRadius: 17, padding: 11, marginBottom: 10 },
  categoryActive: { backgroundColor: '#EAF3FF', borderColor: '#8BB9F5' },
  emoji: { fontSize: 21, width: 42, textAlign: 'center' },
  categoryName: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '700', marginLeft: 12 },
  check: { color: MUTED, fontSize: 20, fontWeight: '800', width: 30, textAlign: 'center' },
  checkActive: { color: BLUE },
  resetButton: { alignItems: 'center', padding: 15, marginTop: 15, borderRadius: 15, borderWidth: 1, borderColor: '#B9D5F7', backgroundColor: '#FFFFFF' },
  resetText: { color: '#2869C7', fontSize: 13, fontWeight: '800' },
  saving: { color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 10 },
  note: { color: MUTED, fontSize: 11, lineHeight: 17, marginTop: 18 },
});
