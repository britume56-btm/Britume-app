import React from 'react';
import {
  Alert,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type SettingsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'SETTINGS'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const settingsSections = [
  {
    title: 'Account',
    body: 'Edit your username, display name, and avatar.',
    route: 'PROFILE',
  },
  {
    title: 'Security',
    body: 'Set or change your app PIN and use device biometrics.',
    route: 'Security',
  },
  {
    title: 'Privacy',
    body: 'Visibility and data controls are not built yet.',
  },
  {
    title: 'Notifications',
    body: 'Notification preferences are not built yet.',
  },
  {
    title: 'Appearance / Themes',
    body: 'Theme controls are not built yet.',
  },
  {
    title: 'Language',
    body: 'Language selection is not built yet.',
  },
  {
    title: 'Storage',
    body: 'Storage usage and media management are not built yet.',
  },
  {
    title: 'About BRITUME',
    body: 'App information and support details are not built yet.',
  },
] as const;

export default function SettingsScreen({
  navigation,
}: {
  navigation: SettingsNavigationProp;
}) {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign out failed', error.message);
      return;
    }

    Alert.alert('Signed out', 'You have been signed out of BRITUME.');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>BRITUME • SETTINGS</Text>
      <Text style={styles.title}>Control center</Text>

      {settingsSections.map((section) => {
        const implemented = 'route' in section;
        const onPress = () => {
          if (!implemented) {
            return;
          }

          if (section.route === 'PROFILE') {
            navigation.navigate('PROFILE');
          } else {
            navigation.navigate('Security');
          }
        };

        return (
          <Pressable
            key={section.title}
            accessibilityRole={implemented ? 'button' : undefined}
            accessibilityState={{ disabled: !implemented }}
            disabled={!implemented}
            onPress={onPress}
            style={({ pressed }) => [
              styles.section,
              pressed && implemented && styles.sectionPressed,
              !implemented && styles.sectionDisabled,
            ]}
          >
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {!implemented && <Text style={styles.comingSoon}>COMING SOON</Text>}
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </Pressable>
        );
      })}

      <View style={styles.signOutWrap}>
        <Button title="Sign out" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#070b12',
    gap: 12,
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
  section: {
    backgroundColor: '#101722',
    borderWidth: 1,
    borderColor: '#263247',
    borderRadius: 14,
    padding: 14,
  },
  sectionPressed: {
    borderColor: '#d9b867',
    opacity: 0.8,
  },
  sectionDisabled: {
    opacity: 0.72,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    color: '#f4f6fa',
    fontSize: 16,
    fontWeight: '700',
  },
  comingSoon: {
    color: '#8f9aab',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionBody: {
    color: '#c5ccd7',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  signOutWrap: {
    marginTop: 12,
  },
});
