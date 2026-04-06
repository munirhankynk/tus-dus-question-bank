import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

// Login OTP akışında geçici session'ı engellemek için global flag
export let skipAuthRedirect = false;
export function setSkipAuthRedirect(val: boolean) { skipAuthRedirect = val; }

export default function RootLayout() {
  const { session, profile, setSession, setProfile } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const obDone = await AsyncStorage.getItem('onboarding_done');
        if (mounted) setOnboardingDone(obDone === 'true');

        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession?.user) {
          setSession(currentSession);

          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentSession.user.id)
            .single();

          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (e) {
        console.log('Init error:', e);
      }

      if (mounted) setIsReady(true);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;

        console.log('AUTH EVENT:', event);

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          return;
        }

        if (newSession?.user && !skipAuthRedirect) {
          setSession(newSession);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (profile?.id === session.user.id) return; // Zaten yüklü

    let cancelled = false;
    setProfileLoading(true);

    const fetchProfile = async () => {
      try {
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!cancelled) {
          if (profileData) {
            setProfile(profileData);
          }
          setProfileLoading(false);
        }
      } catch (e) {
        console.log('Profile fetch error:', e);
        if (!cancelled) setProfileLoading(false);
      }
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [session?.user?.id]);

  // 3) Navigation - profil yüklenirken bekle
  useEffect(() => {
    if (!isReady || profileLoading || onboardingDone === null) return;

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segments.join('/');

    // Onboarding henüz yapılmadıysa
    if (!onboardingDone && !session) {
      if (currentPath !== '(auth)/onboarding') {
        router.replace('/(auth)/onboarding' as any);
      }
      return;
    }

    if (!session) {
      if (!inAuthGroup) {
        router.replace('/(auth)/login' as any);
      }
    } else if (!profile) {
      // Kayıt ekranındayken profile-setup'a yönlendirme (signUp geçici session oluşturur)
      if (currentPath !== '(auth)/profile-setup' && currentPath !== '(auth)/register') {
        router.replace('/(auth)/profile-setup' as any);
      }
    } else {
      if (inAuthGroup) {
        router.replace('/(tabs)/library' as any);
      }
    }
  }, [session, profile, isReady, profileLoading, onboardingDone]);

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