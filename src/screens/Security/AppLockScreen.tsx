
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

import {
  authenticateWithBiometrics,
  deletePinSecurely,
  getBiometricStatus,
  savePinSecurely,
  verifyPinSecurely,
} from '../../services/securityService';
import { useAppLock } from '../../security/AppLockContext';

type AppLockScreenProps = {
  mode?: 'manage' | 'verify';
  onUnlock?: () => void;
};

type ManageAction = 'idle' | 'change' | 'disable';

type LockPreferences = {
  wallpaper: string | null;
  wallpaperMode: 'adaptive' | 'custom';
  keypadStyle: 'glass' | 'round' | 'square';
  arrangement: 'standard' | 'shuffled';
  patternSymbol: 'dots' | 'stars' | 'diamonds' | 'circles';
  goldAccent: boolean;
  biometricEnabled: boolean;
};

const DEFAULT_PREFERENCES: LockPreferences = {
  wallpaper: null,
  wallpaperMode: 'adaptive',
  keypadStyle: 'glass',
  arrangement: 'standard',
  patternSymbol: 'dots',
  goldAccent: true,
  biometricEnabled: true,
};

const GOLD = '#D9B867';
const BACKGROUND = '#070B12';
const PANEL = 'rgba(23, 32, 48, 0.84)';
const BORDER = 'rgba(214, 226, 245, 0.18)';
const WHITE = '#F4F6FA';
const MUTED = '#AAB5C5';

