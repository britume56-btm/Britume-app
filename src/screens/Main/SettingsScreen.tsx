import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { File } from 'expo-file-system';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import appConfig from '../../../app.json';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { supabase } from '../../../lib/supabase';
import { formatStorageSize, OFFLINE_VIDEO_KEY_PREFIX } from '../../services/contentRules.mjs';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme/AppThemeContext';

type SettingsNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'SETTINGS'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Preferences = {
  dataSaver: boolean;
  autoplay: boolean;
  wifiOnlyDownloads: boolean;
};

const PREFERENCES_KEY = 'britume-settings-preferences-v1';

const DEFAULT_PREFERENCES: Preferences = {
  dataSaver: false,
  autoplay: true,
  wifiOnlyDownloads: false,
};

const settingsSections = [
  {
    title: 'Account',
    body: 'Edit your username, display name, and avatar.',
    route: 'PROFILE',
    icon: 'person-outline',
  },
  {
    title: 'Manage Categories',
    body: 'Choose which shortcuts appear at the top of LIVING.',
    route: 'ManageCategories',
    icon: 'grid-outline',
  },
  {
    title: 'Security',
    body: 'Manage your app PIN and device biometrics.',
    route: 'Security',
    icon: 'shield-checkmark-outline',
  },
  {
    title: 'Change account password',
    body: 'Verify your current password before changing it.',
    action: 'change-password',
    icon: 'key-outline',
  },
  {
    title: 'Privacy & permissions',
    body: 'Open device settings to manage BRITUME permissions.',
    action: 'device-settings',
    icon: 'lock-closed-outline',
  },
  {
    title: 'Notifications',
    body: 'Manage your notification preferences.',
    route: 'Notifications',
    icon: 'notifications-outline',
  },
  {
    title: 'Appearance / Themes',
    body: 'Choose your app theme and appearance.',
    route: 'Themes',
    icon: 'color-palette-outline',
  },
  {
    title: 'Premium',
    body: 'Check your membership information.',
    route: 'Premium',
    icon: 'sparkles-outline',
  },
  {
    title: 'Gallery',
    body: 'Access selected photos and videos.',
    route: 'Gallery',
    icon: 'images-outline',
  },
  {
    title: 'Labs',
    body: 'Manage Focus Mode and Compact Home.',
    route: 'Labs',
    icon: 'flask-outline',
  },
  {
    title: 'Delete account',
    body: 'Permanently delete your account after verification.',
    action: 'delete-account',
    icon: 'trash-outline',
  },
] as const;

export default function SettingsScreen({
  navigation,
}: {
  navigation: SettingsNavigationProp;
}) {
  const { palette } = useAppTheme();

  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesError, setPreferencesError] = useState('');

  const [offlineCount, setOfflineCount] = useState(0);
  const [offlineBytes, setOfflineBytes] = useState(0);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState('');

  const [actionModal, setActionModal] = useState<'change-password' | 'delete-account' | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const loadPreferences = useCallback(async () => {
    setPreferencesLoading(true);
    setPreferencesError('');

    try {
      const saved = await AsyncStorage.getItem(PREFERENCES_KEY);
      if (saved) {
        const parsed: Partial<Preferences> = JSON.parse(saved);
        setPreferences({
          dataSaver: typeof parsed.dataSaver === 'boolean' ? parsed.dataSaver : DEFAULT_PREFERENCES.dataSaver,
          autoplay: typeof parsed.autoplay === 'boolean' ? parsed.autoplay : DEFAULT_PREFERENCES.autoplay,
          wifiOnlyDownloads: typeof parsed.wifiOnlyDownloads === 'boolean' ? parsed.wifiOnlyDownloads : DEFAULT_PREFERENCES.wifiOnlyDownloads,
        });
      }
    } catch {
      setPreferencesError('Could not load saved preferences.');
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      setPreferencesError('');
    } catch {
      setPreferencesError('Could not save the setting. Please try again.');
      setPreferences(preferences);
      Alert.alert('Setting not saved', 'Please try changing it again.');
    }
  };

  const refreshOfflineStorage = useCallback(async () => {
    setStorageLoading(true);
    setStorageError('');

    try {
      const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
        key.startsWith(OFFLINE_VIDEO_KEY_PREFIX),
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
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Could not read offline storage.');
    } finally {
      setStorageLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPreferences();
      void refreshOfflineStorage();
    }, [loadPreferences, refreshOfflineStorage]),
  );

  function confirmClearOfflineVideos() {
    Alert.alert(
      'Remove offline videos?',
      'Downloaded TV videos will be removed from this device. Online posts will remain available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove downloads',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
                  key.startsWith(OFFLINE_VIDEO_KEY_PREFIX),
                );
                const entries = await AsyncStorage.multiGet(keys);

                for (const [, uri] of entries) {
                  if (uri) {
                    const file = new File(uri);
                    if (file.exists) file.delete();
                  }
                }

                await AsyncStorage.multiRemove(keys);
                await refreshOfflineStorage();
                Alert.alert('Downloads removed', 'Offline videos were cleared.');
              } catch {
                Alert.alert('Could not clear downloads', 'Please try again.');
              }
            })();
          },
        },
      ],
    );
  }

  async function signOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of BRITUME?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              Alert.alert('Sign out failed', error.message);
            }
          },
        },
      ]
    );
  }

  async function openDeviceSettings() {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert('Settings unavailable', 'Open your device settings to manage BRITUME permissions.');
    }
  }

  async function openSettingsActionModal(mode: 'change-password' | 'delete-account') {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setConfirmationEmail('');
    setAccountEmail('');

    if (mode === 'delete-account') {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        Alert.alert('Account unavailable', error.message);
        return;
      }
      setAccountEmail(data.user?.email ?? '');
    }
    setActionModal(mode);
  }

  function closeSettingsActionModal() {
    if (actionBusy) return;
    setActionModal(null);
  }

  async function changeAccountPassword() {
    if (newPassword.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password twice.');
      return;
    }

    setActionBusy(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user?.email) {
        throw userError ?? new Error('Could not load your account email.');
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: data.user.email,
        password: currentPassword,
      });
      if (reauthError) throw new Error('Current password is incorrect.');

