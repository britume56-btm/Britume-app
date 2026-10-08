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
    title: 'Change account password',
    body: 'Re-enter your current password before setting a new one.',
    action: 'change-password',
  },
  {
    title: 'Privacy & permissions',
    body: 'Manage device permissions in system settings. BRITUME opens the system media picker so only items you choose are accessible.',
    action: 'device-settings',
  },
  {
    title: 'Delete account',
    body: 'Permanently delete your BRITUME account and associated profile data after password confirmation.',
    action: 'delete-account',
  },
  {
    title: 'Notifications',
    body: 'Read notifications and manage in-app preferences.',
    route: 'Notifications',
  },
  {
    title: 'Appearance / Themes',
    body: 'Choose an app theme or create a custom one.',
    route: 'Themes',
  },
  {
    title: 'Premium',
    body: 'Check verified membership status, expiration, and billing setup.',
    route: 'Premium',
  },
  {
    title: 'Gallery',
    body: 'Choose on-device photos or videos and manage the current selection.',
    route: 'Gallery',
  },
  {
    title: 'Labs',
    body: 'Enable or disable the account-synced Focus Mode and Compact Home experiments.',
    route: 'Labs',
  },
  {
    title: 'Storage',
    body: 'Review or clear on-device TV downloads.',
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
  const { palette } = useAppTheme();
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
      const { data } = await supabase.auth.getUser();
      setAccountEmail(data.user?.email ?? '');
    }
    setActionModal(mode);
  }

  function closeSettingsActionModal() {
    if (actionBusy) {
      return;
    }
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
      Alert.alert('Passwords do not match', 'Enter the same new password twice.');
      return;
    }

    setActionBusy(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user?.email) {
        throw userError ?? new Error('Your account email could not be loaded. Sign in again.');
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: data.user.email,
        password: currentPassword,
      });
      if (reauthError) {
        throw new Error('Current password is incorrect. Your password was not changed.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        throw updateError;
      }

      setActionModal(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password updated', 'Your BRITUME account password has been changed.');
    } catch (cause) {
      Alert.alert(
        'Could not change password',
        cause instanceof Error ? cause.message : 'Please try again.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function deleteAccount() {
    if (!accountEmail || confirmationEmail.trim().toLowerCase() !== accountEmail.toLowerCase()) {
      Alert.alert('Confirm your email', 'Enter the signed-in account email exactly to continue.');
      return;
    }

    setActionBusy(true);
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: accountEmail,
        password: currentPassword,
      });
      if (reauthError) {
        throw new Error('Current password is incorrect. Your account was not deleted.');
      }

      const { error: deleteError } = await supabase.functions.invoke('delete-account');
      if (deleteError) {
        throw new Error(
          `Account deletion did not complete. Check that the secure delete-account function is deployed, then retry. ${deleteError.message}`
        );
      }

      setActionModal(null);
      await supabase.auth.signOut({ scope: 'local' });
      Alert.alert('Account deleted', 'Your BRITUME account has been deleted.');
    } catch (cause) {
      Alert.alert(
        'Could not delete account',
        cause instanceof Error ? cause.message : 'Your account was not deleted. Please try again.'
      );
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • SETTINGS</Text>
      <Text style={[styles.title, { color: palette.text }]}>Control center</Text>

      {settingsSections.map((section) => {
        if (section.title === 'Storage') {
          return (
            <View key={section.title} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Storage</Text>
              <Text style={[styles.sectionBody, { color: palette.muted }]}>
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
              <Text style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text>
              <Text style={[styles.sectionBody, { color: palette.muted }]}>{section.body}</Text>
              <Text style={[styles.sectionBody, { color: palette.muted }]}>Version {appConfig.expo.version}</Text>
            </View>
          );
        }

        const implemented = 'route' in section || 'action' in section;
        const onPress = () => {
          if ('action' in section && section.action === 'device-settings') {
            void openDeviceSettings();
          } else if ('action' in section && section.action === 'change-password') {
            void openSettingsActionModal('change-password');
          } else if ('action' in section && section.action === 'delete-account') {
            void openSettingsActionModal('delete-account');
          } else if ('route' in section && section.route === 'PROFILE') {
            navigation.navigate('PROFILE');
          } else if ('route' in section && section.route === 'Security') {
            navigation.navigate('Security');
          } else if ('route' in section && section.route === 'Notifications') {
            navigation.navigate('Notifications');
          } else if ('route' in section && section.route === 'Themes') {
            navigation.navigate('Themes');
          } else if ('route' in section && section.route === 'Premium') {
            navigation.navigate('Premium');
          } else if ('route' in section && section.route === 'Gallery') {
            navigation.navigate('Gallery');
          } else if ('route' in section && section.route === 'Labs') {
            navigation.navigate('Labs');
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
              { backgroundColor: palette.surface, borderColor: palette.border },
              pressed && implemented && styles.sectionPressed,
              !implemented && styles.sectionDisabled,
            ]}
          >
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>{section.title}</Text>
              {section.title === 'Privacy & permissions' ? (
                <Text style={[styles.comingSoon, { color: palette.accent }]}>DEVICE SETTINGS</Text>
              ) : null}
              {'action' in section && section.action === 'delete-account' ? (
                <Text style={styles.dangerLabel}>IRREVERSIBLE</Text>
              ) : null}
            </View>
            <Text style={[styles.sectionBody, { color: palette.muted }]}>{section.body}</Text>
          </Pressable>
        );
      })}

      <View style={styles.signOutWrap}>
        <Button title="Sign out" onPress={signOut} />
      </View>
      <Modal
        animationType="fade"
        transparent
        visible={actionModal !== null}
        onRequestClose={closeSettingsActionModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.modalTitle, { color: palette.text }]}>
              {actionModal === 'delete-account' ? 'Delete your account?' : 'Change account password'}
            </Text>
            <Text style={[styles.sectionBody, { color: palette.muted }]}>
              {actionModal === 'delete-account'
                ? 'This permanently removes your account and profile data. Enter your current password and account email to confirm.'
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
                  Type {accountEmail || 'the signed-in account email'} to confirm.
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
              <Text style={[styles.storageButtonText, { color: palette.text }]}>Cancel</Text>
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
  dangerLabel: {
    color: '#f18e8e',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
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
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 7 },
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
    backgroundColor: '#d9b867',
    borderRadius: 10,
    marginTop: 14,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalDangerButton: { backgroundColor: '#a93d49' },
  modalPrimaryText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.7 },
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
