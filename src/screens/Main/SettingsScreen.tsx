import React, { useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { File } from 'expo-file-system';
import {
ActivityIndicator,
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
import {
formatStorageSize,
OFFLINE_VIDEO_KEY_PREFIX,
} from '../../services/contentRules.mjs';
import type {
MainTabParamList,
RootStackParamList,
} from '../../navigation/types';
import { useAppTheme } from '../../theme/AppThemeContext';

type SettingsNavigationProp = CompositeNavigationProp<
BottomTabNavigationProp<MainTabParamList, 'SETTINGS'>,
NativeStackNavigationProp<RootStackParamList>

«;»

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

const [actionModal, setActionModal] = useState<
'change-password' | 'delete-account' | null

«(null);
const [currentPassword, setCurrentPassword] = useState('');
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [confirmationEmail, setConfirmationEmail] = useState('');
const [accountEmail, setAccountEmail] = useState('');
const [actionBusy, setActionBusy] = useState(false);»

const appVersion =
(appConfig as { expo?: { version?: string } }).expo?.version ?? '1.0.0';

const backgroundColor = palette?.background ?? '#F2F7FF';
const surfaceColor = palette?.surface ?? '#FFFFFF';
const textColor = palette?.text ?? '#203450';
const mutedColor = palette?.muted ?? '#71839D';
const borderColor = palette?.border ?? '#D7E7FC';
const accentColor = palette?.primary ?? '#2869C7';

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

const updatePreference = useCallback(
async (key: keyof Preferences, value: boolean) => {
const previous = preferences;
const updated = { ...previous, [key]: value };

  setPreferences(updated);

  try {
    await AsyncStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify(updated),
    );
    setPreferencesError('');
  } catch {
    setPreferencesError('Could not save the setting. Please try again.');
    setPreferences(previous);
    Alert.alert(
      'Setting not saved',
      'Please try changing it again.',
    );
  }
},
[preferences],

);

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

    try {
      const file = new File(uri);

      if (!file.exists) {
        staleKeys.push(key);
        continue;
      }

      count += 1;
      bytes += file.size ?? 0;
    } catch {
      staleKeys.push(key);
    }
  }

  if (staleKeys.length > 0) {
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
const keys = (await AsyncStorage.getAllKeys()).filter(
(key) => key.startsWith(OFFLINE_VIDEO_KEY_PREFIX),
);
const entries = await AsyncStorage.multiGet(keys);

            for (const [, uri] of entries) {
              if (!uri) continue;

              try {
                const file = new File(uri);
                if (file.exists) file.delete();
              } catch {
                // Continue clearing other downloads.
              }
            }

            await AsyncStorage.multiRemove(keys);
            await refreshOfflineStorage();

            Alert.alert(
              'Downloads removed',
              'Offline video records were cleared.',
            );
          } catch {
            Alert.alert(
              'Could not clear downloads',
              'Please try again.',
            );
          }
        })();
      },
    },
  ],
);

}

function signOut() {
Alert.alert(
'Sign out',
'Are you sure you want to sign out of BRITUME?',
[
{ text: 'Cancel', style: 'cancel' },
{
text: 'Sign out',
style: 'destructive',
onPress: () => {
void (async () => {
const { error } = await supabase.auth.signOut();

          if (error) {
            Alert.alert('Sign out failed', error.message);
          }
        })();
      },
    },
  ],
);

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

  const email = data.user?.email ?? '';
  setAccountEmail(email);

  if (!email) {
    Alert.alert(
      'Account email unavailable',
      'Your account must have an email address to use this confirmation flow.',
    );
    return;
  }
}

setActionModal(mode);

}

function closeSettingsActionModal() {
if (actionBusy) return;
setActionModal(null);
}

