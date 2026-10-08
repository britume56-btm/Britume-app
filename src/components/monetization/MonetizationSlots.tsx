import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { areRewardedAdsConfigured } from '../../services/rewardedAdsService';

export function AdSlot({ label = 'Sponsored placement' }: { label?: string }) {
  return (
    <View accessibilityLabel="Display advertising is not configured" style={styles.slot}>
      <Text style={styles.kicker}>DISPLAY ADS NOT CONFIGURED</Text>
      <Text style={styles.copy}>
        {label} is reserved for a production display-ad SDK, placement IDs, and consent flow. No ad is requested.
      </Text>
      <Text style={styles.note}>No impressions, earnings, or user data are collected here.</Text>
    </View>
  );
}

export function RewardedThemeAd() {
  return (
    <View accessibilityLabel="Rewarded theme ads are unavailable until a provider is configured" style={styles.reward}>
      <Text style={styles.rewardTitle}>Unlock with a rewarded ad</Text>
      <Text style={styles.copy}>
        {areRewardedAdsConfigured()
          ? 'A rewarded provider is connected, but no theme-unlock reward is enabled. Premium themes still require a verified entitlement.'
          : 'Unavailable: no real ad provider is configured. No reward is granted from a tap or local state.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    backgroundColor: '#0c121b',
    borderColor: '#263247',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 16,
    padding: 14,
  },
  kicker: {
    color: '#8f9aab',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  copy: {
    color: '#c5ccd7',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  note: {
    color: '#7d8797',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  reward: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
    opacity: 0.68,
    padding: 14,
  },
  rewardTitle: {
    color: '#d9b867',
    fontSize: 14,
    fontWeight: '800',
  },
});
