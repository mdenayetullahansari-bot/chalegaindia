import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  'https://duneqpybtgnzjjbgmbhm.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_eLE135t8JnUSVm3trvw9Pw_ouTREKZM';

const storage =
  Platform.OS === 'web'
    ? undefined
    : AsyncStorage;

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);