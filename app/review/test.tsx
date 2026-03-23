import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  RADIUS,
  SHADOWS,
  SPACING,
  STATUS_COLORS
} from "../../constants"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"

type ReviewQuestion = {
  id: string
  image_url: string
  status: "failed" | "skipped" | "solved"
  course_name: string
  course_color: string
  note: string | null
  uploaded_at: string
}

export default function ReviewTestScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()

  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [imageZoom, setImageZoom] = useState(false)

  useEffect(() => {
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    if (!profile) return

    // Son 15 günün soruları
    const fifteenDaysAgo = new Date()
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)

    const { data } = await supabase
      .from("questions")
      .select(`
        id, image_url, status, note, uploaded_at,
        courses ( name, color_code )
      `)
      .eq("user_id", profile.id)
      .gte("uploaded_at", fifteenDaysAgo.toISOString())
      .order("uploaded_at", { ascending: false })

    if (data && data.length > 0) {
      // Rastgele karıştır ve max 20 soru al
      const shuffled = data
        .sort(() => Math.random() - 0.5)
        .slice(0, 20)
        .map((q: any) => ({
          id: q.id,
          image_url: q.image_url,
          status: q.status,
          course_name: q.courses?.name || "",
          course_color: q.courses?.color_code || COLORS.gray300,
          note: q.note,
          uploaded_at: q.uploaded_at,
        }))

      setQuestions(shuffled)
      }

    setLoading(false)
  }

   const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      setFinished(true)
    }
  }

   const getMotivation = () => {
    const count = questions.length
    if (count >= 15) return { emoji: "🏆", message: "Müthiş! 15 günde harika bir arşiv biriktirmişsin." }
    if (count >= 10) return { emoji: "💪", message: "Güzel gidiyorsun! Düzenli tekrar başarının anahtarı." }
    return { emoji: "🌱", message: "Her soru bir adım! Devam et." }
  }

  // Yükleniyor
  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Sorular hazırlanıyor...</Text>
      </SafeAreaView>
    )
  }

  // Soru yoksa
  if (questions.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Değerlendirme Testi</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>
            Son 15 günde yüklenmiş soru yok.{"\n"}Önce birkaç soru yükle!
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.back()}>
            <Text style={styles.emptyBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Sonuç ekranı
  if (finished) {
    const { emoji, message } = getMotivation()
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
        <View style={styles.header}>
          <View style={{ width: 36 }} />
          <Text style={styles.headerTitle}>Tamamlandı!</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.resultContainer}>
          <Text style={styles.resultEmoji}>{emoji}</Text>
          <Text style={styles.resultPercent}>{questions.length} Soru</Text>
          <Text style={styles.resultSubtitle}>tekrar edildi</Text>
          <Text style={styles.resultMessage}>{message}</Text>

          <View style={styles.resultCard}>
            <Text style={styles.resultCardText}>
              ✅ Güzel tekrar! Eline sağlık.{"\n"}
              Son 15 günde yüklediğin {questions.length} soruyu{"\n"}
              baştan sona gözden geçirmiş oldun.
            </Text>
            <Text style={styles.resultCardSub}>
              Düzenli tekrar, kalıcı öğrenmenin temelidir. 🎯
            </Text>
          </View>

          <TouchableOpacity style={styles.resultBtn} onPress={() => router.back()}>
            <Text style={styles.resultBtnText}>Tamamla</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resultBtnSecondary}
            onPress={() => {
              setCurrentIndex(0)
              setFinished(false)
            }}
          >
            <Text style={styles.resultBtnSecondaryText}>Tekrar Gözden Geçir</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // Test ekranı
  const currentQ = questions[currentIndex]
  const statusColor = STATUS_COLORS[currentQ.status]

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert("Çıkış", "Testi bırakmak istediğine emin misin?", [
            { text: "Devam Et", style: "cancel" },
            { text: "Çık", style: "destructive", onPress: () => router.back() },
          ])
        }} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentIndex + 1}/{questions.length}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
      </View>

      <View style={styles.testContent}>
        {/* Ders bilgisi */}
        <View style={styles.courseBadge}>
          <View style={[styles.courseBadgeDot, { backgroundColor: currentQ.course_color }]} />
          <Text style={styles.courseBadgeText}>{currentQ.course_name}</Text>
          <Text style={styles.statusBadgeText}>{statusColor.icon} {statusColor.label}</Text>
        </View>

        {/* Soru fotoğrafı */}
        <TouchableOpacity
          style={styles.questionImageContainer}
          onPress={() => setImageZoom(true)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: currentQ.image_url }}
            style={styles.questionImage}
            resizeMode="contain"
          />
          <View style={styles.zoomHint}>
            <Text style={styles.zoomHintText}>🔍 Büyüt</Text>
          </View>
        </TouchableOpacity>

        {/* Cevap butonları */}
        <View style={styles.bottomRow}>
          {currentQ.note && (
            <View style={styles.noteBox}>
              <Text style={styles.noteBoxText}>💬 {currentQ.note}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.nextBtn} onPress={goNext}>
            <Text style={styles.nextBtnText}>
              {currentIndex < questions.length - 1
                ? `Sıradaki → (${currentIndex + 2}/${questions.length})`
                : "Tamamla 🎯"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Zoom modal */}
      <Modal visible={imageZoom} transparent animationType="fade" onRequestClose={() => setImageZoom(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalClose} onPress={() => setImageZoom(false)}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <Image
            source={{ uri: currentQ.image_url }}
            style={styles.modalImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: FONT_SIZES.md, color: COLORS.gray400 },

  header: {
    backgroundColor: COLORS.navy, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  backArrow: { color: COLORS.white, fontSize: 24, fontWeight: FONT_WEIGHTS.bold, marginTop: -2 },
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold },

  progressBar: { height: 4, backgroundColor: COLORS.gray200 },
  progressFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 2 },

  testContent: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },

  courseBadge: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  courseBadgeDot: { width: 10, height: 10, borderRadius: 5 },
  courseBadgeText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy, flex: 1 },
  statusBadgeText: { fontSize: FONT_SIZES.sm, color: COLORS.gray400 },

  questionImageContainer: {
    flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    overflow: "hidden", marginBottom: SPACING.md, position: "relative",
    ...SHADOWS.medium,
  },
  questionImage: { width: "100%", height: "100%" },
  zoomHint: {
    position: "absolute", bottom: SPACING.sm, right: SPACING.sm,
    backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.sm,
  },
  zoomHintText: { color: COLORS.white, fontSize: FONT_SIZES.xs + 1 },

  noteBox: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md,
  },
  noteBoxText: { fontSize: FONT_SIZES.sm + 1, color: COLORS.gray400, lineHeight: 20 },

  nextBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, alignItems: "center",
  },
  nextBtnText: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold },

  bottomRow: { gap: SPACING.sm },
  resultSubtitle: { fontSize: FONT_SIZES.lg, color: COLORS.gray400, marginTop: 2 },
  resultCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    padding: SPACING.lg, width: "100%", marginTop: SPACING.lg,
    ...SHADOWS.small,
  },
  resultCardText: {
    fontSize: FONT_SIZES.md, color: COLORS.navy, lineHeight: 24,
    textAlign: "center", fontWeight: FONT_WEIGHTS.semibold,
  },
  resultCardSub: {
    fontSize: FONT_SIZES.sm, color: COLORS.gray400,
    textAlign: "center", marginTop: SPACING.sm,
  },

  // Sonuç ekranı
  resultContainer: {
    flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg,
    alignItems: "center", justifyContent: "center",
  },
  resultEmoji: { fontSize: 64, marginBottom: SPACING.md },
  resultPercent: { fontSize: 48, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.navy },
  resultMessage: { fontSize: FONT_SIZES.lg, color: COLORS.gray400, textAlign: "center", marginTop: SPACING.sm, marginBottom: SPACING.xl },
  resultBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl,
    marginTop: SPACING.lg,
  },
  resultBtnText: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold },
  resultBtnSecondary: { marginTop: SPACING.sm, paddingVertical: SPACING.sm },
  resultBtnSecondaryText: { color: COLORS.accent, fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold },

  // Boş durum
  emptyContainer: { flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center", padding: SPACING.lg },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.gray400, textAlign: "center", lineHeight: 22 },
  emptyBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 4, marginTop: SPACING.lg,
  },
  emptyBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold },

  // Zoom modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
  modalClose: {
    position: "absolute", top: 60, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  modalCloseText: { color: COLORS.white, fontSize: 20 },
  modalImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
})