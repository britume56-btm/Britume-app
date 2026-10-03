import React, { useState } from 'react';
import {
  Alert,
  Button,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  authenticateWithBiometrics,
  getBiometricStatus,
} from '../../services/securityService';

export default function AppLockScreen() {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const checkBiometric = async () => {
    const status = await getBiometricStatus();
    if (status === 'available') {
      const success = await authenticateWithBiometrics();
      if (success) {
        Alert.alert('Secure access', 'Biometric authentication succeeded.');
      } else {
        Alert.alert('Authentication failed', 'Please try again.');
      }
    } else {
      Alert.alert('Biometrics unavailable', 'This device does not support or has no enrolled biometrics.');
    }
  };

  const handlePinSubmit = () => {
    if (pin.length < 4) {
      Alert.alert('PIN too short', 'Use at least 4 digits.');
      return;
    }

    Alert.alert('PIN accepted', 'PIN-based app lock is active.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>BRITUME • SECURITY</Text>
      <Text style={styles.title}>App lock</Text>

      <TextInput
        value={pin}
        onChangeText={setPin}
        placeholder="Enter 4-digit PIN"
        keyboardType="number-pad"
        secureTextEntry
        style={styles.input}
      />

      <Button
        title={loading ? 'Checking...' : 'Activate PIN lock'}
        onPress={handlePinSubmit}
      />

      <Pressable onPress={checkBiometric} style={styles.biometricButton}>
        <Text style={styles.biometricText}>Use device biometric lock</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b12',
    padding: 20,
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
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#090d15',
    borderColor: '#2c3a4d',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f4f6fa',
    marginBottom: 12,
  },
  biometricButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#101722',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#263247',
    alignItems: 'center',
  },
  biometricText: {
    color: '#f4f6fa',
    fontWeight: '700',
  },
});
