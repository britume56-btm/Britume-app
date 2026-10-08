import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeContext';

const EXPERIMENTS = [
  {
    id: 'focus-mode' as const,
    title: 'Focus Mode',
    label: 'EXPERIMENTAL',
    description: 'Simplifies the LIVING introduction while keeping every section available.',
  },
  {
    id: 'compact-home' as const,
    title: 'Compact Home',
    label: 'EXPERIMENTAL',
    description: 'Uses smaller section tiles to fit more of BRITUME on the first screen.',
  },
];

export default function LabsScreen() {
  const { palette, experiments, updateExperiment, loading, loadError } = useAppTheme();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function toggle(id: (typeof EXPERIMENTS)[number]['id'], value: boolean) {
    if (saving) {
      return;
    }
    setSaving(id);
    setError('');
    try {
      await updateExperiment(id, value);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Labs preference could not be saved.');
    } finally {
      setSaving(null);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • EXPERIMENTS</Text>
      <Text style={[styles.title, { color: palette.text }]}>Labs</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        These opt-in experiments change the LIVING screen only. Settings are saved to your BRITUME
        account and can be turned off here at any time.
      </Text>
      {loadError ? (
        <Text style={styles.error}>Saved Labs settings could not be loaded: {loadError}</Text>
      ) : null}

      {EXPERIMENTS.map((experiment) => (
        <View
          key={experiment.id}
          style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}
        >
          <View style={styles.row}>
            <View style={styles.copy}>
              <View style={styles.titleRow}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>{experiment.title}</Text>
                <Text style={[styles.badge, { color: palette.accent, borderColor: palette.border }]}>
                  {experiment.label}
                </Text>
              </View>
              <Text style={[styles.muted, { color: palette.muted }]}>{experiment.description}</Text>
            </View>
            <Switch
              accessibilityLabel={`Enable ${experiment.title}`}
              accessibilityState={{ checked: experiments[experiment.id] }}
              disabled={loading || saving !== null}
              value={experiments[experiment.id]}
              onValueChange={(value) => void toggle(experiment.id, value)}
              trackColor={{ false: '#384454', true: palette.accent }}
            />
          </View>
          {saving === experiment.id ? (
            <Text style={[styles.saved, { color: palette.muted }]}>Saving to your account…</Text>
          ) : null}
        </View>
      ))}
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
  titleRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  muted: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  badge: { borderRadius: 8, borderWidth: 1, fontSize: 8, fontWeight: '900', letterSpacing: 0.6, overflow: 'hidden', paddingHorizontal: 6, paddingVertical: 3 },
  saved: { fontSize: 11, marginTop: 10 },
  error: { color: '#f18e8e', fontSize: 12, lineHeight: 18, marginTop: 10 },
});
