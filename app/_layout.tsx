import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../constants';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { session, profile, setSession, fetchProfile } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) fetchProfile();
  }, [session]);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      router.replace('/(auth)/login');
      return;
    }

    if (session && !profile) {
      router.replace('/(auth)/profile-setup');
      return;
    }

    if (session && profile && inAuthGroup) {
      router.replace('/(tabs)/library');
    }

  }, [session, profile, initializing]);

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.navy }}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}