async function changeAccountPassword() {
if (!currentPassword) {
Alert.alert(
'Current password required',
'Enter your current password.',
);
return;
}

if (newPassword.length < 8) {
  Alert.alert('Password too short', 'Use at least 8 characters.');
  return;
}

if (newPassword !== confirmPassword) {
  Alert.alert(
    'Passwords do not match',
    'Enter the same new password twice.',
  );
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

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) throw updateError;

  setActionModal(null);
  setCurrentPassword('');
  setNewPassword('');
  setConfirmPassword('');

  Alert.alert(
    'Password changed',
    'Your account password was updated.',
  );
} catch (error) {
  Alert.alert(
    'Password change failed',
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
'Email does not match',
'Enter your account email exactly to confirm deletion.',
);
return;
}

Alert.alert(
  'Permanently delete account?',
  'This action cannot be undone. Your account deletion request will be sent to the server.',
  [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete account',
      style: 'destructive',
      onPress: () => {
        void (async () => {
          setActionBusy(true);

          try {
            const { data, error: sessionError } =
              await supabase.auth.getSession();

            if (sessionError) throw sessionError;

            if (!data.session) {
              throw new Error(
                'Your session has expired. Sign in again.',
              );
            }

            const { data: result, error } =
              await supabase.functions.invoke('delete-account', {
                body: {
                  confirmationEmail: confirmationEmail.trim(),
                },
              });

            if (error) throw error;

            if (result?.error) {
              throw new Error(String(result.error));
            }

            const { error: signOutError } =
              await supabase.auth.signOut();

            if (signOutError) {
              console.warn(
                'Account deletion was requested but sign-out failed:',
                signOutError.message,
              );
            }

            setActionModal(null);
            Alert.alert(
              'Deletion request completed',
              'The server accepted the account deletion request.',
            );
          } catch (error) {
            Alert.alert(
              'Account deletion failed',
              error instanceof Error
                ? error.message
                : 'The server could not process the request. No deletion is confirmed.',
            );
          } finally {
            setActionBusy(false);
          }
        })();
      },
    },
  ],
);

}

function navigateTo(route: string) {
try {
navigation.navigate(route as never);
} catch {
Alert.alert(
'Page unavailable',
'This page is not currently registered in the app navigation.',
);
}
}

