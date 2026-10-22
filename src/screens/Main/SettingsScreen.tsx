
import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { File } from 'expo-file-system';
import {
  Alert,
  Button,
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
  },
  {
    title: 'Manage Categories',
    body: 'Choose which six shortcuts appear at the top of LIVING.',
    route: 'ManageCategories',
  },
  {
    title: 'Security',
    body: 'Manage your app PIN and device biometrics.',
    route: 'Security',
  },
  {
    title: 'Change account password',
    body: 'Verify your current password before changing it.',
    action: 'change-password',
  },
  {
    title: 'Privacy & permissions',
    body: 'Open device settings to manage BRITUME permissions.',
    action: 'device-settings',
  },
  {
    title: 'Delete account',
    body: 'Permanently delete your account after verification.',
    action: 'delete-account',
  },
  {
    title: 'Notifications',
    body: 'Manage your notification preferences.',
    route: 'Notifications',
  },
  {
    title: 'Appearance / Themes',
    body: 'Choose your app theme and appearance.',
    route: 'Themes',
  },
  {
    title: 'Premium',
    body: 'Check your membership information.',
    route: 'Premium',
  },
  {
    title: 'Gallery',
    body: 'Access selected photos and videos.',
    route: 'Gallery',
  },
  {
    title: 'Labs',
    body: 'Manage Focus Mode and Compact Home.',
    route: 'Labs',
  },
] as const;

