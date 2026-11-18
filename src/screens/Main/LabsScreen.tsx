import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme } from '../../theme/AppThemeContext';
export default function LabsScreen() {
  const { palette, experiments, updateExperiment } = useAppTheme();
  const toggle = async (id: 'focus-mode' | 'compact-home', value: boolean) => {
    try { await updateExperiment(id, value); } catch (error) { Alert.alert('Could not save setting', error instanceof Error ? error.message : 'Please try again.'); }
  };
  return <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
    <Text style={[styles.title, { color: palette.text }]}>BRITUME Labs</Text>
    <Text style={[styles.body, { color: palette.muted }]}>Try optional interface experiments. Your settings sync with your account.</Text>
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Setting title="Focus Mode" description="Simplifies the LIVING introduction." value={experiments['focus-mode']} accent={palette.accent} onChange={(value) => void toggle('focus-mode', value)} />
      <Setting title="Compact Home" description="Uses smaller shortcut tiles." value={experiments['compact-home']} accent={palette.accent} onChange={(value) => void toggle('compact-home', value)} />
    </View>
    <Pressable accessibilityRole="button" onPress={() => Alert.alert('Labs', 'More experiments will be added in future updates.')}><Text style={[styles.body, { color: palette.accent }]}>More experiments coming soon</Text></Pressable>
  </ScrollView>;
}
function Setting({ title, description, value, onChange, accent }: { title: string; description: string; value: boolean; onChange: (value: boolean) => void; accent: string }) { return <View style={styles.row}><View style={styles.copy}><Text style={styles.settingTitle}>{title}</Text><Text style={styles.description}>{description}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ true: accent }} accessibilityLabel={title} /></View>; }
const styles = StyleSheet.create({ container: { flexGrow: 1, padding: 20 }, title: { fontSize: 27, fontWeight: '900' }, body: { fontSize: 14, lineHeight: 21, marginTop: 8 }, card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, marginTop: 18 }, row: { minHeight: 78, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#394254', gap: 12 }, copy: { flex: 1 }, settingTitle: { color: '#FFFFFF', fontWeight: '800' }, description: { color: '#AAB5C5', fontSize: 12, marginTop: 5 } });