export default function AppLockScreen({
  mode = 'manage',
  onUnlock,
}: AppLockScreenProps) {
  const { userId, hasPin, enableLock, disableLock } = useAppLock();

  const [preferences, setPreferences] =
    useState<LockPreferences>(DEFAULT_PREFERENCES);
  const [preferencesReady, setPreferencesReady] = useState(false);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [manageAction, setManageAction] =
    useState<ManageAction>('idle');

  const [loading, setLoading] = useState(false);
  const [biometricStatus, setBiometricStatus] =
    useState('Checking device support…');

  const accent = preferences.goldAccent ? GOLD : '#7CCBFF';

  useEffect(() => {
    let mounted = true;

    async function loadPreferences() {
      try {
        const saved = await AsyncStorage.getItem(
          `britume-lock-preferences-${userId}`,
        );

        if (saved && mounted) {
          const parsed = JSON.parse(saved) as Partial<LockPreferences>;

          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...parsed,
          });
        }
      } catch (error) {
        console.error('Could not load lock preferences:', error);
      } finally {
        if (mounted) setPreferencesReady(true);
      }
    }

    void loadPreferences();

    return () => {
      mounted = false;
    };
  }, [userId]);

  useEffect(() => {
    let mounted = true;

    void getBiometricStatus().then((status) => {
      if (!mounted) return;

      setBiometricStatus(
        status === 'available'
          ? 'Biometrics are ready on this device.'
          : status === 'not-enrolled'
            ? 'Enroll a fingerprint or supported face method in device settings.'
            : 'Device biometrics are unavailable. You can still use your PIN.',
      );
    });

    return () => {
      mounted = false;
    };
  }, []);

  const updatePreferences = useCallback(
    async (patch: Partial<LockPreferences>) => {
      const next = { ...preferences, ...patch };

      setPreferences(next);

      try {
        await AsyncStorage.setItem(
          `britume-lock-preferences-${userId}`,
          JSON.stringify(next),
        );
      } catch (error) {
        console.error('Could not save lock preferences:', error);
        Alert.alert(
          'Settings not saved',
          'BRITUME could not save your preferences. Please try again.',
        );
      }
    },
    [preferences, userId],
  );

  const chooseWallpaper = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      await updatePreferences({
        wallpaper: result.assets[0].uri,
        wallpaperMode: 'custom',
      });
    } catch (error) {
      console.error('Wallpaper selection failed:', error);
      Alert.alert('Wallpaper unavailable', 'Could not select that image.');
    }
  };

  const removeWallpaper = async () => {
    await updatePreferences({
      wallpaper: null,
      wallpaperMode: 'adaptive',
    });
  };

  const unlock = () => {
    onUnlock?.();
  };

  const handlePinSubmit = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      Alert.alert('PIN required', 'Enter your 4–8 digit PIN.');
      return;
    }

    setLoading(true);

    try {
      const verified = await verifyPinSecurely(pin, userId);

      if (!verified) {
        setPin('');
        Alert.alert('Incorrect PIN', 'Please try again.');
        return;
      }

      unlock();
    } catch (error) {
      console.error('PIN verification failed:', error);
      Alert.alert('Verification failed', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    setLoading(true);

    try {
      const status = await getBiometricStatus();

      if (status !== 'available') {
        Alert.alert(
          'Biometrics unavailable',
          status === 'not-enrolled'
            ? 'Enroll a supported biometric method in your phone settings, or use your PIN.'
            : 'Your device cannot authenticate with biometrics right now. Use your PIN.',
        );
        return;
      }

      const authenticated = await authenticateWithBiometrics();

      if (authenticated) {
        unlock();
      } else {
        Alert.alert(
          'Authentication not completed',
          'Use your PIN or try device authentication again.',
        );
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      Alert.alert('Authentication failed', 'Use your PIN instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePin = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      Alert.alert('Invalid PIN', 'Choose 4–8 digits.');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('PINs do not match', 'Confirm your new PIN correctly.');
      return;
    }

    setLoading(true);

    try {
      if (hasPin) {
        const currentValid = await verifyPinSecurely(currentPin, userId);

        if (!currentValid) {
          Alert.alert('Incorrect current PIN', 'Your PIN was not changed.');
          return;
        }
      }

      const saved = await savePinSecurely(pin, userId);

      if (!saved) {
        Alert.alert(
          'Could not save PIN',
          'Secure storage was unavailable. Please try again.',
        );
        return;
      }

      enableLock();
      setPin('');
      setConfirmPin('');
      setCurrentPin('');
      setManageAction('idle');

      Alert.alert(
        'BRITUME lock enabled',
        'Your PIN has been saved. Device biometrics can also be used when available.',
      );
    } catch (error) {
      console.error('Saving PIN failed:', error);
      Alert.alert('Could not save PIN', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisablePin = async () => {
    if (!/^\d{4,8}$/.test(currentPin)) {
      Alert.alert('Current PIN required', 'Enter your current PIN.');
      return;
    }

    setLoading(true);

    try {
      const verified = await verifyPinSecurely(currentPin, userId);

      if (!verified) {
        setCurrentPin('');
        Alert.alert('Incorrect PIN', 'Your lock was not changed.');
        return;
      }

      const removed = await deletePinSecurely(userId);

      if (!removed) {
        Alert.alert('Could not disable lock', 'Please try again.');
        return;
      }

      disableLock();
      setCurrentPin('');
      setManageAction('idle');

      Alert.alert('App lock disabled', 'The BRITUME PIN lock was disabled.');
    } catch (error) {
      console.error('Disabling lock failed:', error);
      Alert.alert('Could not disable lock', 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const keypadNumbers = useMemo(() => {
    return preferences.arrangement === 'standard'
      ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back']
      : ['7', '2', '9', '4', '0', '6', '1', '8', '3', 'clear', '5', 'back'];
  }, [preferences.arrangement]);

  const handleKeypadPress = (key: string) => {
    if (loading) return;

    if (key === 'clear') {
      setPin('');
    } else if (key === 'back') {
      setPin((value) => value.slice(0, -1));
    } else if (/^\d$/.test(key) && pin.length < 8) {
      setPin((value) => value + key);
    }
  };

  if (!preferencesReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={GOLD} size="large" />
        <Text style={styles.body}>Preparing BRITUME Security…</Text>
      </View>
    );
  }

  if (mode === 'verify') {
    return (
      <ImageBackground
        source={
          preferences.wallpaper
            ? { uri: preferences.wallpaper }
            : undefined
        }
        resizeMode="cover"
        style={styles.screen}
        imageStyle={styles.wallpaperImage}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.verifyContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.kicker, { color: accent }]}>
              BRITUME • SECURITY
            </Text>

            <Text style={styles.title}>Unlock BRITUME</Text>
            <Text style={styles.body}>
              Verify your identity to continue.
            </Text>

            <View
              style={styles.pinDots}
              accessibilityLabel={`${pin.length} of 8 PIN digits entered`}
            >
              {Array.from({ length: 6 }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    {
                      borderColor: accent,
                      backgroundColor: index < pin.length
                        ? accent
                        : 'transparent',
                    },
                  ]}
                />
              ))}
            </View>

            <View style={styles.keypad}>
              {keypadNumbers.map((key, index) => {
                const label =
                  key === 'clear' ? 'C' : key === 'back' ? '⌫' : key;

                return (
                  <Pressable
                    key={`${key}-${index}`}
                    accessibilityRole="button"
                    accessibilityLabel={
                      key === 'clear'
                        ? 'Clear PIN'
                        : key === 'back'
                          ? 'Delete last digit'
                          : `Digit ${key}`
                    }
                    onPress={() => handleKeypadPress(key)}
                    style={[
                      styles.key,
                      preferences.keypadStyle === 'round' && styles.roundKey,
                      preferences.keypadStyle === 'square' && styles.squareKey,
                      { borderColor: BORDER },
                    ]}
                  >
                    <Text style={[styles.keyText, { color: accent }]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <ActionButton
              label={loading ? 'VERIFYING…' : 'UNLOCK WITH PIN'}
              onPress={handlePinSubmit}
              disabled={loading}
              accent={accent}
            />

            {preferences.biometricEnabled && (
              <ActionButton
                label="USE FINGERPRINT / FACE"
                onPress={handleBiometric}
                disabled={loading}
                secondary
                accent={accent}
              />
            )}

            {loading && <ActivityIndicator color={accent} />}
          </ScrollView>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={
        preferences.wallpaper
          ? { uri: preferences.wallpaper }
          : undefined
      }
      resizeMode="cover"
      style={styles.screen}
      imageStyle={styles.wallpaperImage}
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.manageContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.kicker, { color: accent }]}>
            BRITUME • SECURITY CENTRE
          </Text>

          <Text style={styles.title}>Your security. Your style.</Text>

          <Text style={styles.body}>
            Personalise your lock screen and manage your existing PIN and
            device authentication.
          </Text>

          <GlassPanel>
            <Text style={styles.sectionTitle}>App lock</Text>

            <Text style={styles.body}>
              {hasPin
                ? 'Your PIN lock is enabled.'
                : 'Create a PIN to protect BRITUME when it is reopened.'}
            </Text>

            {hasPin && manageAction === 'idle' ? (
              <>
                <ActionButton
                  label="CHANGE PIN"
                  onPress={() => setManageAction('change')}
                  accent={accent}
                />

                <ActionButton
                  label="DISABLE PIN LOCK"
                  onPress={() => setManageAction('disable')}
                  secondary
                  accent={accent}
                />
              </>
            ) : (
              <>
                {hasPin && (
                  <PinField
                    label="Current PIN"
                    value={currentPin}
                    onChangeText={setCurrentPin}
                    accent={accent}
                  />
                )}

                {manageAction !== 'disable' && (
                  <>
                    <PinField
                      label="New PIN"
                      value={pin}
                      onChangeText={setPin}
                      accent={accent}
                    />

                    <PinField
                      label="Confirm new PIN"
                      value={confirmPin}
                      onChangeText={setConfirmPin}
                      accent={accent}
                    />

                    <ActionButton
                      label={loading ? 'SAVING…' : 'SAVE PIN'}
                      onPress={handleSavePin}
                      disabled={loading}
                      accent={accent}
                    />
                  </>
                )}

                {manageAction === 'disable' && (
                  <ActionButton
                    label={loading ? 'DISABLING…' : 'CONFIRM DISABLE'}
                    onPress={handleDisablePin}
                    disabled={loading}
                    accent={accent}
                  />
                )}

                <ActionButton
                  label="CANCEL"
                  onPress={() => {
                    setManageAction('idle');
                    setPin('');
                    setConfirmPin('');
                    setCurrentPin('');
                  }}
                  secondary
                  accent={accent}
                />
              </>
            )}
          </GlassPanel>

          <GlassPanel>
            <Text style={styles.sectionTitle}>Biometric authentication</Text>

            <Text style={styles.body}>{biometricStatus}</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Offer device biometrics</Text>
                <Text style={styles.caption}>
                  Uses authentication supported by the phone.
                </Text>
              </View>

              <Switch
                value={preferences.biometricEnabled}
                onValueChange={(value) =>
                  void updatePreferences({ biometricEnabled: value })
                }
                trackColor={{ false: '#364153', true: accent }}
                thumbColor={WHITE}
                accessibilityLabel="Enable biometric unlock option"
              />
            </View>
          </GlassPanel>

          <GlassPanel>
            <Text style={styles.sectionTitle}>Wallpaper</Text>

            <Text style={styles.body}>
              Adaptive black-and-gold styling is the default. Choose a photo
              to personalise the lock screen.
            </Text>

            <ActionButton
              label="CHOOSE FROM GALLERY"
              onPress={chooseWallpaper}
              accent={accent}
            />

            <ActionButton
              label="RESTORE ADAPTIVE WALLPAPER"
              onPress={removeWallpaper}
              secondary
              accent={accent}
            />

            <Text style={styles.caption}>
              Custom wallpaper selection is saved as a local preference.
            </Text>
          </GlassPanel>

          <GlassPanel>
            <Text style={styles.sectionTitle}>Keypad customisation</Text>

            <Text style={styles.settingTitle}>Button shape</Text>
            <ChoiceRow
              values={[
                { label: 'Glassy', value: 'glass' },
                { label: 'Round', value: 'round' },
                { label: 'Square', value: 'square' },
              ]}
              selected={preferences.keypadStyle}
              onSelect={(value) =>
                void updatePreferences({
                  keypadStyle: value as LockPreferences['keypadStyle'],
                })
              }
              accent={accent}
            />

            <Text style={styles.settingTitle}>Number arrangement</Text>
            <ChoiceRow
              values={[
                { label: 'Standard', value: 'standard' },
                { label: 'Shuffled', value: 'shuffled' },
              ]}
              selected={preferences.arrangement}
              onSelect={(value) =>
                void updatePreferences({
                  arrangement: value as LockPreferences['arrangement'],
                })
              }
              accent={accent}
            />

            <Text style={styles.caption}>
              Shuffled keys change the on-screen layout, not the PIN itself.
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingCopy}>
                <Text style={styles.settingTitle}>Gold accent</Text>
                <Text style={styles.caption}>
                  Turn off for a cool blue accent.
                </Text>
              </View>

              <Switch
                value={preferences.goldAccent}
                onValueChange={(value) =>
                  void updatePreferences({ goldAccent: value })
                }
                trackColor={{ false: '#364153', true: GOLD }}
                thumbColor={WHITE}
                accessibilityLabel="Use gold accent colour"
              />
            </View>
          </GlassPanel>

          <GlassPanel>
            <Text style={styles.sectionTitle}>Pattern appearance</Text>

            <Text style={styles.body}>
              Choose the symbols for the planned pattern-lock interface.
              These settings only customise its appearance; pattern
              authentication is not implemented by this screen.
            </Text>

            <ChoiceRow
              values={[
                { label: 'Dots', value: 'dots' },
                { label: 'Stars', value: 'stars' },
                { label: 'Diamonds', value: 'diamonds' },
                { label: 'Circles', value: 'circles' },
              ]}
              selected={preferences.patternSymbol}
              onSelect={(value) =>
                void updatePreferences({
                  patternSymbol: value as LockPreferences['patternSymbol'],
                })
              }
              accent={accent}
            />

            <Text style={[styles.patternPreview, { color: accent }]}>
              {preferences.patternSymbol === 'stars'
                ? '★     ★     ★\n★     ★     ★\n★     ★     ★'
                : preferences.patternSymbol === 'diamonds'
                  ? '◆     ◆     ◆\n◆     ◆     ◆\n◆     ◆     ◆'
                  : preferences.patternSymbol === 'circles'
                    ? '○     ○     ○\n○     ○     ○\n○     ○     ○'
                    : '●     ●     ●\n●     ●     ●\n●     ●     ●'}
            </Text>
          </GlassPanel>

          <GlassPanel>
            <Text style={styles.sectionTitle}>More security methods</Text>

            <FeatureStatus
              title="Voice lock and voice unlock"
              detail="Not connected yet. Requires a real speech-recognition integration. Voice alone will not authorise access to protected files."
              accent={accent}
            />

            <FeatureStatus
              title="NFC security key"
              detail="Not connected yet. Requires native NFC support and secure tag authentication. PIN fallback must remain available."
              accent={accent}
            />

            <FeatureStatus
              title="Separate Private Vault PIN"
              detail="Requires vault verification and protected file-storage integration before it can safely unlock private content."
              accent={accent}
            />

            <FeatureStatus
              title="Pattern authentication"
              detail="Appearance preferences are saved, but a real pattern verification service still needs to be implemented."
              accent={accent}
            />
          </GlassPanel>

          {loading && (
            <ActivityIndicator color={accent} style={styles.loader} />
          )}

          <Text style={styles.footer}>
            BRITUME SECURITY • Privacy by design
          </Text>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

function GlassPanel({ children }: { children: React.ReactNode }) {
  return <View style={styles.panel}>{children}</View>;
}

function PinField({
  label,
  value,
  onChangeText,
  accent,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  accent: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 8))}
        placeholder="4–8 digits"
        placeholderTextColor={MUTED}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        autoComplete="off"
        autoCorrect={false}
        style={[styles.input, { borderColor: BORDER }]}
        accessibilityLabel={label}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
  secondary,
  accent = GOLD,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  accent?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary
          ? { backgroundColor: 'rgba(16, 23, 34, 0.72)', borderColor: BORDER }
          : { backgroundColor: accent, borderColor: accent },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          { color: secondary ? WHITE : BACKGROUND },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ChoiceRow({
  values,
  selected,
  onSelect,
  accent,
}: {
  values: { label: string; value: string }[];
  selected: string;
  onSelect: (value: string) => void;
  accent: string;
}) {
  return (
    <View style={styles.choiceRow}>
      {values.map((item) => {
        const active = selected === item.value;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(item.value)}
            style={[
              styles.choice,
              {
                borderColor: active ? accent : BORDER,
                backgroundColor: active
                  ? 'rgba(217,184,103,0.14)'
                  : 'rgba(8,13,22,0.52)',
              },
            ]}
          >
            <Text
              style={[
                styles.choiceText,
                { color: active ? accent : WHITE },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FeatureStatus({
  title,
  detail,
  accent,
}: {
  title: string;
  detail: string;
  accent: string;
}) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureHeading}>
        <View style={[styles.statusDot, { backgroundColor: accent }]} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Text style={styles.caption}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },
  wallpaperImage: {
    opacity: 0.88,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 9, 16, 0.76)',
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  verifyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
    paddingBottom: 40,
  },
  manageContent: {
    padding: 18,
    paddingBottom: 44,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 9,
  },
  title: {
    color: WHITE,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    marginBottom: 9,
  },
  body: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 15,
  },
  panel: {
    backgroundColor: PANEL,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    marginBottom: 15,
    overflow: 'hidden',
  },
  sectionTitle: {
    color: WHITE,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
  },
  field: {
    marginBottom: 12,
  },
  fieldLabel: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 7,
  },
  input: {
    backgroundColor: 'rgba(5, 9, 16, 0.65)',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: WHITE,
    fontSize: 17,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 9,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    color: WHITE,
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 19,
  },
  caption: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 10,
  },
  choice: {
    minHeight: 39,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  choiceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  patternPreview: {
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 44,
    marginTop: 8,
  },
  feature: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 12,
    marginTop: 12,
  },
  featureHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    marginVertical: 24,
  },
  pinDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  key: {
    width: '27%',
    maxWidth: 92,
    minWidth: 65,
    height: 59,
    borderRadius: 19,
    borderWidth: 1,
    backgroundColor: 'rgba(27, 38, 55, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundKey: {
    borderRadius: 40,
  },
  squareKey: {
    borderRadius: 7,
  },
  keyText: {
    fontSize: 22,
    fontWeight: '800',
  },
  loader: {
    marginVertical: 12,
  },
  footer: {
    color: MUTED,
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 1.3,
    marginTop: 8,
  },
});
