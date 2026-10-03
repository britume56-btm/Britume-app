import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

export type BiometricAvailability =
  | 'available'
  | 'unavailable'
  | 'not-enrolled'
  | 'unknown';

export async function getBiometricStatus(): Promise<BiometricAvailability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return 'unavailable';
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return 'not-enrolled';
    }

    return 'available';
  } catch (error) {
    console.error('Biometric check failed:', error);
    return 'unknown';
  }
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access BRITUME',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.error('Biometric auth failed:', error);
    return false;
  }
}

export async function savePinSecurely(pin: string, userId: string): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(`britume-pin-${userId}`, pin);
    return true;
  } catch (error) {
    console.error('PIN save failed:', error);
    return false;
  }
}

export async function verifyPinSecurely(pin: string, userId: string): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(`britume-pin-${userId}`);
    return stored === pin;
  } catch (error) {
    console.error('PIN verify failed:', error);
    return false;
  }
}

export function showSecurityAlert(message: string) {
  Alert.alert('Security', message);
}
