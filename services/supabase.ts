import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://ohqggrpotcfzyrpfarbm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocWdncnBvdGNmenlycGZhcmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDEyMDksImV4cCI6MjA4ODIxNzIwOX0.l8oD-IVG_BV2R5LDpytOAISgXi72JK1RgXfeCnBATuA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});