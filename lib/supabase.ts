import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfig = {
  url: supabaseUrl ?? 'https://your-project.supabase.co',
  key: supabasePublishableKey ?? 'your-publishable-key-here',
  isConfigured: Boolean(supabaseUrl && supabasePublishableKey),
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