return (
<View style={[styles.screen, { backgroundColor }]}>
<ScrollView
contentContainerStyle={styles.container}
showsVerticalScrollIndicator={false}
>
<View style={styles.header}>
<View>
<Text style={[styles.eyebrow, { color: accentColor }]}>
BRITUME
</Text>
<Text style={[styles.pageTitle, { color: textColor }]}>
Settings
</Text>
<Text style={[styles.subtitle, { color: mutedColor }]}>
Manage your account and app preferences
</Text>
</View>

      <View
        style={[
          styles.headerIcon,
          { backgroundColor: surfaceColor, borderColor },
        ]}
      >
        <Ionicons
          name="settings-outline"
          size={24}
          color={accentColor}
        />
      </View>
    </View>

    <View
      style={[
        styles.card,
        { backgroundColor: surfaceColor, borderColor },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Your account
      </Text>

      {settingsSections.map((item) => (
        <Pressable
          key={item.title}
          accessibilityRole="button"
          onPress={() => navigateTo(item.route)}
          style={({ pressed }) => [
            styles.settingRow,
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[styles.rowIcon, { backgroundColor }]}
          >
            <Ionicons
              name={item.icon}
              size={20}
              color={accentColor}
            />
          </View>

          <View style={styles.rowText}>
            <Text style={[styles.rowTitle, { color: textColor }]}>
              {item.title}
            </Text>
            <Text
              style={[styles.rowDescription, { color: mutedColor }]}
            >
              {item.body}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward-outline"
            size={17}
            color={mutedColor}
          />
        </Pressable>
      ))}

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          void openSettingsActionModal('change-password')
        }
        style={({ pressed }) => [
          styles.settingRow,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.rowIcon, { backgroundColor }]}>
          <Ionicons
            name="key-outline"
            size={20}
            color={accentColor}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: textColor }]}>
            Change account password
          </Text>
          <Text
            style={[styles.rowDescription, { color: mutedColor }]}
          >
            Verify your current password before changing it.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward-outline"
          size={17}
          color={mutedColor}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => void openDeviceSettings()}
        style={({ pressed }) => [
          styles.settingRow,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.rowIcon, { backgroundColor }]}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={accentColor}
          />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { color: textColor }]}>
            Privacy and permissions
          </Text>
          <Text
            style={[styles.rowDescription, { color: mutedColor }]}
          >
            Manage BRITUME permissions in device settings.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward-outline"
          size={17}
          color={mutedColor}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          void openSettingsActionModal('delete-account')
        }
        style={({ pressed }) => [
          styles.settingRow,
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.rowIcon, styles.dangerIcon]}>
          <Ionicons
            name="trash-outline"
            size={20}
            color="#C43D4D"
          />
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, styles.dangerText]}>
            Delete account
          </Text>
          <Text
            style={[styles.rowDescription, { color: mutedColor }]}
          >
            Permanently request account deletion.
          </Text>
        </View>
        <Ionicons
          name="chevron-forward-outline"
          size={17}
          color={mutedColor}
        />
      </Pressable>
    </View>

    <View
      style={[
        styles.card,
        { backgroundColor: surfaceColor, borderColor },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Data and playback
      </Text>

      {preferencesLoading ? (
        <ActivityIndicator
          color={accentColor}
          style={styles.loader}
        />
      ) : (
        <>
          <PreferenceRow
            title="Data Saver"
            description="Reduce mobile data usage where supported."
            value={preferences.dataSaver}
            onValueChange={(value) =>
              void updatePreference('dataSaver', value)
            }
            accentColor={accentColor}
            textColor={textColor}
            mutedColor={mutedColor}
          />

          <PreferenceRow
            title="Autoplay videos"
            description="Allow videos to start automatically where supported."
            value={preferences.autoplay}
            onValueChange={(value) =>
              void updatePreference('autoplay', value)
            }
            accentColor={accentColor}
            textColor={textColor}
            mutedColor={mutedColor}
          />

          <PreferenceRow
            title="Wi-Fi only downloads"
            description="Preference for download features that support this setting."
            value={preferences.wifiOnlyDownloads}
            onValueChange={(value) =>
              void updatePreference('wifiOnlyDownloads', value)
            }
            accentColor={accentColor}
            textColor={textColor}
            mutedColor={mutedColor}
          />
        </>
      )}

      {!!preferencesError && (
        <Text style={styles.errorText}>{preferencesError}</Text>
      )}
    </View>

    <View
      style={[
        styles.card,
        { backgroundColor: surfaceColor, borderColor },
      ]}
    >
      <View style={styles.storageHeader}>
        <View style={styles.rowText}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Offline storage
          </Text>
          <Text
            style={[styles.rowDescription, { color: mutedColor }]}
          >
            Videos saved for offline viewing on this device.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh offline storage"
          onPress={() => void refreshOfflineStorage()}
          style={styles.smallIconButton}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={accentColor}
          />
        </Pressable>
      </View>

      {storageLoading ? (
        <ActivityIndicator
          color={accentColor}
          style={styles.loader}
        />
      ) : (
        <>
          <View style={styles.storageStats}>
            <View
              style={[styles.storageStat, { backgroundColor }]}
            >
              <Text style={[styles.statValue, { color: textColor }]}>
                {offlineCount}
              </Text>
              <Text style={[styles.statLabel, { color: mutedColor }]}>
                Videos
              </Text>
            </View>

            <View
              style={[styles.storageStat, { backgroundColor }]}
            >
              <Text style={[styles.statValue, { color: textColor }]}>
                {formatStorageSize(offlineBytes)}
              </Text>
              <Text style={[styles.statLabel, { color: mutedColor }]}>
                Used
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={offlineCount === 0}
            onPress={confirmClearOfflineVideos}
            style={({ pressed }) => [
              styles.secondaryButton,
              offlineCount === 0 && styles.disabledButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={17}
              color="#C43D4D"
            />
            <Text style={styles.secondaryButtonText}>
              Remove offline videos
            </Text>
          </Pressable>
        </>
      )}

      {!!storageError && (
        <Text style={styles.errorText}>{storageError}</Text>
      )}
    </View>

    <Pressable
      accessibilityRole="button"
      onPress={signOut}
      style={({ pressed }) => [
        styles.signOutButton,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons
        name="log-out-outline"
        size={20}
        color="#C43D4D"
      />
      <Text style={styles.signOutText}>Sign out</Text>
    </Pressable>

    <Text style={[styles.versionText, { color: mutedColor }]}>
      BRITUME - Version {appVersion}
    </Text>
    <Text style={[styles.footerText, { color: mutedColor }]}>
      See Beyond. Move Forward.
    </Text>
  </ScrollView>

  <Modal
    visible={actionModal !== null}
    transparent
    animationType="fade"
    onRequestClose={closeSettingsActionModal}
  >
    <View style={styles.modalBackdrop}>
      <View
        style={[styles.modalCard, { backgroundColor: surfaceColor }]}
      >
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: textColor }]}>
            {actionModal === 'change-password'
              ? 'Change password'
              : 'Delete account'}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close dialog"
            disabled={actionBusy}
            onPress={closeSettingsActionModal}
            style={styles.modalClose}
          >
            <Ionicons
              name="close"
              size={23}
              color={mutedColor}
            />
          </Pressable>
        </View>

        {actionModal === 'change-password' ? (
          <>
            <Text
              style={[
                styles.modalDescription,
                { color: mutedColor },
              ]}
            >
              Enter your current password and choose a new password
              with at least 8 characters.
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                { color: textColor, borderColor },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor={mutedColor}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={[
                styles.modalInput,
                { color: textColor, borderColor },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor={mutedColor}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={[
                styles.modalInput,
                { color: textColor, borderColor },
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={mutedColor}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              accessibilityRole="button"
              disabled={actionBusy}
              onPress={() => void changeAccountPassword()}
              style={[
                styles.modalPrimaryButton,
                actionBusy && styles.disabledButton,
              ]}
            >
              {actionBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryText}>
                  Update password
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text
              style={[
                styles.modalDescription,
                { color: mutedColor },
              ]}
            >
              This action is permanent. Enter your account email to
              confirm. The request requires the delete-account Edge
              Function to be deployed and configured correctly.
            </Text>

            <Text
              style={[styles.accountEmail, { color: textColor }]}
            >
              Account: {accountEmail}
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                { color: textColor, borderColor },
              ]}
              value={confirmationEmail}
              onChangeText={setConfirmationEmail}
              placeholder="Enter your account email"
              placeholderTextColor={mutedColor}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              accessibilityRole="button"
              disabled={actionBusy}
              onPress={() => void deleteAccount()}
              style={[
                styles.modalDangerButton,
                actionBusy && styles.disabledButton,
              ]}
            >
              {actionBusy ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.modalPrimaryText}>
                  Request account deletion
                </Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  </Modal>
</View>

);
}

function PreferenceRow({
title,
description,
value,
onValueChange,
accentColor,
textColor,
mutedColor,
}: {
title: string;
description: string;
value: boolean;
onValueChange: (value: boolean) => void;
accentColor: string;
textColor: string;
mutedColor: string;
}) {
return (
<View style={styles.preferenceRow}>
<View style={styles.rowText}>
<Text style={[styles.rowTitle, { color: textColor }]}>
{title}
</Text>
<Text style={[styles.rowDescription, { color: mutedColor }]}>
{description}
</Text>
</View>

  <Switch
    value={value}
    onValueChange={onValueChange}
    trackColor={{
      false: '#CBD5E1',
      true: accentColor,
    }}
  />
</View>

);
}

const styles = StyleSheet.create({
screen: {
flex: 1,
},
container: {
padding: 18,
paddingBottom: 40,
},
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: 20,
},
eyebrow: {
fontSize: 10,
fontWeight: '800',
letterSpacing: 2,
marginBottom: 5,
},
pageTitle: {
fontSize: 28,
fontWeight: '800',
},
subtitle: {
fontSize: 12,
marginTop: 6,
},
headerIcon: {
width: 48,
height: 48,
borderWidth: 1,
borderRadius: 16,
alignItems: 'center',
justifyContent: 'center',
},
card: {
borderRadius: 20,
borderWidth: 1,
padding: 16,
marginBottom: 15,
},
sectionTitle: {
fontSize: 16,
fontWeight: '800',
marginBottom: 10,
},
settingRow: {
flexDirection: 'row',
alignItems: 'center',
paddingVertical: 12,
gap: 12,
},
rowIcon: {
width: 42,
height: 42,
borderRadius: 13,
justifyContent: 'center',
alignItems: 'center',
},
rowText: {
flex: 1,
},
rowTitle: {
fontSize: 13,
fontWeight: '700',
},
rowDescription: {
fontSize: 11,
lineHeight: 16,
marginTop: 4,
},
pressed: {
opacity: 0.75,
},
dangerIcon: {
backgroundColor: '#FDECEF',
},
dangerText: {
color: '#C43D4D',
},
preferenceRow: {
flexDirection: 'row',
alignItems: 'center',
gap: 12,
paddingVertical: 13,
},
loader: {
marginVertical: 18,
},
errorText: {
color: '#C43D4D',
fontSize: 12,
marginTop: 10,
},
storageHeader: {
flexDirection: 'row',
alignItems: 'center',
gap: 10,
},
smallIconButton: {
width: 38,
height: 38,
borderRadius: 12,
alignItems: 'center',
justifyContent: 'center',
backgroundColor: '#EAF3FF',
},
storageStats: {
flexDirection: 'row',
gap: 10,
marginVertical: 15,
},
storageStat: {
flex: 1,
padding: 14,
borderRadius: 14,
},
statValue: {
fontSize: 19,
fontWeight: '800',
},
statLabel: {
fontSize: 11,
marginTop: 4,
},
secondaryButton: {
minHeight: 46,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: 8,
borderRadius: 13,
borderWidth: 1,
borderColor: '#F2C8CE',
backgroundColor: '#FFF7F8',
padding: 12,
},
secondaryButtonText: {
color: '#C43D4D',
fontWeight: '700',
fontSize: 12,
},
disabledButton: {
opacity: 0.55,
},
signOutButton: {
minHeight: 50,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
gap: 9,
borderRadius: 15,
borderWidth: 1,
borderColor: '#F2C8CE',
backgroundColor: '#FFF7F8',
marginTop: 4,
},
signOutText: {
color: '#C43D4D',
fontWeight: '800',
fontSize: 14,
},
versionText: {
textAlign: 'center',
fontSize: 11,
marginTop: 22,
},
footerText: {
textAlign: 'center',
fontSize: 11,
marginTop: 5,
},
modalBackdrop: {
flex: 1,
backgroundColor: 'rgba(12,25,45,0.52)',
justifyContent: 'center',
padding: 20,
},
modalCard: {
borderRadius: 22,
padding: 20,
},
modalHeader: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: 8,
},
modalTitle: {
fontSize: 20,
fontWeight: '800',
flex: 1,
},
modalClose: {
width: 36,
height: 36,
alignItems: 'center',
justifyContent: 'center',
},
modalDescription: {
fontSize: 12,
lineHeight: 18,
marginBottom: 14,
},
modalInput: {
minHeight: 48,
borderWidth: 1,
borderRadius: 12,
paddingHorizontal: 13,
marginBottom: 12,
fontSize: 14,
},
accountEmail: {
fontSize: 12,
fontWeight: '700',
marginBottom: 12,
},
modalPrimaryButton: {
minHeight: 48,
alignItems: 'center',
justifyContent: 'center',
backgroundColor: '#2869C7',
borderRadius: 13,
marginTop: 4,
padding: 12,
},
modalDangerButton: {
minHeight: 48,
alignItems: 'center',
justifyContent: 'center',
backgroundColor: '#C43D4D',
borderRadius: 13,
marginTop: 4,
padding: 12,
},
modalPrimaryText: {
color: '#FFFFFF',
fontWeight: '800',
fontSize: 13,
textAlign: 'center',
},
});
