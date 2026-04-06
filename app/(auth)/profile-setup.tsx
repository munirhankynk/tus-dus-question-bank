import { useState } from "react"
import {
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
} from "react-native"
import {
    COLORS,
    FONT_SIZES,
    FONT_WEIGHTS,
    RADIUS,
    SPACING
} from "../../constants"
import { useAuthStore } from "../../store/authStore"

export default function ProfileSetup() {
  const { session, setProfile } = useAuthStore()

  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [mode, setMode] = useState<"TUS" | "DUS">("TUS")
  const [university, setUniversity] = useState("")
  const [attempt, setAttempt] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [usernameError, setUsernameError] = useState("")

  const validateUsername = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9._]/g, "")
    setUsername(cleaned)
    setUsernameError("")
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("İsim gir")
      return
    }
    if (!username.trim() || username.length < 3) {
      setUsernameError("Kullanıcı adı en az 3 karakter olmalı")
      return
    }

    const userId = session?.user?.id
    const accessToken = session?.access_token

    if (!userId || !accessToken) {
      alert("Oturum bulunamadı, tekrar giriş yap")
      return
    }

    setLoading(true)

    try {
      // Direkt REST API ile profil oluştur
      const response = await fetch(
        'https://ohqggrpotcfzyrpfarbm.supabase.co/rest/v1/users',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocWdncnBvdGNmenlycGZhcmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDEyMDksImV4cCI6MjA4ODIxNzIwOX0.l8oD-IVG_BV2R5LDpytOAISgXi72JK1RgXfeCnBATuA',
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify({
            id: userId,
            name: name.trim(),
            username: username.trim().toLowerCase(),
            gender,
            mode,
            university: university.trim() || null,
            attempt_number: attempt,
            streak_count: 0,
          }),
        }
      )

      const result = await response.json()

      if (response.ok && Array.isArray(result) && result.length > 0) {
        setProfile(result[0])
      } else {
        const errMsg = JSON.stringify(result)
        if (errMsg.includes("username") || errMsg.includes("duplicate") || errMsg.includes("unique")) {
          setUsernameError("Bu kullanıcı adı zaten alınmış")
        } else {
          alert("Hata: " + errMsg)
        }
      }
    } catch (e: any) {
      alert("Hata: " + (e.message || "Bilinmeyen hata"))
    }

    setLoading(false)
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.step}>Adım 2/2</Text>
          <Text style={styles.title}>Profilini Oluştur</Text>
          <Text style={styles.subtitle}>Sana özel deneyim için birkaç bilgi</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Adın</Text>
            <TextInput
              style={styles.input}
              placeholder="Adın"
              value={name}
              onChangeText={setName}
              autoComplete="off"
              textContentType="oneTimeCode"
              autoCorrect={false}
            />

            <Text style={styles.label}>Cinsiyet</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.genderButton, gender === "male" && styles.genderActive]}
                onPress={() => setGender("male")}
              >
                <Text style={styles.genderIcon}>👨‍⚕️</Text>
                <Text style={styles.genderText}>Erkek</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === "female" && styles.genderActive]}
                onPress={() => setGender("female")}
              >
                <Text style={styles.genderIcon}>👩‍⚕️</Text>
                <Text style={styles.genderText}>Kadın</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Kullanıcı Adı</Text>
            <TextInput
              style={[styles.input, usernameError ? { borderWidth: 1.5, borderColor: COLORS.red } : {}]}
              placeholder="ornek.kullanici"
              value={username}
              onChangeText={validateUsername}
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect={false}
              maxLength={20}
            />
            {usernameError ? (
              <Text style={{ color: COLORS.red, fontSize: FONT_SIZES.xs + 1, marginTop: 4 }}>{usernameError}</Text>
            ) : (
              <Text style={{ color: COLORS.gray300, fontSize: FONT_SIZES.xs + 1, marginTop: 4 }}>
                Arkadaşların seni bu isimle ekleyecek
              </Text>
            )}

            <Text style={styles.label}>Hangi sınava hazırlanıyorsun?</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeButton, mode === "TUS" && styles.modeActive]}
                onPress={() => setMode("TUS")}
              >
                <Text style={styles.modeTitle}>TUS</Text>
                <Text style={styles.modeSub}>Tıpta Uzmanlık</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === "DUS" && styles.modeActive]}
                onPress={() => setMode("DUS")}
              >
                <Text style={styles.modeTitle}>DUS</Text>
                <Text style={styles.modeSub}>Diş Hekimliği</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Üniversite (opsiyonel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Üniversite..."
              value={university}
              onChangeText={setUniversity}
              autoComplete="off"
              textContentType="oneTimeCode"
              autoCorrect={false}
            />

            <Text style={styles.label}>Kaçıncı kez giriyorsun?</Text>
            <View style={styles.attemptRow}>
              {[
                { label: "İlk kez", value: 1 },
                { label: "2. kez", value: 2 },
                { label: "3+ kez", value: 3 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.attemptButton, attempt === item.value && styles.attemptActive]}
                  onPress={() => setAttempt(item.value)}
                >
                  <Text>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.startButton, loading && { opacity: 0.6 }]}
              onPress={handleCreate}
              disabled={loading}
            >
              <Text style={styles.startText}>
                {loading ? "Oluşturuluyor..." : "Başlayalım! 🚀"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy },
  scroll: { flexGrow: 1, justifyContent: "center", padding: SPACING.lg },
  step: { color: COLORS.gray300, textAlign: "center", marginBottom: SPACING.xs },
  title: { fontSize: FONT_SIZES.hero, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.white, textAlign: "center" },
  subtitle: { textAlign: "center", color: COLORS.gray300, marginBottom: SPACING.lg },
  card: { backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.lg },
  label: { marginTop: SPACING.md, marginBottom: SPACING.xs, fontWeight: FONT_WEIGHTS.semibold },
  input: { backgroundColor: COLORS.gray100, padding: SPACING.md, borderRadius: RADIUS.md },
  modeRow: { flexDirection: "row", gap: SPACING.md, marginTop: SPACING.md },
  modeButton: { flex: 1, backgroundColor: COLORS.gray100, padding: SPACING.md, borderRadius: RADIUS.lg, alignItems: "center" },
  modeActive: { borderWidth: 2, borderColor: COLORS.accent },
  modeTitle: { fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.lg },
  modeSub: { color: COLORS.gray400 },
  attemptRow: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md },
  attemptButton: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.gray100, alignItems: "center" },
  attemptActive: { borderWidth: 2, borderColor: COLORS.accent },
  startButton: { backgroundColor: COLORS.accent, padding: SPACING.lg, borderRadius: RADIUS.lg, alignItems: "center", marginTop: SPACING.lg },
  startText: { fontWeight: FONT_WEIGHTS.bold, color: COLORS.white, fontSize: FONT_SIZES.md },
  genderButton: { flex: 1, backgroundColor: COLORS.gray100, padding: SPACING.md, borderRadius: RADIUS.lg, alignItems: "center" as const, gap: 4 },
  genderActive: { borderWidth: 2, borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  genderIcon: { fontSize: 32 },
  genderText: { fontWeight: FONT_WEIGHTS.semibold, color: COLORS.navy, fontSize: FONT_SIZES.sm },
})