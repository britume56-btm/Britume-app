import React from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BRITUME_SECTIONS } from '../../constants/sections';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme/AppThemeContext';

type HomeNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'LIVING'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen({
  navigation,
}: {
  navigation: HomeNavigationProp;
}) {
  const { palette, backgroundUri } = useAppTheme();
  return (
    <ImageBackground
      source={backgroundUri ? { uri: backgroundUri } : undefined}
      imageStyle={styles.wallpaper}
      style={[styles.background, { backgroundColor: palette.background }]}
    >
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: backgroundUri ? 'transparent' : palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • ONE APP</Text>
      <Text style={[styles.title, { color: palette.text }]}>Your BRITUME ecosystem</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
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
            } else if (section.name === 'SOCIAL') {
              navigation.navigate('Social');
            } else if (section.name === 'CHAT') {
              navigation.navigate('Chat');
            } else if (section.name === 'GAMES') {
              navigation.navigate('Games');
            } else if (section.name === 'THEMES') {
              navigation.navigate('Themes');
            } else if (section.name === 'GALLERY') {
              navigation.navigate('Gallery');
            } else if (section.name === 'NOTIFICATIONS') {
              navigation.navigate('Notifications');
            } else if (section.name === 'PREMIUM') {
              navigation.navigate('Premium');
            } else if (section.name === 'LABS') {
              navigation.navigate('Labs');
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
              style={({ pressed }) => [
                styles.tile,
                { backgroundColor: palette.surface, borderColor: palette.border },
                pressed && { borderColor: palette.accent, opacity: 0.75 },
              ]}
            >
              <Text style={[styles.tileIcon, { color: palette.accent }]}>{section.icon}</Text>
              <Text style={[styles.tileText, { color: palette.text }]}>{section.name}</Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  wallpaper: { opacity: 0.62 },
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
