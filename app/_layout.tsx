import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { session, profile, setSession, setProfile } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          setSession(session);

          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (e) {
        console.log('Init error:', e);
      }

      setIsReady(true);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (newSession?.user) {
          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', newSession.user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login' as any);
    } else if (!profile) {
      if (segments.join('/') !== '(auth)/profile-setup') {
        router.replace('/(auth)/profile-setup' as any);
      }
    } else {
      if (inAuthGroup) router.replace('/(tabs)/library' as any);
    }
  }, [session, profile, isReady]);

  if (!isReady) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashLogo}>🏥</Text>
        <Text style={styles.splashTitle}>MedBank</Text>
        <Text style={styles.splashSub}>TUS & DUS Soru Arşivi</Text>
        <ActivityIndicator size="small" color={COLORS.accent} style={{ marginTop: SPACING.xl }} />
      </View>
    );
  }

return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.navy,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashLogo: { fontSize: 64, marginBottom: SPACING.md },
  splashTitle: { fontSize: FONT_SIZES.hero, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.white, letterSpacing: -1 },
  splashSub: { fontSize: FONT_SIZES.md, color: COLORS.gray300, marginTop: SPACING.xs },
});