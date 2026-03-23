import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../constants';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../store/authStore';

export default function RootLayout() {
  const { session, profile, setSession, setProfile } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();
  const hasNavigated = useRef(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Timeout ekle — 5 saniye içinde cevap gelmezse devam et
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 5000)
        );

        const sessionPromise = supabase.auth.getSession();

        const { data: { session: currentSession } } = await Promise.race([
          sessionPromise,
          timeout,
        ]) as any;

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
        console.log('Init error or timeout:', e);
        // Session alınamadıysa login'e yönlendir
      }

      setIsReady(true);
    };
    init();

    // Auth değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        
        console.log('AUTH EVENT:', event);

        // Token refresh başarısız olursa session'ı korumaya çalış
        if (event === 'TOKEN_REFRESHED' && !newSession) {
          console.log('Token refresh failed, keeping current session');
          return;
        }

        // Sadece gerçek sign out'ta session'ı sil
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          hasNavigated.current = false;
          return;
        }

        if (newSession?.user) {
          setSession(newSession);
          hasNavigated.current = false;

          const { data: profileData } = await supabase
            .from('users')
            .select('*')
            .eq('id', newSession.user.id)
            .single();

          if (mounted && profileData) {
            setProfile(profileData);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Yönlendirme — sadece 1 kez
  useEffect(() => {
    if (!isReady) return;
    if (hasNavigated.current) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session) {
      if (!inAuthGroup) {
        hasNavigated.current = true;
        router.replace('/(auth)/login' as any);
      }
    } else if (!profile) {
      if (segments.join('/') !== '(auth)/profile-setup') {
        hasNavigated.current = true;
        router.replace('/(auth)/profile-setup' as any);
      }
    } else {
      if (inAuthGroup) {
        hasNavigated.current = true;
        router.replace('/(tabs)/library' as any);
      }
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