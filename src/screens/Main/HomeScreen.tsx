import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BRITUME_SECTIONS } from '../../constants/sections';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'LIVING'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen({
  navigation,
}: {
  navigation: HomeNavigationProp;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>BRITUME • ONE APP</Text>
      <Text style={styles.title}>Your BRITUME ecosystem</Text>
      <Text style={styles.body}>
        One unified app for living, social, media, creativity, technology, and growth.
      </Text>

      <View style={styles.grid}>
        {BRITUME_SECTIONS.map((section) => {
          const onPress = () => {
            if (section.name === 'SETTINGS') {
              navigation.navigate('SETTINGS');
            } else if (section.name === 'SECURITY') {
              navigation.navigate('Security');
            } else if (section.name === 'LIVING') {
              navigation.navigate('LIVING');
            } else {
              navigation.navigate('Module', { section: section.name });
            }
          };

          return (
            <Pressable
              key={section.name}
              accessibilityRole="button"
              accessibilityLabel={`Open ${section.name}`}
              onPress={onPress}
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            >
              <Text style={styles.tileIcon}>{section.icon}</Text>
              <Text style={styles.tileText}>{section.name}</Text>
            </Pressable>
          );
        })}
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
  tilePressed: {
    opacity: 0.75,
    borderColor: '#d9b867',
  },
  tileIcon: {
    color: '#d9b867',
    fontSize: 21,
    marginBottom: 6,
  },
  tileText: {
    color: '#f4f6fa',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
});
