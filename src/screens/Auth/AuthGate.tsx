
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
} from 'react-native';
import { supabase } from '../../../lib/supabase';

type Mode = 'welcome' | 'signup' | 'signin' | 'recover';

const GOLD = '#D4AF37';
const BLACK = '#000000';
const SURFACE = '#080808';
const BORDER = '#292929';
const WHITE = '#FFFFFF';
const MUTED = '#AAAAAA';

export default function AuthGate() {
  const [mode, setMode] = useState<Mode>('welcome');

  if (mode === 'signup') {
    return <AccountScreen onBack={() => setMode('welcome')} />;
  }

  if (mode === 'signin') {
    return (
      <SignInScreen
        onBack={() => setMode('welcome')}
        onForgotPassword={() => setMode('recover')}
      />
    );
  }

  if (mode === 'recover') {
    return <RecoveryScreen onBack={() => setMode('signin')} />;
  }

  return (
    <Screen>
      <View style={styles.brandWrap}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>B</Text>
        </View>
        <Text style={styles.brand}>BRITUME</Text>
        <Text style={styles.tagline}>SEE BEYOND. MOVE FORWARD.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Welcome to BRITUME</Text>
        <Text style={styles.body}>
          Connect with your world. Discover more. Move forward.
        </Text>
        <Button label="LOG IN" onPress={() => setMode('signin')} />
        <Button
          label="CREATE NEW ACCOUNT"
          onPress={() => setMode('signup')}
          secondary
        />
      </View>

      <Text style={styles.footer}>YOUR WORLD. YOUR FUTURE.</Text>
    </Screen>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AccountScreen({ onBack }: { onBack: () => void }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    const value = identifier.trim();
    const isEmail = value.includes('@');
    const email = value.toLowerCase();

    if (!value) {
      Alert.alert('Required', 'Enter your email address or phone number.');
      return;
    }

    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert('Invalid email', 'Enter a valid email address.');
      return;
    }

    if (!isEmail && !/^\+[1-9]\d{7,14}$/.test(value.replace(/[\s()-]/g, ''))) {
      Alert.alert(
        'Phone number format',
        'Use international format, including your country code, e.g. +267XXXXXXXX.'
      );
      return;
    }

    const phone = value.replace(/[\s()-]/g, '');

    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Enter the same password twice.');
      return;
    }

    setLoading(true);

    try {
      const result = isEmail
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: 'britume://auth/callback',
            },
          })
        : await supabase.auth.signUp({
            phone,
            password,
          });

      if (result.error) {
        Alert.alert('Registration failed', result.error.message);
        return;
      }

      if (result.data.session) {
        Alert.alert('Welcome to BRITUME', 'Your account is ready.');
        return;
      }

      Alert.alert(
        'Verify your account',
        isEmail
          ? 'Check your email for the verification link before logging in.'
          : 'Check your SMS for the verification code. Complete phone verification before logging in.'
      );
    } catch {
      Alert.alert('Connection error', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header />
      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.body}>
          Join BRITUME using your email address or phone number.
        </Text>

        <Field
          label="Email address or phone number"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Email or +267XXXXXXXX"
          keyboardType="default"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="At least 8 characters"
          secure
        />
        <Field
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          placeholder="Enter password again"
          secure
        />

        <Button
          label={loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
          onPress={() => void createAccount()}
          disabled={loading}
        />
        <Button label="BACK" onPress={onBack} secondary />
      </View>
    </Screen>
  );
}

function SignInScreen({
  onBack,
  onForgotPassword,
}: {
  onBack: () => void;
  onForgotPassword: () => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    const value = identifier.trim();
    const isEmail = value.includes('@');

    if (!value || !password) {
      Alert.alert('Missing details', 'Enter your email or phone number and password.');
      return;
    }

    if (!isEmail && !/^\+[1-9]\d{7,14}$/.test(value.replace(/[\s()-]/g, ''))) {
      Alert.alert(
        'Check your phone number',
        'Include your international country code, e.g. +267XXXXXXXX.'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await supabase.auth.signInWithPassword(
        isEmail
          ? { email: value.toLowerCase(), password }
          : { phone: value.replace(/[\s()-]/g, ''), password }
      );

      if (result.error) {
        Alert.alert('Login failed', result.error.message);
      }
    } catch {
      Alert.alert('Connection error', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header />
      <View style={styles.card}>
        <Text style={styles.title}>Log in to BRITUME</Text>
        <Text style={styles.body}>Welcome back. Your world awaits.</Text>

        <Field
          label="Email address or phone number"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="Email or +267XXXXXXXX"
          keyboardType="default"
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secure
        />

        <Pressable
          accessibilityRole="button"
          onPress={onForgotPassword}
          style={styles.forgot}
        >
          <Text style={styles.goldText}>Forgot password?</Text>
        </Pressable>

        <Button
          label={loading ? 'LOGGING IN…' : 'LOG IN'}
          onPress={() => void signIn()}
          disabled={loading}
        />
        <Button label="BACK" onPress={onBack} secondary />
      </View>
    </Screen>
  );
}

function RecoveryScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendResetLink() {
    const value = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      Alert.alert('Email required', 'Enter the email address linked to your account.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(value, {
        redirectTo: 'britume://auth/callback?type=recovery',
      });

      if (error) {
        Alert.alert('Could not send reset link', error.message);
        return;
      }

      Alert.alert(
        'Check your email',
        'If an account exists for that address, password reset instructions will be sent.'
      );
    } catch {
      Alert.alert('Connection error', 'Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header />
      <View style={styles.card}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.body}>
          We will send password recovery instructions to your email.
        </Text>
        <Field
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <Button
          label={loading ? 'SENDING…' : 'SEND RESET LINK'}
          onPress={() => void sendResetLink()}
          disabled={loading}
        />
        <Button label="BACK TO LOGIN" onPress={onBack} secondary />
      </View>
    </Screen>
  );
}

function Header() {
  return (
    <View style={styles.smallBrand}>
      <View style={styles.smallLogo}>
        <Text style={styles.smallLogoText}>B</Text>
      </View>
      <Text style={styles.brand}>BRITUME</Text>
      <Text style={styles.tagline}>SEE BEYOND. MOVE FORWARD.</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secure = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secure?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#777777"
        keyboardType={keyboardType}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor={GOLD}
        style={styles.input}
      />
    </View>
  );
}

function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BLACK,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 32,
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 46,
    fontWeight: '900',
    color: GOLD,
  },
  brand: {
    color: WHITE,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: 5,
    textAlign: 'center',
  },
  tagline: {
    marginTop: 8,
    color: GOLD,
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  smallBrand: {
    alignItems: 'center',
    marginBottom: 24,
  },
  smallLogo: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  smallLogoText: {
    fontSize: 32,
    fontWeight: '900',
    color: GOLD,
  },
  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    color: WHITE,
    fontSize: 25,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  field: {
    marginBottom: 15,
  },
  label: {
    color: WHITE,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: BLACK,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: WHITE,
    fontSize: 15,
  },
  button: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonSecondary: {
    backgroundColor: BLACK,
    borderColor: BORDER,
    borderWidth: 1,
  },
  buttonText: {
    color: BLACK,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  secondaryText: {
    color: WHITE,
  },
  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
  },
  goldText: {
    color: GOLD,
    fontSize: 14,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
  footer: {
    color: '#666666',
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 24,
  },
});
