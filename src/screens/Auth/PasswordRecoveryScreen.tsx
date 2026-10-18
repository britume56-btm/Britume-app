
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

type AuthMode = 'welcome' | 'signup' | 'signin' | 'recover';

export default function AuthGate() {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const isPhone = (value: string) =>
    /^\+[1-9]\d{7,14}$/.test(value.trim());

  const validateIdentifier = () => {
    const value = identifier.trim();

    if (!value) {
      Alert.alert('Required', 'Enter your email address or phone number.');
      return false;
    }

    if (!isEmail(value) && !isPhone(value)) {
      Alert.alert(
        'Invalid details',
        'Enter a valid email address or an international phone number, such as +267XXXXXXXX.'
      );
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateIdentifier()) return;

    if (password.length < 6) {
      Alert.alert('Password required', 'Use at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password twice.');
      return;
    }

    setLoading(true);

    try {
      const value = identifier.trim();

      const result = isEmail(value)
        ? await supabase.auth.signUp({
            email: value.toLowerCase(),
            password,
            options: {
              emailRedirectTo: 'britume://auth/callback',
            },
          })
        : await supabase.auth.signUp({
            phone: value,
            password,
          });

      if (result.error) throw result.error;

      if (isEmail(value)) {
        Alert.alert(
          'Check your email',
          'If email confirmation is enabled, open the confirmation link to activate your BRITUME account.'
        );
      } else {
        Alert.alert(
          'Phone verification required',
          'Your phone account may require an SMS verification code. Complete verification before signing in.'
        );
      }

      setPassword('');
      setConfirmPassword('');
      setMode('signin');
    } catch (error: unknown) {
      Alert.alert(
        'Registration failed',
        error instanceof Error ? error.message : 'Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!validateIdentifier()) return;

    if (!password) {
      Alert.alert('Password required', 'Enter your password.');
      return;
    }

    setLoading(true);

    try {
      const value = identifier.trim();

      const result = isEmail(value)
        ? await supabase.auth.signInWithPassword({
            email: value.toLowerCase(),
            password,
          })
        : await supabase.auth.signInWithPassword({
            phone: value,
            password,
          });

      if (result.error) throw result.error;

      // The app's existing Supabase auth listener should handle
      // navigation after a successful sign-in.
    } catch (error: unknown) {
      Alert.alert(
        'Sign-in failed',
        error instanceof Error ? error.message : 'Check your details and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async () => {
    const email = identifier.trim().toLowerCase();

    if (!isEmail(email)) {
      Alert.alert(
        'Email required',
        'Enter the email address registered to your BRITUME account.'
      );
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'britume://auth/callback',
      });

      if (error) throw error;

      Alert.alert(
        'Check your email',
        'If an account matches that address, password-reset instructions will be sent. Check your inbox and spam folder.'
      );
    } catch (error: unknown) {
      Alert.alert(
        'Recovery failed',
        error instanceof Error ? error.message : 'Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (nextMode: AuthMode) => {
    setPassword('');
    setConfirmPassword('');
    setMode(nextMode);
  };

  const Field = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry = false,
    keyboardType = 'default' as 'default' | 'email-address' | 'phone-pad',
    autoCapitalize = 'none' as 'none' | 'sentences' | 'words' | 'characters',
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#777777"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={!loading}
        selectionColor="#D4AF37"
        style={styles.input}
      />
    </View>
  );

  const Button = ({
    title,
    onPress,
    secondary = false,
  }: {
    title: string;
    onPress: () => void;
    secondary?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={[styles.button, secondary && styles.secondaryButton]}
    >
      {loading && !secondary ? (
        <ActivityIndicator color="#000000" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            secondary && styles.secondaryButtonText,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>B</Text>
        </View>

        <Text style={styles.brand}>BRITUME</Text>
        <Text style={styles.tagline}>SEE BEYOND. MOVE FORWARD.</Text>

        {mode === 'welcome' && (
          <View style={styles.panel}>
            <Text style={styles.heading}>Welcome to BRITUME</Text>
            <Text style={styles.description}>
              Your account. Your community. Your future.
            </Text>
            <Button title="Create account" onPress={() => changeMode('signup')} />
            <Button
              title="Sign in"
              secondary
              onPress={() => changeMode('signin')}
            />
          </View>
        )}

        {mode === 'signup' && (
          <View style={styles.panel}>
            <Text style={styles.heading}>Create your account</Text>
            <Text style={styles.description}>
              Register using an email address or an international phone number.
            </Text>

            <Field
              label="Email or phone number"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Email or +267XXXXXXXX"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
            />
            <Field
              label="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Enter password again"
              secureTextEntry
            />

            <Button title="Create account" onPress={handleSignUp} />
            <Button
              title="Already have an account? Sign in"
              secondary
              onPress={() => changeMode('signin')}
            />
          </View>
        )}

        {mode === 'signin' && (
          <View style={styles.panel}>
            <Text style={styles.heading}>Sign in</Text>
            <Text style={styles.description}>
              Continue with your registered email or phone number.
            </Text>

            <Field
              label="Email or phone number"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Email or +267XXXXXXXX"
            />
            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              secureTextEntry
            />

            <Pressable
              onPress={() => changeMode('recover')}
              style={styles.forgotButton}
            >
              <Text style={styles.goldLink}>Forgot password?</Text>
            </Pressable>

            <Button title="Sign in" onPress={handleSignIn} />
            <Button
              title="Create a new account"
              secondary
              onPress={() => changeMode('signup')}
            />
          </View>
        )}

        {mode === 'recover' && (
          <View style={styles.panel}>
            <Text style={styles.heading}>Password recovery</Text>
            <Text style={styles.description}>
              Enter the email address linked to your account. We will request a
              password-reset email from Supabase.
            </Text>

            <Field
              label="Registered email address"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="you@example.com"
              keyboardType="email-address"
            />

            <Button
              title="Send recovery email"
              onPress={handleRecovery}
            />
            <Button
              title="Back to sign in"
              secondary
              onPress={() => changeMode('signin')}
            />
          </View>
        )}

        <Text style={styles.footer}>
          BRITUME © 2026. Built to move forward.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#D4AF37',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoLetter: {
    color: '#D4AF37',
    fontSize: 42,
    fontWeight: '900',
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 5,
    textAlign: 'center',
  },
  tagline: {
    color: '#D4AF37',
    fontSize: 10,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  panel: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  heading: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 10,
  },
  description: {
    color: '#AAAAAA',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  field: {
    marginBottom: 17,
  },
  label: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    minHeight: 52,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#383020',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: '#FFFFFF',
    fontSize: 15,
  },
  button: {
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },
  buttonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  secondaryButtonText: {
    color: '#D4AF37',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
  },
  goldLink: {
    color: '#D4AF37',
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    color: '#666666',
    textAlign: 'center',
    fontSize: 11,
    marginTop: 38,
  },
});
