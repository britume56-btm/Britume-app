import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../../lib/supabase';
import { AdSlot } from '../../components/monetization/MonetizationSlots';
import {
  getPremiumEntitlement,
  hasPremiumAccess,
} from '../../services/launchFeatureService';
import type { PremiumEntitlement } from '../../services/launchFeatureService';
import {
  getBillingProviderStatus,
  purchasePremium,
  restorePremiumPurchases,
} from '../../services/billingService';
import { useAppTheme } from '../../theme/AppThemeContext';

const BENEFITS = [
  'Nebula theme access while a verified entitlement is active',
  'Membership state comes from the account entitlement record, not local purchase state',
  'No other Premium-only features are enabled in this release',
];

export default function PremiumScreen() {
  const { palette } = useAppTheme();
  const [entitlement, setEntitlement] = useState<PremiumEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError('');
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        throw new Error('Sign in again to view your account status.');
      }
      setEntitlement(await getPremiumEntitlement(data.user.id));
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Premium status could not be loaded.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const active = entitlement ? hasPremiumAccess(entitlement) : false;
  const billingStatus = getBillingProviderStatus();
  const billingConfigured = billingStatus.configured;
  const expired =
    entitlement?.expires_at !== null &&
    entitlement?.expires_at !== undefined &&
    Date.parse(entitlement.expires_at) <= Date.now();

  async function refreshMembership() {
    if (restoring) {
      return;
    }
    setRestoring(true);
    setError('');
    setNotice('');
    try {
      const restored = await restorePremiumPurchases();
      const loaded = await load();
      if (loaded) {
        setNotice(
          restored
            ? 'Store restore requested. Access still comes from the verified BRITUME entitlement.'
            : 'Entitlement refreshed. Store restore is unavailable until production billing is configured.'
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Membership could not be refreshed.');
    } finally {
      setRestoring(false);
    }
  }

  async function startPurchase() {
    const product = billingStatus.product;
    if (!product || !billingConfigured || purchasing || restoring) {
      return;
    }
    setPurchasing(true);
    setError('');
    setNotice('');
    try {
      const outcome = await purchasePremium(product.id);
      if (outcome === 'cancelled') {
        await load();
        setNotice('Purchase cancelled. No local membership was granted.');
        return;
      }
      const loaded = await load();
      if (!loaded) {
        setNotice('Store verification returned, but BRITUME could not refresh the account entitlement. Retry the status check.');
      } else {
        setNotice('Store transaction verified. The membership status shown above is refreshed from BRITUME.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The store purchase could not be completed.');
    } finally {
      setPurchasing(false);
    }
  }

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
            {active
              ? entitlement?.status === 'grace_period'
                ? 'Premium · grace period'
                : entitlement?.status === 'canceled'
                  ? 'Premium · active through period end'
                  : 'Premium active'
              : expired
                ? 'Premium expired'
                : entitlement?.status === 'past_due'
                  ? 'Payment needs attention'
                  : entitlement?.status === 'canceled'
                    ? 'Membership canceled'
                    : 'Free plan'}
          </Text>
        )}
        {entitlement?.expires_at ? (
          <Text style={[styles.muted, { color: palette.muted }]}>
            Current period ends {new Date(entitlement.expires_at).toLocaleDateString()}.
          </Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={[styles.notice, { color: palette.muted }]}>{notice}</Text> : null}
        {!loading && entitlement?.provider ? (
          <Text style={[styles.muted, { color: palette.muted }]}>
            Provider: {entitlement.provider}{entitlement.product_id ? ` · ${entitlement.product_id}` : ''}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={loading || restoring}
        onPress={() => void refreshMembership()}
        style={[styles.refreshButton, { borderColor: palette.border }, (loading || restoring) && styles.disabled]}
      >
        <Text style={[styles.refreshText, { color: palette.accent }]}>
          {restoring ? 'Checking membership…' : 'Refresh / restore membership'}
        </Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: palette.text }]}>What Premium can provide</Text>
      {BENEFITS.map((benefit) => (
        <View key={benefit} style={[styles.benefit, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.bullet, { color: palette.accent }]}>✦</Text>
          <Text style={[styles.muted, { color: palette.muted }]}>{benefit}</Text>
        </View>
      ))}

      <View style={[styles.setupCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.setupTitle, { color: palette.text }]}>
          {billingConfigured ? 'Billing provider available' : 'Production billing is not configured'}
        </Text>
        {billingStatus.product ? (
          <Text style={[styles.muted, { color: palette.muted }]}>
            {billingStatus.product.title} · {billingStatus.product.formattedPrice}
          </Text>
        ) : null}
        <Text style={[styles.muted, { color: palette.muted }]}>
          {billingConfigured
            ? 'Purchases are routed through the configured store adapter and trusted server-side receipt verification.'
            : 'Purchasing requires production Google Play billing, store products, and trusted server-side receipt verification. No purchase has been started or completed.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !billingConfigured || purchasing || loading || restoring }}
          disabled={!billingConfigured || purchasing || loading || restoring}
          onPress={() => void startPurchase()}
          style={[styles.purchaseButton, { backgroundColor: palette.accent, opacity: !billingConfigured || purchasing || loading || restoring ? 0.5 : 1 }]}
        >
          <Text style={styles.purchaseText}>
            {purchasing
              ? 'Verifying with store…'
              : billingStatus.product
                ? `Subscribe · ${billingStatus.product.formattedPrice}`
                : 'Premium purchase unavailable'}
          </Text>
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
  notice: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  refreshButton: { alignSelf: 'flex-start', borderRadius: 10, borderWidth: 1, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10 },
  refreshText: { fontSize: 12, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
