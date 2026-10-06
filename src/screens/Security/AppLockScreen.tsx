import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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

export default function AppLockScreen({
  mode = 'manage',
  onUnlock,
}: AppLockScreenProps) {
  const { userId, hasPin, enableLock, disableLock } = useAppLock();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [manageAction, setManageAction] = useState<ManageAction>('idle');
  const [loading, setLoading] = useState(false);

  const handlePinSubmit = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      Alert.alert('PIN required', 'Enter the 4–8 digit PIN saved for this account.');
      return;
    }

    setLoading(true);
    const verified = await verifyPinSecurely(pin, userId);
    setLoading(false);

    if (!verified) {
      setPin('');
      Alert.alert('Incorrect PIN', 'That PIN did not match. Try again.');
      return;
    }

    onUnlock?.();
  };

  const handleBiometric = async () => {
    const status = await getBiometricStatus();
    if (status !== 'available') {
      Alert.alert(
        'Biometrics unavailable',
        status === 'not-enrolled'
          ? 'Enroll Face ID or a fingerprint in your device settings, or enter your BRITUME PIN.'
          : 'This device cannot use biometrics right now. Enter your BRITUME PIN instead.'
      );
      return;
    }

    setLoading(true);
    const authenticated = await authenticateWithBiometrics();
    setLoading(false);

    if (authenticated) {
      onUnlock?.();
    } else {
      Alert.alert('Authentication failed', 'Use your BRITUME PIN or try biometrics again.');
    }
  };

  const handleSavePin = async () => {
    if (!/^\d{4,8}$/.test(pin)) {
      Alert.alert('Invalid PIN', 'Choose a PIN containing 4–8 digits.');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('PINs do not match', 'Enter the same PIN in both fields.');
      return;
    }

    setLoading(true);
    if (hasPin) {
      const currentPinIsValid = await verifyPinSecurely(currentPin, userId);
      if (!currentPinIsValid) {
        setLoading(false);
        Alert.alert('Incorrect current PIN', 'Enter your existing PIN to change it.');
        return;
      }
    }

    const saved = await savePinSecurely(pin, userId);
    setLoading(false);
    if (!saved) {
      Alert.alert('Could not save PIN', 'Secure storage was unavailable. Please try again.');
      return;
    }

    enableLock();
    setPin('');
    setConfirmPin('');
    setCurrentPin('');
    setManageAction('idle');
    Alert.alert('App lock enabled', 'BRITUME will ask for your PIN or device biometrics when reopened.');
  };

  const handleDisablePin = async () => {
    if (!/^\d{4,8}$/.test(currentPin)) {
      Alert.alert('Current PIN required', 'Enter your current PIN to disable app lock.');
      return;
    }

    setLoading(true);
    const verified = await verifyPinSecurely(currentPin, userId);
    if (!verified) {
      setLoading(false);
      setCurrentPin('');
      Alert.alert('Incorrect PIN', 'The app lock was not changed.');
      return;
    }

    const removed = await deletePinSecurely(userId);
    setLoading(false);
    if (!removed) {
      Alert.alert('Could not disable lock', 'Secure storage was unavailable. Please try again.');
      return;
    }

    disableLock();
    setCurrentPin('');
    setManageAction('idle');
    Alert.alert('App lock disabled', 'BRITUME will no longer require a PIN when reopened.');
  };

  if (mode === 'verify') {
    return (
      <View style={styles.container}>
        <Text style={styles.kicker}>BRITUME • SECURITY</Text>
        <Text style={styles.title}>Unlock BRITUME</Text>
        <Text style={styles.body}>Verify it’s you to continue.</Text>

        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="Enter your 4–8 digit PIN"
          placeholderTextColor="#7d8797"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={8}
          autoComplete="off"
          style={styles.input}
          accessibilityLabel="BRITUME PIN"
        />

        <ActionButton
          label={loading ? 'CHECKING…' : 'UNLOCK WITH PIN'}
          onPress={handlePinSubmit}
          disabled={loading}
        />
        <Pressable
          accessibilityRole="button"
          onPress={handleBiometric}
          disabled={loading}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Use device biometrics</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.manageContainer} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>BRITUME • SECURITY</Text>
      <Text style={styles.title}>App lock</Text>
      <Text style={styles.body}>
        {hasPin
          ? 'Your PIN is stored on this device. BRITUME locks again after it is backgrounded.'
          : 'Set a PIN to require verification when BRITUME is reopened.'}
      </Text>

      {hasPin && manageAction === 'idle' ? (
        <View style={styles.actions}>
          <ActionButton label="CHANGE PIN" onPress={() => setManageAction('change')} />
          <Pressable
            accessibilityRole="button"
            onPress={() => setManageAction('disable')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Disable app lock</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          {hasPin && (
            <PinField
              label="Current PIN"
              value={currentPin}
              onChangeText={setCurrentPin}
              placeholder="Enter current PIN"
            />
          )}
          {manageAction !== 'disable' && (
            <>
              <PinField
                label={hasPin ? 'New PIN' : 'New PIN'}
                value={pin}
                onChangeText={setPin}
                placeholder="Choose 4–8 digits"
              />
              <PinField
                label="Confirm new PIN"
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Enter the PIN again"
              />
              <ActionButton
                label={loading ? 'SAVING…' : hasPin ? 'SAVE NEW PIN' : 'ENABLE PIN LOCK'}
                onPress={handleSavePin}
                disabled={loading}
              />
            </>
          )}
          {manageAction === 'disable' && (
            <ActionButton
              label={loading ? 'DISABLING…' : 'DISABLE APP LOCK'}
              onPress={handleDisablePin}
              disabled={loading}
            />
          )}
          {hasPin && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setManageAction('idle');
                setCurrentPin('');
                setPin('');
                setConfirmPin('');
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function PinField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7d8797"
        keyboardType="number-pad"
        secureTextEntry
        maxLength={8}
        autoComplete="off"
        style={styles.input}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b12',
    padding: 20,
    justifyContent: 'center',
  },
  manageContainer: {
    flexGrow: 1,
    backgroundColor: '#070b12',
    padding: 20,
    paddingBottom: 40,
  },
  actions: {
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
    marginBottom: 8,
  },
  body: {
    color: '#c5ccd7',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  field: {
    marginBottom: 4,
  },
  fieldLabel: {
    color: '#dfe5ee',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#090d15',
    borderColor: '#2c3a4d',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f4f6fa',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#d9b867',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#090d15',
    fontWeight: '900',
    letterSpacing: 1,
  },
  secondaryButton: {
    paddingVertical: 14,
    backgroundColor: '#101722',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#263247',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#f4f6fa',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
