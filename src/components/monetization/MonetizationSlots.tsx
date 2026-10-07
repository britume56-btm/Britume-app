import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function AdSlot({ label = 'Sponsored placement' }: { label?: string }) {
  return (
    <View accessibilityLabel="Ad placement reserved; advertising is not configured" style={styles.slot}>
      <Text style={styles.kicker}>{label.toUpperCase()}</Text>
      <Text style={styles.copy}>This space is reserved for a future ad provider.</Text>
      <Text style={styles.note}>No ad has been requested, and no earnings are recorded.</Text>
    </View>
  );
}

export function RewardedThemeAd() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      disabled
      style={styles.reward}
    >
      <Text style={styles.rewardTitle}>Unlock with a rewarded ad</Text>
      <Text style={styles.copy}>
        Rewarded ads are unavailable until an ad provider is connected. No unlock or reward has
        been applied.
      </Text>
    </Pressable>
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
