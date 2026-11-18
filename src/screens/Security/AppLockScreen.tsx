import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppLock } from '../../security/AppLockContext';
import { authenticateWithBiometrics, deletePinSecurely, getBiometricStatus, savePinSecurely, verifyPinSecurely } from '../../services/securityService';

type Props = { mode?: 'manage' | 'verify'; onUnlock?: () => void };
export default function AppLockScreen({ mode = 'manage', onUnlock }: Props) {
  const { userId, hasPin, enableLock, disableLock } = useAppLock();
  const [pin, setPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [biometrics, setBiometrics] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (mode === 'verify') {
      if (!/^\d{4,8}$/.test(pin)) return Alert.alert('PIN required', 'Enter your 4–8 digit PIN.');
      setBusy(true);
      try {
        if (await verifyPinSecurely(pin, userId)) onUnlock?.();
        else { setPin(''); Alert.alert('Incorrect PIN', 'Please try again.'); }
      } finally { setBusy(false); }
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) return Alert.alert('Invalid PIN', 'Choose 4–8 digits.');
    if (pin !== confirmation) return Alert.alert('PINs do not match', 'Confirm your new PIN.');
    setBusy(true);
    try {
      if (hasPin && !(await verifyPinSecurely(currentPin, userId))) {
        Alert.alert('Incorrect current PIN', 'Your PIN was not changed.'); return;
      }
      if (!(await savePinSecurely(pin, userId))) throw new Error('Secure storage was unavailable.');
      enableLock(); setPin(''); setConfirmation(''); setCurrentPin('');
      Alert.alert('App lock enabled', 'Your PIN has been saved securely on this device.');
    } catch (error) {
      Alert.alert('Could not save PIN', error instanceof Error ? error.message : 'Please try again.');
    } finally { setBusy(false); }
  };

  const unlockWithBiometrics = async () => {
    setBusy(true);
    try {
      const status = await getBiometricStatus();
      if (status !== 'available') return Alert.alert('Biometrics unavailable', 'Use your PIN to unlock.');
      if (await authenticateWithBiometrics()) onUnlock?.();
    } finally { setBusy(false); }
  };

  const disable = async () => {
    if (!(await verifyPinSecurely(currentPin, userId))) return Alert.alert('Incorrect PIN', 'Your lock remains enabled.');
    if (await deletePinSecurely(userId)) { disableLock(); setCurrentPin(''); }
    else Alert.alert('Could not disable lock', 'Please try again.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.kicker}>BRITUME • SECURITY</Text>
      <Text style={styles.title}>{mode === 'verify' ? 'Unlock BRITUME' : 'App lock'}</Text>
      <Text style={styles.body}>{mode === 'verify' ? 'Enter your PIN to continue.' : 'Protect BRITUME when you return to the app.'}</Text>
      {mode === 'manage' && hasPin && <Field label="Current PIN" value={currentPin} onChangeText={setCurrentPin} />}
      <Field label={mode === 'verify' ? 'PIN' : 'New PIN'} value={pin} onChangeText={setPin} />
      {mode === 'manage' && <Field label="Confirm new PIN" value={confirmation} onChangeText={setConfirmation} />}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void submit()} style={styles.button}>
        {busy ? <ActivityIndicator color="#071018" /> : <Text style={styles.buttonText}>{mode === 'verify' ? 'UNLOCK' : hasPin ? 'CHANGE PIN' : 'ENABLE APP LOCK'}</Text>}
      </Pressable>
      {mode === 'verify' && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void unlockWithBiometrics()} style={styles.secondary}><Text style={styles.secondaryText}>Use device biometrics</Text></Pressable>}
      {mode === 'manage' && hasPin && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void disable()} style={styles.secondary}><Text style={styles.secondaryText}>Disable app lock</Text></Pressable>}
      <Text style={styles.note}>PINs are stored with the operating system’s secure storage. Biometric data is never accessed by BRITUME.</Text>
    </ScrollView>
  );
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 8))} keyboardType="number-pad" secureTextEntry maxLength={8} placeholder="4–8 digits" placeholderTextColor="#AAB5C5" style={styles.input} accessibilityLabel={label} /></View>;
}
const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#070B12' },
  kicker: { color: '#D9B867', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  title: { color: '#F4F6FA', fontSize: 28, fontWeight: '900' }, body: { color: '#AAB5C5', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 22 },
  field: { marginBottom: 14 }, label: { color: '#F4F6FA', fontWeight: '700', marginBottom: 7 },
  input: { color: '#F4F6FA', backgroundColor: '#101722', borderColor: '#263247', borderWidth: 1, borderRadius: 13, padding: 14, fontSize: 18 },
  button: { minHeight: 48, borderRadius: 14, backgroundColor: '#D9B867', alignItems: 'center', justifyContent: 'center', marginTop: 8 }, buttonText: { color: '#071018', fontWeight: '900' },
  secondary: { minHeight: 46, borderRadius: 14, borderColor: '#263247', borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 }, secondaryText: { color: '#F4F6FA', fontWeight: '700' },
  note: { color: '#AAB5C5', fontSize: 11, lineHeight: 17, marginTop: 20 },
});
