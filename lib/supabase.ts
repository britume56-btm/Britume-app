import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfig = {
  https://bmlwsztgllallywbklqb.supabase.co/rest/v1/
    sb_publishable_S8qoD4IbThJ7jr6bdKdKNw_SbXrTss
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
