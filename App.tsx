import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from './lib/supabase';
import AuthGate from './src/screens/Auth/AuthGate';
import AppNavigator from './src/navigation/AppNavigator';
import { AppLockProvider, useAppLock } from './src/security/AppLockContext';
import AppLockScreen from './src/screens/Security/AppLockScreen';
import { AppThemeProvider } from './src/theme/AppThemeContext';

const prefix = Linking.createURL('/');

function AuthenticatedApp() {
  const { ready, statusError, retryStatusCheck, isLocked, unlock } = useAppLock();

  if (!ready) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#070b12',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#d9b867" />
        <Text style={{ color: '#f4f6fa', marginTop: 12 }}>Securing BRITUME…</Text>
      </SafeAreaView>
    );
  }

  if (statusError) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#070b12',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Text style={{ color: '#f4f6fa', fontSize: 22, fontWeight: '800' }}>
          Security check unavailable
        </Text>
        <Text style={{ color: '#c5ccd7', marginTop: 10, lineHeight: 21 }}>
          BRITUME could not read this device’s secure lock status, so the account remains
          closed until the check succeeds.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={retryStatusCheck}
          style={{
            marginTop: 20,
            backgroundColor: '#d9b867',
            borderRadius: 14,
            padding: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#090d15', fontWeight: '900' }}>RETRY SECURITY CHECK</Text>
        </Pressable>
      </View>
    );
  }

  if (isLocked) {
    return <AppLockScreen mode="verify" onUnlock={unlock} />;
  }

  return <AppNavigator />;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (mounted) {
          setSession(data.session);
        }
      } catch (error) {
        console.error('Session load failed:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    const handleDeepLink = async (url: string) => {
      if (url.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          console.error('Deep link exchange failed:', error.message);
        }
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleDeepLink(url);
    });

    void Linking.getInitialURL().then((url) => {
      if (url) {
        void handleDeepLink(url);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      subscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#070b12',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#d9b867" />
        <Text style={{ color: '#f4f6fa', marginTop: 12 }}>Starting BRITUME…</Text>
      </SafeAreaView>
    );
  }

  if (!session) {
    return <AuthGate />;
  }

  return (
    <AppThemeProvider userId={session.user.id}>
      <AppLockProvider key={session.user.id} userId={session.user.id}>
        <AuthenticatedApp />
      </AppLockProvider>
    </AppThemeProvider>
  );
}
