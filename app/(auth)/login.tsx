import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useRef, useState } from 'react'
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native'
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from '../../constants'
import { supabase } from '../../services/supabase'
import { setSkipAuthRedirect } from '../_layout'


WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const savedPassword = useRef('')

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Email ve şifre gir")
      return
    }

    setLoading(true)
    setSkipAuthRedirect(true)

    // 1) Şifre doğrula
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoading(false)
      setSkipAuthRedirect(false)
      alert(error.message)
      return
    }

    // 2) Şifre doğru — session'ı temizle, OTP gönder
    savedPassword.current = password
    await supabase.auth.signOut()
    setSkipAuthRedirect(false)

    const { error: otpError } = await supabase.auth.signInWithOtp({ email })
    setLoading(false)

    if (otpError) {
      Alert.alert('Hata', otpError.message)
      return
    }

    setOtpStep(true)
    Alert.alert('Kod Gönderildi', `${email} adresine doğrulama kodu gönderildi.`)
  }

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      alert('Doğrulama kodunu gir')
      return
    }

    setOtpLoading(true)
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'email',
    })
    setOtpLoading(false)

    if (error) {
      Alert.alert('Doğrulama Hatası', error.message)
      return
    }
    // Başarılı — session otomatik oluşur, _layout.tsx yönlendirir
  }

  const handleResendOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      Alert.alert('Hata', error.message)
    } else {
      Alert.alert('Tekrar Gönderildi', 'Yeni doğrulama kodu gönderildi.')
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const redirectUrl = 'medbank://auth/callback'

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (error) {
        Alert.alert('Hata', error.message)
        return
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        )

        if (result.type === 'success' && result.url) {
          let params: URLSearchParams

          if (result.url.includes('#')) {
            params = new URLSearchParams(result.url.split('#')[1])
          } else {
            params = new URLSearchParams(result.url.split('?')[1])
          }

          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken && refreshToken) {
            // setSession → onAuthStateChange tetikler → _layout.tsx session'ı store'a yazar
            // → ayrı useEffect profili fetch eder → navigation otomatik yapılır
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (sessionError) {
              Alert.alert('Hata', sessionError.message)
            }
          } else {
            Alert.alert('Hata', 'Token alınamadı')
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Google giriş başarısız')
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoSection}>
            <Text style={styles.logoEmoji}>🏥</Text>
            <Text style={styles.logoTitle}>MedBank</Text>
            <Text style={styles.logoSub}>TUS & DUS Soru Arşivi</Text>
          </View>

          <View style={styles.formCard}>
            {!otpStep ? (
              <>
                <Text style={styles.formTitle}>Giriş Yap</Text>

                <TextInput
                  placeholder="Email"
                  placeholderTextColor={COLORS.gray300}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="off"
                  textContentType="none"
                />

                <TextInput
                  placeholder="Şifre"
                  placeholderTextColor={COLORS.gray300}
                  style={styles.input}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  autoComplete="off"
                  textContentType="none"
                />

                <TouchableOpacity
                  style={[styles.loginBtn, loading && { opacity: 0.6 }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.loginBtnText}>
                    {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>veya</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleLogin}>
                  <Text style={styles.googleBtnText}>Google ile Giriş</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerLink}
                  onPress={() => router.push('/(auth)/register')}
                >
                  <Text style={styles.registerText}>
                    Hesabın yok mu? <Text style={styles.registerBold}>Kayıt Ol</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.formTitle}>Email Doğrulama</Text>
                <Text style={styles.otpInfo}>
                  {email} adresine gönderilen doğrulama kodunu gir
                </Text>

                <TextInput
                  placeholder="000000"
                  placeholderTextColor={COLORS.gray300}
                  style={[styles.input, styles.otpInput]}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />

                <TouchableOpacity
                  style={[styles.loginBtn, otpLoading && { opacity: 0.6 }]}
                  onPress={handleVerifyOtp}
                  disabled={otpLoading}
                >
                  <Text style={styles.loginBtnText}>
                    {otpLoading ? 'Doğrulanıyor...' : 'Doğrula'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp}>
                  <Text style={styles.resendText}>Kodu tekrar gönder</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.registerLink}
                  onPress={() => { setOtpStep(false); setOtpCode('') }}
                >
                  <Text style={styles.resendText}>← Geri dön</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.navy, justifyContent: 'center', padding: SPACING.lg },
  logoSection: { alignItems: 'center', marginBottom: SPACING.xl },
  logoEmoji: { fontSize: 56, marginBottom: SPACING.sm },
  logoTitle: { fontSize: FONT_SIZES.hero, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.white, letterSpacing: -1 },
  logoSub: { fontSize: FONT_SIZES.md, color: COLORS.gray300, marginTop: SPACING.xs },
  formCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.lg },
  formTitle: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.navy, marginBottom: SPACING.lg },
  input: {
    backgroundColor: COLORS.offWhite, padding: SPACING.md, borderRadius: RADIUS.md,
    marginBottom: SPACING.md, fontSize: FONT_SIZES.md, borderWidth: 2, borderColor: COLORS.gray100, color: COLORS.navy,
  },
  loginBtn: { backgroundColor: COLORS.navy, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', marginTop: SPACING.xs },
  loginBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.gray100 },
  dividerText: { color: COLORS.gray300, fontSize: FONT_SIZES.sm, marginHorizontal: SPACING.md },
  googleBtn: {
    backgroundColor: COLORS.white, padding: SPACING.md, borderRadius: RADIUS.md,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.gray100,
  },
  googleBtnText: { color: COLORS.navy, fontWeight: FONT_WEIGHTS.semibold, fontSize: FONT_SIZES.md },
  registerLink: { marginTop: SPACING.lg, alignItems: 'center' },
  registerText: { color: COLORS.gray400, fontSize: FONT_SIZES.sm },
  registerBold: { color: COLORS.accent, fontWeight: FONT_WEIGHTS.bold },
  otpInfo: { color: COLORS.gray400, fontSize: FONT_SIZES.sm, marginBottom: SPACING.lg, textAlign: 'center' as const },
  otpInput: { textAlign: 'center' as const, fontSize: FONT_SIZES.xl, letterSpacing: 8 },
  resendBtn: { marginTop: SPACING.md, alignItems: 'center' as const },
  resendText: { color: COLORS.accent, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold },
})