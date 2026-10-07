import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeContext';

const LABS_OPT_IN_KEY = '@britume/labs-opt-in-v1';

export default function LabsScreen() {
  const { palette } = useAppTheme();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEnabled((await AsyncStorage.getItem(LABS_OPT_IN_KEY)) === 'true');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Labs preference could not be read.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  async function toggle(value: boolean) {
    const previous = enabled;
    setEnabled(value);
    setError('');
    try {
      await AsyncStorage.setItem(LABS_OPT_IN_KEY, String(value));
    } catch (cause) {
      setEnabled(previous);
      setError(cause instanceof Error ? cause.message : 'Labs preference could not be saved.');
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • EXPERIMENTS</Text>
      <Text style={[styles.title, { color: palette.text }]}>Labs</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        A small home for opt-in BRITUME experiments. Labs previews can be enabled or turned off at
        any time on this device.
      </Text>

      <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <View style={styles.row}>
          <View style={styles.copy}>
            <Text style={[styles.cardTitle, { color: palette.text }]}>Enable Labs previews</Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              Save your opt-in preference locally. No experiments are currently available.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Enable Labs previews"
            disabled={loading}
            value={enabled}
            onValueChange={(value) => void toggle(value)}
            trackColor={{ false: '#384454', true: palette.accent }}
          />
        </View>
      </View>

      <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>No active experiments</Text>
        <Text style={[styles.muted, { color: palette.muted }]}>
          When a BRITUME experiment is ready, its description and opt-in control will appear here.
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  copy: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  muted: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  empty: { borderRadius: 14, borderWidth: 1, marginTop: 12, padding: 15 },
  error: { color: '#f18e8e', fontSize: 12, lineHeight: 18, marginTop: 10 },
});
