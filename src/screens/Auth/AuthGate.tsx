import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

type Mode = 'welcome' | 'signup' | 'signin' | 'recover';

export default function AuthGate() {
  const [mode, setMode] = useState<Mode>('welcome');

  if (mode === 'welcome') {
    return (
      <WelcomeScreen
        onSignUp={() => setMode('signup')}
        onSignIn={() => setMode('signin')}
      />
    );
  }

  if (mode === 'signup') {
    return <SignUpScreen onBack={() => setMode('welcome')} />;
  }

  if (mode === 'recover') {
    return <PasswordResetRequestScreen onBack={() => setMode('signin')} />;
  }

  return (
    <SignInScreen
      onBack={() => setMode('welcome')}
      onForgotPassword={() => setMode('recover')}
    />
  );
}

function WelcomeScreen({
  onSignUp,
  onSignIn,
}: {
  onSignUp: () => void;
  onSignIn: () => void;
}) {
  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={styles.brand}>BRITUME</Text>
          <Text style={styles.tagline}>BRILLIANCE • VISION • MOVEMENT</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>The Vortex of Possibilities</Text>
          <Text style={styles.body}>
            One unified BRITUME ecosystem for living, creativity, connection,
            technology, and movement.
          </Text>

          <Button label="CREATE ACCOUNT" onPress={onSignUp} />
          <Button label="SIGN IN" onPress={onSignIn} secondary />
        </View>
      </ScrollView>
    </View>
  );
}

function SignUpScreen({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    const cleanEmail = email.trim().toLowerCase();

    if (!phone.trim()) {
      Alert.alert('Phone required', 'Enter your phone number.');
      return;
    }

    if (!cleanEmail.includes('@')) {
      Alert.alert('Email required', 'Enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }

    if (password !== confirm) {
      Alert.alert('Passwords do not match', 'Enter the same password twice.');
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: 'britume://auth/callback',
        data: {
          phone: phone.trim(),
        },
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Could not create account', error.message);
      return;
    }

    if (!data.session) {
      Alert.alert(
        'Verify your BRITUME account',
        'A verification email has been sent. Open it and verify your account before signing in.'
      );
      return;
    }

    Alert.alert('Account created', 'Your BRITUME account is now live.');
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Create your BRITUME account</Text>
          <Text style={styles.body}>
            Real Supabase authentication is active. Your phone number will be stored in your account foundation.
          </Text>

          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="+267 7XXXXXXX"
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@gmail.com"
            keyboardType="email-address"
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
            placeholder="Confirm password"
            secure
          />

          <Button
            label={loading ? 'CREATING…' : 'CREATE ACCOUNT'}
            onPress={handleSignUp}
            disabled={loading}
          />
          <Button label="BACK" onPress={onBack} secondary />
        </View>
      </ScrollView>
    </View>
  );
}

function SignInScreen({
  onBack,
  onForgotPassword,
}: {
  onBack: () => void;
  onForgotPassword: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Sign in failed', error.message);
      return;
    }
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@gmail.com"
            keyboardType="email-address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secure
          />

          <Button
            label={loading ? 'SIGNING IN…' : 'SIGN IN'}
            onPress={handleSignIn}
            disabled={loading}
          />
          <Button label="FORGOT PASSWORD?" onPress={onForgotPassword} secondary />
          <Button label="BACK" onPress={onBack} secondary />
        </View>
      </ScrollView>
    </View>
  );
}

function PasswordResetRequestScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendResetLink() {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      Alert.alert('Email required', 'Enter the email address for your BRITUME account.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: 'britume://auth/callback?type=recovery',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Could not send reset link', error.message);
      return;
    }

    Alert.alert(
      'Check your email',
      'If a BRITUME account uses that address, password reset instructions are on the way.'
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.body}>
            We’ll send a secure link to the email address on your BRITUME account.
          </Text>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@gmail.com"
            keyboardType="email-address"
          />
          <Button
            label={loading ? 'SENDING…' : 'SEND RESET LINK'}
            onPress={() => void sendResetLink()}
            disabled={loading}
          />
          <Button label="BACK TO SIGN IN" onPress={onBack} secondary />
        </View>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secure,
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
        placeholderTextColor="#7d8797"
        keyboardType={keyboardType}
        secureTextEntry={secure}
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

function Button({
  label,
  onPress,
  secondary,
  disabled,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        secondary && styles.buttonSecondary,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#070b12',
  },
  container: {
    padding: 20,
    paddingBottom: 48,
  },
  brandWrap: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 22,
  },
  logoCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: '#d9b867',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoText: {
    fontSize: 46,
    fontWeight: '900',
    color: '#d9b867',
  },
  brand: {
    color: '#f4f6fa',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 5,
  },
  tagline: {
    marginTop: 8,
    color: '#9ca8b8',
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#101722',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#263247',
  },
  title: {
    color: '#f4f6fa',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: '#c5ccd7',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: '#dfe5ee',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    backgroundColor: '#090d15',
    borderColor: '#2c3a4d',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#f4f6fa',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#d9b867',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderColor: '#384b61',
    borderWidth: 1,
  },
  buttonText: {
    color: '#090d15',
    fontWeight: '900',
    letterSpacing: 1,
  },
  buttonTextSecondary: {
    color: '#edf1f6',
  },
  disabled: {
    opacity: 0.5,
  },
});
