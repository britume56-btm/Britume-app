import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { File } from 'expo-file-system';
import {
  Alert,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import appConfig from '../../../app.json';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../../lib/supabase';
import { formatStorageSize, OFFLINE_VIDEO_KEY_PREFIX } from '../../services/contentRules.mjs';
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
    body: 'BRITUME community and content app.',
  },
] as const;

export default function SettingsScreen({
  navigation,
}: {
  navigation: SettingsNavigationProp;
}) {
  const [offlineCount, setOfflineCount] = useState(0);
  const [offlineBytes, setOfflineBytes] = useState(0);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState('');

  const refreshOfflineStorage = useCallback(async () => {
    setStorageLoading(true);
    setStorageError('');
    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
        key.startsWith(OFFLINE_VIDEO_KEY_PREFIX)
      );
      const entries = await AsyncStorage.multiGet(keys);
      const staleKeys: string[] = [];
      let count = 0;
      let bytes = 0;

      for (const [key, uri] of entries) {
        if (!uri) {
          staleKeys.push(key);
          continue;
        }
        const file = new File(uri);
        if (!file.exists) {
          staleKeys.push(key);
          continue;
        }
        count += 1;
        bytes += file.size ?? 0;
      }

      if (staleKeys.length) {
        await AsyncStorage.multiRemove(staleKeys);
      }
      setOfflineCount(count);
      setOfflineBytes(bytes);
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : 'Could not read offline storage.');
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshOfflineStorage();
    }, [refreshOfflineStorage])
  );

  function confirmClearOfflineVideos() {
    Alert.alert(
      'Remove offline videos?',
      'Downloaded TV videos will be removed from this device. Online posts will stay available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove downloads',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
                  key.startsWith(OFFLINE_VIDEO_KEY_PREFIX)
                );
                const entries = await AsyncStorage.multiGet(keys);
                for (const [, uri] of entries) {
                  if (uri) {
                    const file = new File(uri);
                    if (file.exists) {
                      file.delete();
                    }
                  }
                }
                await AsyncStorage.multiRemove(keys);
                await refreshOfflineStorage();
                Alert.alert('Downloads removed', 'Offline TV videos were cleared from this device.');
              } catch (cause) {
                Alert.alert(
                  'Could not clear downloads',
                  cause instanceof Error ? cause.message : 'Please try again.'
                );
              }
            })();
          },
        },
      ]
    );
  }

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
        if (section.title === 'Storage') {
          return (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>Storage</Text>
              <Text style={styles.sectionBody}>
                {storageLoading
                  ? 'Checking offline videos…'
                  : `${offlineCount} offline video${offlineCount === 1 ? '' : 's'} · ${formatStorageSize(offlineBytes)}`}
              </Text>
              {storageError ? <Text style={styles.errorText}>{storageError}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={storageLoading || offlineCount === 0}
                onPress={confirmClearOfflineVideos}
                style={[
                  styles.storageButton,
                  (storageLoading || offlineCount === 0) && styles.storageButtonDisabled,
                ]}
              >
                <Text style={styles.storageButtonText}>Clear offline videos</Text>
              </Pressable>
            </View>
          );
        }

        if (section.title === 'About BRITUME') {
          return (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
              <Text style={styles.sectionBody}>Version {appConfig.expo.version}</Text>
            </View>
          );
        }

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
  storageButton: {
    alignSelf: 'flex-start',
    borderColor: '#384b61',
    borderRadius: 9,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  storageButtonDisabled: {
    opacity: 0.5,
  },
  storageButtonText: {
    color: '#d9b867',
    fontSize: 12,
    fontWeight: '800',
  },
  errorText: {
    color: '#f18e8e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },
});
