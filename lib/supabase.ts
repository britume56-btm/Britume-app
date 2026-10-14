import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://bmlwsztgllallywbklqb.supabase.co';

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_SbQO4dTHJ7rkDbKN6Wm_SbK7x5s';

export const supabaseConfig = {
  url: supabaseUrl,
  key: supabasePublishableKey,
  isConfigured: true,
};

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.key,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: AsyncStorage,
      storageKey: 'britume-auth',
    },
  },
);
