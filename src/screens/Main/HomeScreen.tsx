import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const BRITUME_SECTIONS = [
  'LIVING',
  'SOCIAL',
  'CHAT',
  'GAMES',
  'TECHNOLOGIES',
  'TV',
  'STUDIOS',
  'WEAR',
  'LABS',
  'THEMES',
  'GALLERY',
  'SECURITY',
];

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>BRITUME • ONE APP</Text>
      <Text style={styles.title}>Your BRITUME ecosystem</Text>
      <Text style={styles.body}>
        One unified app for living, social, media, creativity, technology, and growth.
      </Text>

      <View style={styles.grid}>
        {BRITUME_SECTIONS.map((section) => (
          <View key={section} style={styles.tile}>
            <Text style={styles.tileText}>{section}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#070b12',
    paddingBottom: 40,
  },
  kicker: {
    color: '#d9b867',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: '#c5ccd7',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '45%',
    backgroundColor: '#101722',
    borderWidth: 1,
    borderColor: '#263247',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  tileText: {
    color: '#f4f6fa',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
