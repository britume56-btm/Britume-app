import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from './lib/supabase';
import AuthGate from './src/screens/Auth/AuthGate';
import AppNavigator from './src/navigation/AppNavigator';

const prefix = Linking.createURL('/');

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

  return <AppNavigator />;
}
