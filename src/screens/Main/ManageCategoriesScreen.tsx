
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'britume-living-categories-v1';

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

const DEFAULTS = [
  'SOCIAL',
  'CHAT',
  'TECHNOLOGIES',
  'TV',
  'STUDIOS',
  'WEAR',
];

const BLUE = '#5598F5';
const TEXT = '#203450';
const MUTED = '#71839D';

export default function ManageCategoriesScreen() {
  const [selected, setSelected] = useState<string[]>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);

        if (stored) {
          const parsed: unknown = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            const valid = parsed.filter(
              (id): id is string =>
                typeof id === 'string' &&
                CATEGORIES.some((category) => category.id === id),
            );

            if (active) setSelected(valid.slice(0, 6));
          }
        }
      } catch {
        Alert.alert(
          'Could not load categories',
          'Default categories will be shown.',
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function toggleCategory(id: string) {
    const alreadySelected = selected.includes(id);

    if (!alreadySelected && selected.length >= 6) {
      Alert.alert(
        'Six categories maximum',
        'Remove one of your current shortcuts before adding another.',
      );
      return;
    }

    const updated = alreadySelected
      ? selected.filter((item) => item !== id)
      : [...selected, id];

    setSelected(updated);
    setSaving(true);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      setSelected(selected);
      Alert.alert(
        'Could not save',
        'Your category changes were not saved. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    setSaving(true);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
      setSelected([...DEFAULTS]);
    } catch {
      Alert.alert('Reset failed', 'Could not restore the default categories.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.brand}>BRITUME</Text>
      <Text style={styles.heading}>Manage Categories</Text>
      <Text style={styles.description}>
        Choose the six shortcuts you want on LIVING. Other categories stay
        available here.
      </Text>

      <View style={styles.counterCard}>
        <Text style={styles.counterTitle}>Your LIVING shortcuts</Text>
        <Text style={styles.counter}>
          {selected.length} of 6 selected
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${(selected.length / 6) * 100}%` },
            ]}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={BLUE} size="large" />
      ) : (
        <View style={styles.list}>
          {CATEGORIES.map((category) => {
            const active = selected.includes(category.id);

            return (
              <Pressable
                key={category.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active }}
                onPress={() => void toggleCategory(category.id)}
                disabled={saving}
                style={({ pressed }) => [
                  styles.category,
                  active && styles.categoryActive,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.categoryIcon}>
                  <Text style={styles.emoji}>{category.icon}</Text>
                </View>

                <Text style={styles.categoryName}>{category.name}</Text>

                <View
                  style={[
                    styles.check,
                    active && styles.checkActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.checkText,
                      active && styles.checkTextActive,
                    ]}
                  >
                    {active ? '✓' : '+'}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        disabled={saving}
        onPress={() => void resetDefaults()}
        style={styles.resetButton}
      >
        <Text style={styles.resetText}>Restore default six</Text>
      </Pressable>

      {saving ? (
        <Text style={styles.saving}>Saving your preferences…</Text>
      ) : null}

      <Text style={styles.note}>
        These preferences are stored on this device. They do not change your
        account or delete any content.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F7FF',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  brand: {
    color: '#2869C7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  heading: {
    color: TEXT,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 8,
  },
  description: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 20,
  },
  counterCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E7FC',
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
  },
  counterTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
  },
  counter: {
    color: BLUE,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 7,
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#EAF3FF',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 11,
  },
  progressFill: {
    height: '100%',
    backgroundColor: BLUE,
    borderRadius: 5,
  },
  list: {
    gap: 10,
  },
  category: {
    minHeight: 65,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E7FC',
    borderWidth: 1,
    borderRadius: 17,
    padding: 11,
  },
  categoryActive: {
    backgroundColor: '#EAF3FF',
    borderColor: '#8BB9F5',
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F2F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 21,
  },
  categoryName: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 12,
  },
  check: {
    width: 29,
    height: 29,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9D8E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  checkText: {
    color: MUTED,
    fontSize: 17,
    fontWeight: '800',
  },
  checkTextActive: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.72,
  },
  resetButton: {
    alignItems: 'center',
    padding: 15,
    marginTop: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#B9D5F7',
    backgroundColor: '#FFFFFF',
  },
  resetText: {
    color: '#2869C7',
    fontSize: 13,
    fontWeight: '800',
  },
  saving: {
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  note: {
    color: MUTED,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 18,
  },
});
