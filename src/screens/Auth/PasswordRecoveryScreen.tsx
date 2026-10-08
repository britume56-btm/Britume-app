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
import { supabase } from '../../../lib/supabase';

export default function PasswordRecoveryScreen({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);

  async function savePassword() {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      Alert.alert('Passwords do not match', 'Enter the same password twice.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      Alert.alert('Could not update password', error.message);
      return;
    }
    onComplete();
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.kicker}>BRITUME • ACCOUNT RECOVERY</Text>
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.body}>
            Your recovery link is active. Set a new password to return to your account.
          </Text>
          <Text style={styles.label}>New password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor="#7d8797"
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
          />
          <Text style={styles.label}>Confirm new password</Text>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            placeholder="Enter it again"
            placeholderTextColor="#7d8797"
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void savePassword()}
            style={[styles.button, saving && styles.disabled]}
          >
            <Text style={styles.buttonText}>
              {saving ? 'SAVING…' : 'SAVE NEW PASSWORD'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#070b12', flex: 1 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#101722',
    borderColor: '#263247',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  kicker: {
    color: '#d9b867',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 9,
  },
  title: { color: '#f4f6fa', fontSize: 25, fontWeight: '800' },
  body: { color: '#c5ccd7', fontSize: 14, lineHeight: 21, marginVertical: 12 },
  label: { color: '#dfe5ee', fontSize: 13, fontWeight: '700', marginBottom: 7, marginTop: 10 },
  input: {
    backgroundColor: '#090d15',
    borderColor: '#2c3a4d',
    borderRadius: 14,
    borderWidth: 1,
    color: '#f4f6fa',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#d9b867',
    borderRadius: 14,
    marginTop: 16,
    paddingVertical: 15,
  },
  buttonText: { color: '#090d15', fontWeight: '900', letterSpacing: 0.8 },
  disabled: { opacity: 0.5 },
});
