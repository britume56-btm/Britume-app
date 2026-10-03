import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabaseConfig = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co',
  key:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    'public-anon-key',
  isConfigured: Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
      (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
  ),
};

export const supabase = createClient(supabaseConfig.url, supabaseConfig.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: AsyncStorage,
    storageKey: 'britume-auth',
  },
});
