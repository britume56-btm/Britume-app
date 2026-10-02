import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

type Mode = 'welcome' | 'signup' | 'signin';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [mode, setMode] = useState<Mode>('welcome');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session);
        setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      }
    );

    const handleUrl = async (url: string) => {
      try {
        if (url.includes('code=')) {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) Alert.alert('Verification error', error.message);
        }
      } catch (error) {
        Alert.alert(
          'Verification error',
          error instanceof Error ? error.message : 'Unable to verify account.'
        );
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      subscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Starting BRITUME…</Text>
      </SafeAreaView>
    );
  }

  if (session) {
    return <Home email={session.user.email ?? ''} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Brand />
        {mode === 'welcome' && (
          <Welcome
            onSignUp={() => setMode('signup')}
            onSignIn={() => setMode('signin')}
          />
        )}
        {mode === 'signup' && <SignUp onBack={() => setMode('welcome')} />}
        {mode === 'signin' && <SignIn onBack={() => setMode('welcome')} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function Brand() {
  return (
    <View style={styles.brand}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoB}>B</Text>
      </View>
      <Text style={styles.brandName}>BRITUME</Text>
      <Text style={styles.tagline}>SEE BEYOND • MOVE FORWARD • CREATE GREATNESS</Text>
    </View>
  );
}

function Welcome({
  onSignUp,
  onSignIn,
}: {
  onSignUp: () => void;
  onSignIn: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>The Vortex of Possibilities</Text>
      <Text style={styles.body}>
        One universal BRITUME ecosystem for connection, creativity,
        entertainment, technology and movement.
      </Text>
      <Button label="CREATE ACCOUNT" onPress={onSignUp} />
      <Button label="SIGN IN" onPress={onSignIn} secondary />
    </View>
  );
}

function SignUp({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function createAccount() {
    const cleanEmail = email.trim().toLowerCase();

    if (!phone.trim()) return Alert.alert('Phone required', 'Enter your phone number.');
    if (!cleanEmail.includes('@')) return Alert.alert('Email required', 'Enter a valid email.');
    if (password.length < 8) {
      return Alert.alert('Password too short', 'Use at least 8 characters.');
    }
    if (password !== confirm) {
      return Alert.alert('Passwords do not match', 'Enter the same password twice.');
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
        'A real verification email has been sent. Open it and follow the verification link. BRITUME will then open and sign you in.'
      );
    } else {
      Alert.alert('Account created', 'Your BRITUME account is ready.');
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Create your BRITUME account</Text>
      <Text style={styles.muted}>
        Your phone is stored with your account profile. Email is used for real account verification.
      </Text>

      <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="+267 7XXXXXXX" keyboardType="phone-pad" />
      <Field label="Email / Gmail" value={email} onChangeText={setEmail} placeholder="you@gmail.com" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secure />
      <Field label="Confirm password" value={confirm} onChangeText={setConfirm} placeholder="Enter password again" secure />

      <Button label={loading ? 'CREATING…' : 'CREATE ACCOUNT'} onPress={createAccount} disabled={loading} />
      <Button label="BACK" onPress={onBack} secondary />
    </View>
  );
}

function SignIn({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);

    if (error) Alert.alert('Sign in failed', error.message);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Welcome back</Text>
      <Field label="Email / Gmail" value={email} onChangeText={setEmail} placeholder="you@gmail.com" keyboardType="email-address" />
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="Your password" secure />

      <Button label={loading ? 'SIGNING IN…' : 'SIGN IN'} onPress={signIn} disabled={loading} />
      <Button label="BACK" onPress={onBack} secondary />
    </View>
  );
}

function Home({ email }: { email: string }) {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert('Sign out failed', error.message);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Brand />
        <View style={styles.card}>
          <Text style={styles.kicker}>BRITUME • LIVING</Text>
          <Text style={styles.title}>You are in.</Text>
          <Text style={styles.body}>Signed in as {email}</Text>

          <View style={styles.feature}>
            <Text style={styles.featureIcon}>◈</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>BRITUME SPACE</Text>
              <Text style={styles.muted}>
                Your personal starting point. More BRITUME spaces will be connected here as we build the ecosystem.
              </Text>
            </View>
          </View>

          <Button label="SIGN OUT" onPress={signOut} secondary />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#7c8494"
        secureTextEntry={secure}
        keyboardType={keyboardType}
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
      style={[styles.button, secondary && styles.buttonSecondary, disabled && styles.disabled]}
    >
      <Text style={[styles.buttonText, secondary && styles.buttonTextSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#070a12' },
  container: { padding: 24, paddingBottom: 48 },
  center: {
    flex: 1,
    backgroundColor: '#070a12',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  brand: { alignItems: 'center', marginTop: 30, marginBottom: 28 },
  logoCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: '#d6b45a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoB: { fontSize: 48, fontWeight: '900', color: '#d6b45a' },
  brandName: { fontSize: 30, fontWeight: '900', letterSpacing: 4, color: '#f4f6fb' },
  tagline: {
    marginTop: 8,
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#9ca5b5',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#101522',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#222b3c',
  },
  kicker: { color: '#d6b45a', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#f4f6fb', fontSize: 26, fontWeight: '800', marginBottom: 10 },
  body: { color: '#c4cad5', fontSize: 15, lineHeight: 23, marginBottom: 18 },
  muted: { color: '#8f98a8', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  field: { marginBottom: 14 },
  label: { color: '#dfe4ec', fontSize: 13, fontWeight: '700', marginBottom: 7 },
  input: {
    backgroundColor: '#080c15',
    borderWidth: 1,
    borderColor: '#2a3447',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#f4f6fb',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#d6b45a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#39465d',
  },
  buttonText: { color: '#080a0f', fontWeight: '900', letterSpacing: 1 },
  buttonTextSecondary: { color: '#dfe4ec' },
  disabled: { opacity: 0.5 },
  feature: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#080c15',
    borderWidth: 1,
    borderColor: '#273247',
    marginBottom: 18,
  },
  featureIcon: { fontSize: 34, color: '#d6b45a' },
  featureTitle: { color: '#f4f6fb', fontSize: 17, fontWeight: '800', marginBottom: 4 },
});
