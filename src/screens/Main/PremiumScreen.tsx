import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { AdSlot } from '../../components/monetization/MonetizationSlots';
import { getPremiumEntitlement } from '../../services/launchFeatureService';
import type { PremiumEntitlement } from '../../services/launchFeatureService';
import { useAppTheme } from '../../theme/AppThemeContext';

const BENEFITS = [
  'A more personal BRITUME experience with premium themes',
  'Future member benefits as they are released',
  'Support for BRITUME as it grows',
];

export default function PremiumScreen() {
  const { palette } = useAppTheme();
  const [entitlement, setEntitlement] = useState<PremiumEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Sign in again to view your account status.');
      }
      setEntitlement(await getPremiumEntitlement(data.user.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Premium status could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const active = entitlement?.status === 'active' || entitlement?.status === 'grace_period';

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • MEMBERSHIP</Text>
      <Text style={[styles.title, { color: palette.text }]}>Premium</Text>
      <View style={[styles.statusCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.statusLabel, { color: palette.muted }]}>ACCOUNT STATUS</Text>
        {loading ? (
          <ActivityIndicator color={palette.accent} style={styles.spinner} />
        ) : (
          <Text style={[styles.status, { color: active ? palette.accent : palette.text }]}>
            {active ? 'Premium active' : entitlement?.status === 'past_due' ? 'Payment needs attention' : 'Not active'}
          </Text>
        )}
        {entitlement?.expires_at ? (
          <Text style={[styles.muted, { color: palette.muted }]}>
            Current period ends {new Date(entitlement.expires_at).toLocaleDateString()}.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <Text style={[styles.sectionTitle, { color: palette.text }]}>What Premium can provide</Text>
      {BENEFITS.map((benefit) => (
        <View key={benefit} style={[styles.benefit, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.bullet, { color: palette.accent }]}>✦</Text>
          <Text style={[styles.muted, { color: palette.muted }]}>{benefit}</Text>
        </View>
      ))}

      <View style={[styles.setupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.setupTitle, { color: palette.text }]}>Purchases are not connected</Text>
        <Text style={[styles.muted, { color: palette.muted }]}>
          This screen reads account entitlements only. Connect and configure an app-store billing
          provider before offering a purchase; no payment has been started or completed.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={[styles.purchaseButton, { backgroundColor: palette.accent, opacity: 0.5 }]}
        >
          <Text style={styles.purchaseText}>Premium purchase unavailable</Text>
        </Pressable>
      </View>
      <AdSlot label="Premium sponsor slot" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 16 },
  statusCard: { borderRadius: 16, borderWidth: 1, padding: 17 },
  statusLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  status: { fontSize: 20, fontWeight: '900', marginTop: 7 },
  spinner: { alignSelf: 'flex-start', marginTop: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 9, marginTop: 20 },
  benefit: { alignItems: 'flex-start', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 9, marginBottom: 8, padding: 12 },
  bullet: { fontSize: 15, fontWeight: '900' },
  muted: { flex: 1, fontSize: 13, lineHeight: 19, marginTop: 4 },
  setupCard: { borderRadius: 14, borderWidth: 1, marginTop: 13, padding: 14 },
  setupTitle: { fontSize: 15, fontWeight: '800' },
  purchaseButton: { alignItems: 'center', borderRadius: 10, justifyContent: 'center', marginTop: 14, minHeight: 43, paddingHorizontal: 12 },
  purchaseText: { color: '#090d15', fontSize: 12, fontWeight: '900' },
  error: { color: '#f18e8e', fontSize: 12, marginTop: 9 },
});
