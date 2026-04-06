import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

export const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const refreshSupabaseSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
  }
}