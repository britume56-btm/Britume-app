
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

type Props = {
  onComplete: () => void;
};

export default function PasswordRecoveryScreen({ onComplete }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert(
        'Password too short',
        'Use at least 8 characters for your new password.'
      );
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      Alert.alert(
        'Stronger password needed',
        'Include at least one letter and one number.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        'Passwords do not match',
        'Enter the same password in both fields.'
      );
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error(
          'No authenticated recovery session was found. Open the latest recovery email and try again.'
        );
      }

      setNewPassword('');
      setConfirmPassword('');

      Alert.alert(
        'Password updated',
        'Your BRITUME password has been changed successfully. Please sign in again with your new password.',
        [
          {
            text: 'Continue to sign in',
            onPress: async () => {
              try {
                await supabase.auth.signOut();
              } finally {
                onComplete();
              }
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: unknown) {
      Alert.alert(
        'Password reset failed',
        error instanceof Error
          ? error.message
          : 'Please reopen your recovery email and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.glow} />

        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>B</Text>
        </View>

        <Text style={styles.brand}>BRITUME</Text>
        <Text style={styles.tagline}>SEE BEYOND. MOVE FORWARD.</Text>

        <View style={styles.glassCard}>
          <View style={styles.topLine} />

          <View style={styles.iconCircle}>
            <Text style={styles.keyIcon}>✦</Text>
          </View>

          <Text style={styles.heading}>Create a new password</Text>

          <Text style={styles.description}>
            Secure your BRITUME account with a new password.
            Your new password must contain at least 8 characters,
            including a letter and a number.
          </Text>

          <Text style={styles.label}>NEW PASSWORD</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              placeholderTextColor="#88858C"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              selectionColor="#E6C66D"
              textContentType="newPassword"
              accessibilityLabel="New password"
            />

            <Pressable
              onPress={() => setShowPassword((value) => !value)}
              disabled={loading}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? 'Hide password' : 'Show password'
              }
            >
              <Text style={styles.eyeText}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </Text>
            </Pressable>
          </View>

          <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>

          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter password again"
              placeholderTextColor="#88858C"
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              selectionColor="#E6C66D"
              textContentType="newPassword"
              accessibilityLabel="Confirm new password"
              onSubmitEditing={handleResetPassword}
              returnKeyType="done"
            />

            <Pressable
              onPress={() => setShowConfirm((value) => !value)}
              disabled={loading}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={
                showConfirm
                  ? 'Hide confirmation password'
                  : 'Show confirmation password'
              }
            >
              <Text style={styles.eyeText}>
                {showConfirm ? 'HIDE' : 'SHOW'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>◆</Text>
            <Text style={styles.securityText}>
              Your password is updated securely through Supabase
              Authentication.
            </Text>
          </View>

          <Pressable
            onPress={handleResetPassword}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && !loading && styles.pressedButton,
              loading && styles.disabledButton,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#100D05" />
            ) : (
              <Text style={styles.primaryButtonText}>
                RESET PASSWORD
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={onComplete}
            disabled={loading}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              Return to BRITUME
            </Text>
          </Pressable>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerDot} />
          <Text style={styles.footer}>
            BRITUME ACCOUNT SECURITY
          </Text>
          <View style={styles.footerDot} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const GOLD = '#E6C66D';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#050608',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 36,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(214, 171, 63, 0.07)',
  },
  logoCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1.5,
    borderColor: 'rgba(230, 198, 109, 0.85)',
    backgroundColor: 'rgba(230, 198, 109, 0.08)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: GOLD,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  logoLetter: {
    color: GOLD,
    fontSize: 39,
    fontWeight: '900',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 5,
    textAlign: 'center',
  },
  tagline: {
    color: GOLD,
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 30,
  },
  glassCard: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 22,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(230, 198, 109, 0.30)',
    backgroundColor: 'rgba(24, 24, 28, 0.88)',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 9,
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(230, 198, 109, 0.35)',
    backgroundColor: 'rgba(230, 198, 109, 0.09)',
    marginBottom: 18,
  },
  keyIcon: {
    color: GOLD,
    fontSize: 26,
    fontWeight: '700',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
  },
  description: {
    color: '#B9B9C0',
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 25,
  },
  label: {
    color: GOLD,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 9,
  },
  inputWrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    marginBottom: 20,
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 12,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  eyeText: {
    color: GOLD,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(230, 198, 109, 0.14)',
    backgroundColor: 'rgba(230, 198, 109, 0.045)',
    marginTop: 1,
    marginBottom: 20,
  },
  securityIcon: {
    color: GOLD,
    fontSize: 11,
    marginRight: 9,
    marginTop: 2,
  },
  securityText: {
    flex: 1,
    color: '#BDBDC4',
    fontSize: 11,
    lineHeight: 17,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    paddingHorizontal: 16,
    marginTop: 2,
  },
  primaryButtonText: {
    color: '#100D05',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  pressedButton: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabledButton: {
    opacity: 0.65,
  },
  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
  },
  backButtonText: {
    color: '#D0C6A8',
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    gap: 10,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: GOLD,
  },
  footer: {
    color: '#777780',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