export default function SettingsScreen({
  navigation,
}: {
  navigation: SettingsNavigationProp;
}) {
  const { palette } = useAppTheme();

  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesError, setPreferencesError] = useState('');

  const [offlineCount, setOfflineCount] = useState(0);
  const [offlineBytes, setOfflineBytes] = useState(0);
  const [storageLoading, setStorageLoading] = useState(true);
  const [storageError, setStorageError] = useState('');

  const [actionModal, setActionModal] =
    useState<'change-password' | 'delete-account' | null>(null);
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
          dataSaver:
            typeof parsed.dataSaver === 'boolean'
              ? parsed.dataSaver
              : DEFAULT_PREFERENCES.dataSaver,
          autoplay:
            typeof parsed.autoplay === 'boolean'
              ? parsed.autoplay
              : DEFAULT_PREFERENCES.autoplay,
          wifiOnlyDownloads:
            typeof parsed.wifiOnlyDownloads === 'boolean'
              ? parsed.wifiOnlyDownloads
              : DEFAULT_PREFERENCES.wifiOnlyDownloads,
        });
      }
    } catch {
      setPreferencesError('Could not load saved preferences.');
    } finally {
      setPreferencesLoading(false);
    }
  }, []);

  const updatePreference = async (
    key: keyof Preferences,
    value: boolean,
  ) => {
    const updated = { ...preferences, [key]: value };

    setPreferences(updated);

    try {
      await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
      setPreferencesError('');
    } catch {
      setPreferencesError(
        'Could not save the setting. Please try again.',
      );
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
      setStorageError(
        error instanceof Error
          ? error.message
          : 'Could not read offline storage.',
      );
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
    const { error } = await supabase.auth.signOut();

    if (error) {
      Alert.alert('Sign out failed', error.message);
      return;
    }

    Alert.alert('Signed out', 'You have been signed out of BRITUME.');
  }

  async function openDeviceSettings() {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        'Settings unavailable',
        'Open your device settings to manage BRITUME permissions.',
      );
    }
  }

  async function openSettingsActionModal(
    mode: 'change-password' | 'delete-account',
  ) {
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
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setConfirmationEmail('');
    setAccountEmail('');
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

      const { error: reauthError } =
        await supabase.auth.signInWithPassword({
          email: data.user.email,
          password: currentPassword,
        });

      if (reauthError) {
        throw new Error('Current password is incorrect.');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setActionModal(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      Alert.alert('Password updated', 'Your account password has changed.');
    } catch (error) {
      Alert.alert(
        'Could not change password',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteAccount() {
    if (
      !accountEmail ||
      confirmationEmail.trim().toLowerCase() !== accountEmail.toLowerCase()
    ) {
      Alert.alert(
        'Confirm your email',
        'Enter the signed-in account email to continue.',
      );
      return;
    }

    setActionBusy(true);

    try {
      const { error: reauthError } =
        await supabase.auth.signInWithPassword({
          email: accountEmail,
          password: currentPassword,
        });

      if (reauthError) {
        throw new Error('Current password is incorrect. Account not deleted.');
      }

      const { error } =
        await supabase.functions.invoke('delete-account');

      if (error) {
        throw new Error(
          `Account deletion did not complete. Check that the secure delete-account function is deployed. ${error.message}`,
        );
      }

      setActionModal(null);
      await supabase.auth.signOut({ scope: 'local' });

      Alert.alert('Account deleted', 'Your BRITUME account has been deleted.');
    } catch (error) {
      Alert.alert(
        'Could not delete account',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setActionBusy(false);
    }
  }

  function navigateToSection(title: string) {
    switch (title) {
      case 'Account':
        navigation.navigate('PROFILE');
        break;
      case 'Security':
        navigation.navigate('Security');
        break;
      case 'Notifications':
        navigation.navigate('Notifications');
        break;
      case 'Appearance / Themes':
        navigation.navigate('Themes');
        break;
      case 'Premium':
        navigation.navigate('Premium');
        break;
      case 'Gallery':
        navigation.navigate('Gallery');
        break;
      case 'Labs':
        navigation.navigate('Labs');
        break;
    }
  }

  function renderPreference(
    title: string,
    description: string,
    key: keyof Preferences,
  ) {
    return (
      <View
        key={key}
        style={[
          styles.preferenceRow,
          { borderColor: palette.border },
        ]}
      >
        <View style={styles.preferenceText}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {title}
          </Text>
          <Text style={[styles.sectionBody, { color: palette.muted }]}>
            {description}
          </Text>
        </View>

        <Switch
          accessibilityLabel={title}
          value={preferences[key]}
          onValueChange={(value) => void updatePreference(key, value)}
          trackColor={{ false: '#465064', true: '#9a7a36' }}
          thumbColor={preferences[key] ? '#f0d38b' : '#e4e7ec'}
        />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: palette.background },
      ]}
    >
      <Text style={[styles.kicker, { color: palette.accent }]}>
        BRITUME • SETTINGS
      </Text>

      <Text style={[styles.title, { color: palette.text }]}>
        Control center
      </Text>

      <View
        style={[
          styles.section,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Playback & data
        </Text>

        <Text style={[styles.sectionBody, { color: palette.muted }]}>
          Control your preferred data and playback settings.
        </Text>

        {preferencesLoading ? (
          <Text style={[styles.sectionBody, { color: palette.muted }]}>
            Loading saved preferences…
          </Text>
        ) : (
          <>
            {renderPreference(
              'Data Saver',
              'Preference for reducing mobile data use. Video screens must apply this setting.',
              'dataSaver',
            )}

            {renderPreference(
              'Autoplay videos',
              'Save your autoplay preference for supported video screens.',
              'autoplay',
            )}

            {renderPreference(
              'Wi-Fi-only downloads',
              'Preference for downloads. Download screens must enforce this setting.',
              'wifiOnlyDownloads',
            )}
          </>
        )}

        {preferencesError ? (
          <Text style={styles.errorText}>{preferencesError}</Text>
        ) : null}
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Privacy & safety
        </Text>

        <Text style={[styles.sectionBody, { color: palette.muted }]}>
          Manage device permissions and account security. User blocking,
          reporting, and moderation still need integration with the social
          screens and secure backend.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => void openDeviceSettings()}
          style={styles.outlineButton}
        >
          <Text style={[styles.storageButtonText, { color: palette.accent }]}>
            Open device permissions
          </Text>
        </Pressable>
      </View>

      {settingsSections.map((section) => {
        const isDelete = 'action' in section &&
          section.action === 'delete-account';

        return (
          <Pressable
            key={section.title}
            accessibilityRole="button"
            onPress={() => {
              if ('action' in section) {
                if (section.action === 'device-settings') {
                  void openDeviceSettings();
                } else if (section.action === 'change-password') {
                  void openSettingsActionModal('change-password');
                } else if (section.action === 'delete-account') {
                  void openSettingsActionModal('delete-account');
                }
              } else {
                navigateToSection(section.title);
              }
            }}
            style={({ pressed }) => [
              styles.section,
              { backgroundColor: palette.surface, borderColor: palette.border },
              pressed && styles.sectionPressed,
            ]}
          >
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>
                {section.title}
              </Text>

              {isDelete ? (
                <Text style={styles.dangerLabel}>IRREVERSIBLE</Text>
              ) : (
                <Text style={[styles.arrow, { color: palette.accent }]}>›</Text>
              )}
            </View>

            <Text style={[styles.sectionBody, { color: palette.muted }]}>
              {section.body}
            </Text>
          </Pressable>
        );
      })}

      <View
        style={[
          styles.section,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          Storage
        </Text>

        <Text style={[styles.sectionBody, { color: palette.muted }]}>
          {storageLoading
            ? 'Checking offline videos…'
            : `${offlineCount} offline video${offlineCount === 1 ? '' : 's'} · ${formatStorageSize(offlineBytes)}`}
        </Text>

        {storageError ? (
          <Text style={styles.errorText}>{storageError}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={storageLoading || offlineCount === 0}
          onPress={confirmClearOfflineVideos}
          style={[
            styles.outlineButton,
            (storageLoading || offlineCount === 0) &&
              styles.storageButtonDisabled,
          ]}
        >
          <Text style={[styles.storageButtonText, { color: palette.accent }]}>
            Clear offline videos
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: palette.text }]}>
          About BRITUME
        </Text>

        <Text style={[styles.sectionBody, { color: palette.muted }]}>
          BRITUME community and content app.
        </Text>

        <Text style={[styles.sectionBody, { color: palette.muted }]}>
          Version {appConfig.expo.version}
        </Text>
      </View>

      <View style={styles.signOutWrap}>
        <Button title="Sign out" onPress={() => void signOut()} />
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={actionModal !== null}
        onRequestClose={closeSettingsActionModal}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              {actionModal === 'delete-account'
                ? 'Delete your account?'
                : 'Change account password'}
            </Text>

            <Text style={[styles.sectionBody, { color: palette.muted }]}>
              {actionModal === 'delete-account'
                ? 'Account deletion is permanent. Enter your current password and account email.'
                : 'Confirm your current password, then choose a new one.'}
            </Text>

            <TextInput
              accessibilityLabel="Current account password"
              autoCapitalize="none"
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor="#7d8797"
              secureTextEntry
              style={styles.modalInput}
              value={currentPassword}
            />

            {actionModal === 'change-password' ? (
              <>
                <TextInput
                  accessibilityLabel="New account password"
                  autoCapitalize="none"
                  onChangeText={setNewPassword}
                  placeholder="New password (at least 8 characters)"
                  placeholderTextColor="#7d8797"
                  secureTextEntry
                  style={styles.modalInput}
                  value={newPassword}
                />

                <TextInput
                  accessibilityLabel="Confirm new account password"
                  autoCapitalize="none"
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#7d8797"
                  secureTextEntry
                  style={styles.modalInput}
                  value={confirmPassword}
                />
              </>
            ) : (
              <>
                <Text style={[styles.sectionBody, { color: palette.muted }]}>
                  Type {accountEmail || 'your signed-in account email'} to confirm.
                </Text>

                <TextInput
                  accessibilityLabel="Confirm account email for deletion"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  onChangeText={setConfirmationEmail}
                  placeholder="Account email"
                  placeholderTextColor="#7d8797"
                  style={styles.modalInput}
                  value={confirmationEmail}
                />
              </>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={actionBusy}
              onPress={() =>
                actionModal === 'delete-account'
                  ? void deleteAccount()
                  : void changeAccountPassword()
              }
              style={[
                styles.modalPrimaryButton,
                actionModal === 'delete-account' && styles.modalDangerButton,
                actionBusy && styles.storageButtonDisabled,
              ]}
            >
              <Text style={styles.modalPrimaryText}>
                {actionBusy
                  ? 'PLEASE WAIT…'
                  : actionModal === 'delete-account'
                    ? 'DELETE ACCOUNT'
                    : 'UPDATE PASSWORD'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={actionBusy}
              onPress={closeSettingsActionModal}
              style={styles.modalCancelButton}
            >
              <Text style={[styles.storageButtonText, { color: palette.text }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    paddingBottom: 32,
  },
  kicker: {
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    overflow: 'hidden',
  },
  sectionPressed: {
    borderColor: '#d9b867',
    opacity: 0.8,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  arrow: {
    fontSize: 24,
    fontWeight: '700',
  },
  preferenceRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 12,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceText: {
    flex: 1,
  },
  outlineButton: {
    alignSelf: 'flex-start',
    borderColor: '#384b61',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  storageButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  storageButtonDisabled: {
    opacity: 0.45,
  },
  errorText: {
    color: '#f18e8e',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  dangerLabel: {
    color: '#f18e8e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  signOutWrap: {
    marginTop: 12,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.76)',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    maxWidth: 480,
    padding: 18,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 7,
  },
  modalInput: {
    backgroundColor: '#090d15',
    borderColor: '#2c3a4d',
    borderRadius: 11,
    borderWidth: 1,
    color: '#f4f6fa',
    fontSize: 14,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalPrimaryButton: {
    alignItems: 'center',
    backgroundColor: '#b9974e',
    borderRadius: 10,
    marginTop: 14,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalDangerButton: {
    backgroundColor: '#a93d49',
  },
  modalPrimaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  modalCancelButton: {
    alignItems: 'center',
    borderColor: '#384b61',
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 9,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
});
