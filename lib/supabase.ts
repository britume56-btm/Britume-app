import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bmlwsztgllallywbklqb.supabase.co';
const supabasePublishableKey = 'sb_publishable_SbQO4dTHJ7rkDbKN6Wm_SbK7x5s';

export const supabaseConfig = {
  url: https://bmlwsztgllallywbklqb.supabase.co/rest/v1/
  key: sb_publishable_S8qoD4IbThJ7jr6bdKdKNw_SbXrTssJ
  isConfigured: true,
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
