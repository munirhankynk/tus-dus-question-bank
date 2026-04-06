import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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

type Course = {
  id: string
  name: string
  color_code: string
}

type ReviewQuestion = {
  id: string
  image_url: string
  course_name: string
  course_color: string
  course_id: string
  note: string | null
  status: "failed" | "skipped" | "solved"
  is_favorite: boolean
  uploaded_at: string
  reviewAnswer?: "failed" | "solved" | null
}

type Phase = "setup" | "review"
type StatusFilter = "all" | "failed" | "skipped" | "favorites"

const MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
]

export default function ReviewScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()

  const [phase, setPhase] = useState<Phase>("setup")

  // Setup
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-indexed
  const [availableCount, setAvailableCount] = useState(0)

  // Review
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageZoom, setImageZoom] = useState(false)
  const [editingNote, setEditingNote] = useState(false)
  const [noteText, setNoteText] = useState("")
  const scrollRef = useRef<ScrollView>(null)

  // Setup: load courses
  useEffect(() => { loadSetupData() }, [])
  useEffect(() => {
    if (phase === "setup") loadAvailableCount()
  }, [selectedCourseId, statusFilter, selectedMonth, selectedYear])

  const loadSetupData = async () => {
    if (!profile) return
    const { data } = await supabase
      .from("courses")
      .select("id, name, color_code")
      .eq("mode", profile.mode)
      .order("sort_order")
    if (data) setCourses(data)
  }

  const getDateRange = () => {
    const start = new Date(selectedYear, selectedMonth, 1)
    const end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)
    return { start: start.toISOString(), end: end.toISOString() }
  }

  const loadAvailableCount = async () => {
    if (!profile) return
    const { start, end } = getDateRange()

    let query = supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("uploaded_at", start)
      .lte("uploaded_at", end)

    if (selectedCourseId) {
      query = query.eq("course_id", selectedCourseId)
    }

    if (statusFilter === "failed") {
      query = query.eq("status", "failed")
    } else if (statusFilter === "skipped") {
      query = query.eq("status", "skipped")
    } else if (statusFilter === "favorites") {
      query = query.eq("is_favorite", true)
    } else {
      // all: yanlış + boş + favoriler
      query = query.or("status.eq.failed,status.eq.skipped,is_favorite.eq.true")
    }

    const { count } = await query
    setAvailableCount(count || 0)
  }

  const startReview = async () => {
    if (!profile || availableCount === 0) return
    const { start, end } = getDateRange()

    let query = supabase
      .from("questions")
      .select(`
        id, image_url, status, note, is_favorite, uploaded_at,
        courses ( name, color_code, id )
      `)
      .eq("user_id", profile.id)
      .gte("uploaded_at", start)
      .lte("uploaded_at", end)

    if (selectedCourseId) {
      query = query.eq("course_id", selectedCourseId)
    }

    if (statusFilter === "failed") {
      query = query.eq("status", "failed")
    } else if (statusFilter === "skipped") {
      query = query.eq("status", "skipped")
    } else if (statusFilter === "favorites") {
      query = query.eq("is_favorite", true)
    } else {
      query = query.or("status.eq.failed,status.eq.skipped,is_favorite.eq.true")
    }

    const { data } = await query

    if (!data || data.length === 0) {
      Alert.alert("Hata", "Soru bulunamadı")
      return
    }

    const shuffled = data
      .sort(() => Math.random() - 0.5)
      .map((q: any) => ({
        id: q.id,
        image_url: q.image_url,
        course_name: q.courses?.name || "",
        course_color: q.courses?.color_code || COLORS.gray300,
        course_id: q.courses?.id || "",
        note: q.note,
        status: q.status,
        is_favorite: q.is_favorite,
        uploaded_at: q.uploaded_at,
      }))

    setQuestions(shuffled)
    setCurrentIndex(0)
    setPhase("review")
  }

  // Review actions
  const currentQ = questions[currentIndex]

  const toggleFavorite = async () => {
    if (!currentQ) return
    const newVal = !currentQ.is_favorite
    await supabase.from("questions").update({ is_favorite: newVal }).eq("id", currentQ.id)
    setQuestions(prev => prev.map(q => q.id === currentQ.id ? { ...q, is_favorite: newVal } : q))
  }

  const markAnswer = (answer: "failed" | "solved") => {
    if (!currentQ) return
    setQuestions(prev => prev.map(q => q.id === currentQ.id ? { ...q, reviewAnswer: answer } : q))
  }

  const saveNote = async () => {
    if (!currentQ) return
    const trimmed = noteText.trim() || null
    await supabase.from("questions").update({ note: trimmed }).eq("id", currentQ.id)
    setQuestions(prev => prev.map(q => q.id === currentQ.id ? { ...q, note: trimmed } : q))
    setEditingNote(false)
  }

  const goNext = () => {
    setCurrentIndex(prev => {
      if (prev < questions.length - 1) return prev + 1
      return prev
    })
    setEditingNote(false)
  }

  const goPrev = () => {
    setCurrentIndex(prev => {
      if (prev > 0) return prev - 1
      return prev
    })
    setEditingNote(false)
  }

  const prevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  // ─── SETUP ───
  if (phase === "setup") {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tekrar</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.setupContent} contentContainerStyle={styles.setupInner}>
          {/* Ay seçimi */}
          <Text style={styles.setupLabel}>Tarih</Text>
          <View style={styles.monthPicker}>
            <TouchableOpacity onPress={prevMonth} style={styles.monthArrowBtn}>
              <Text style={styles.monthArrowText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {MONTHS[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.monthArrowBtn}>
              <Text style={styles.monthArrowText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Ders seçimi */}
          <Text style={styles.setupLabel}>Ders</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <TouchableOpacity
              style={[styles.chip, !selectedCourseId && styles.chipActive]}
              onPress={() => setSelectedCourseId(null)}
            >
              <Text style={[styles.chipText, !selectedCourseId && styles.chipTextActive]}>
                Tüm Dersler
              </Text>
            </TouchableOpacity>
            {courses.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, selectedCourseId === c.id && styles.chipActive]}
                onPress={() => setSelectedCourseId(c.id)}
              >
                <View style={[styles.chipDot, { backgroundColor: c.color_code }]} />
                <Text style={[styles.chipText, selectedCourseId === c.id && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Filtre */}
          <Text style={styles.setupLabel}>Filtre</Text>
          <View style={styles.filterRow}>
            {([
              { key: "all", label: "Karışık", icon: "🔀" },
              { key: "failed", label: "Yanlışlar", icon: "🔴" },
              { key: "favorites", label: "Favoriler", icon: "⭐" },
            ] as const).map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, statusFilter === f.key && styles.filterBtnActive]}
                onPress={() => setStatusFilter(f.key)}
              >
                <Text style={styles.filterIcon}>{f.icon}</Text>
                <Text style={[styles.filterBtnText, statusFilter === f.key && styles.filterBtnTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bilgi kartı */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardText}>
              {availableCount > 0
                ? `${availableCount} soru bulundu`
                : "Bu filtreye uygun soru yok"}
            </Text>
            <Text style={styles.infoCardSub}>
              Yanlış, boş ve favori sorularını tekrar et
            </Text>
          </View>

          {/* Başla */}
          <TouchableOpacity
            style={[styles.startBtn, availableCount === 0 && { opacity: 0.4 }]}
            onPress={startReview}
            disabled={availableCount === 0}
          >
            <Text style={styles.startBtnText}>Tekrara Başla</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ─── REVIEW ───
  if (!currentQ) return null

  const statusInfo = STATUS_COLORS[currentQ.status]

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert("Çıkış", "Tekrarı bırakmak istediğine emin misin?", [
              { text: "Devam Et", style: "cancel" },
              { text: "Çık", style: "destructive", onPress: () => {
                setPhase("setup")
                setQuestions([])
                loadAvailableCount()
              }},
            ])
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {currentIndex + 1}/{questions.length}
        </Text>
        <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn}>
          <Text style={{ fontSize: 22 }}>{currentQ.is_favorite ? "⭐" : "☆"}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentIndex + 1) / questions.length) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            ref={scrollRef}
            style={styles.reviewContent}
            contentContainerStyle={styles.reviewContentInner}
            keyboardShouldPersistTaps="handled"
          >
            {/* Ders + durum badge */}
            <View style={styles.badgeRow}>
              <View style={styles.courseBadge}>
                <View style={[styles.courseBadgeDot, { backgroundColor: currentQ.course_color }]} />
                <Text style={styles.courseBadgeText}>{currentQ.course_name}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.light, borderColor: statusInfo.border }]}>
                <Text style={{ fontSize: 12 }}>{statusInfo.icon}</Text>
                <Text style={[styles.statusBadgeText, { color: statusInfo.main }]}>{statusInfo.label}</Text>
              </View>
            </View>

            {/* Fotoğraf */}
            <TouchableOpacity
              key={currentQ.id}
              style={styles.questionImageContainer}
              onPress={() => setImageZoom(true)}
              activeOpacity={0.9}
            >
              <Image
                key={currentQ.id}
                source={{ uri: currentQ.image_url }}
                style={styles.questionImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Not alanı */}
            {editingNote ? (
              <View style={styles.noteEditContainer}>
                <TextInput
                  style={styles.noteEditInput}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Not ekle..."
                  multiline
                  autoFocus
                  onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                />
                <View style={styles.noteEditActions}>
                  <TouchableOpacity onPress={() => { setEditingNote(false); Keyboard.dismiss() }} style={styles.noteEditCancel}>
                    <Text style={styles.noteEditCancelText}>Vazgeç</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { saveNote(); Keyboard.dismiss() }} style={styles.noteEditSave}>
                    <Text style={styles.noteEditSaveText}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.noteContainer}
                onPress={() => { setNoteText(currentQ.note || ""); setEditingNote(true) }}
              >
                <Text style={styles.noteIcon}>📝</Text>
                <Text style={currentQ.note ? styles.noteText : styles.notePlaceholder} numberOfLines={2}>
                  {currentQ.note || "Not ekle..."}
                </Text>
              </TouchableOpacity>
            )}

            {/* Bildim / Yanlış */}
            <View style={styles.statusChangeRow}>
              <TouchableOpacity
                style={[
                  styles.statusChangeBtn,
                  currentQ.reviewAnswer === "failed" && { backgroundColor: COLORS.redLight, borderColor: COLORS.redBorder }
                ]}
                onPress={() => markAnswer("failed")}
              >
                <Text style={{ fontSize: 14 }}>🔴</Text>
                <Text style={[
                  styles.statusChangeBtnText,
                  currentQ.reviewAnswer === "failed" && { color: COLORS.red, fontWeight: FONT_WEIGHTS.bold }
                ]}>Yanlış</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.statusChangeBtn,
                  currentQ.reviewAnswer === "solved" && { backgroundColor: COLORS.greenLight, borderColor: COLORS.greenBorder }
                ]}
                onPress={() => markAnswer("solved")}
              >
                <Text style={{ fontSize: 14 }}>🟢</Text>
                <Text style={[
                  styles.statusChangeBtnText,
                  currentQ.reviewAnswer === "solved" && { color: COLORS.green, fontWeight: FONT_WEIGHTS.bold }
                ]}>Bildim</Text>
              </TouchableOpacity>
            </View>

            {/* Navigasyon */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[styles.navBtn, currentIndex === 0 && { opacity: 0.3 }]}
                onPress={goPrev}
                disabled={currentIndex === 0}
              >
                <Text style={styles.navBtnText}>‹ Önceki</Text>
              </TouchableOpacity>

              {currentIndex < questions.length - 1 ? (
                <TouchableOpacity style={[styles.navBtn, styles.navBtnPrimary]} onPress={goNext}>
                  <Text style={styles.navBtnPrimaryText}>Sonraki ›</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.navBtn, styles.navBtnDone]}
                  onPress={() => {
                    setPhase("setup")
                    setQuestions([])
                    loadAvailableCount()
                  }}
                >
                  <Text style={styles.navBtnPrimaryText}>Tamamla</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

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
  // ─── COMMON ───
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
  favBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },

  // ─── SETUP ───
  setupContent: { flex: 1, backgroundColor: COLORS.background },
  setupInner: { padding: SPACING.lg, paddingBottom: 100 },
  setupLabel: {
    fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy,
    marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },

  // Ay seçici
  monthPicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    ...SHADOWS.small,
  },
  monthArrowBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.gray100, justifyContent: "center", alignItems: "center",
  },
  monthArrowText: { fontSize: 24, color: COLORS.navy, fontWeight: FONT_WEIGHTS.bold, marginTop: -2 },
  monthText: {
    flex: 1, textAlign: "center",
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy,
  },

  // Chips
  chipScroll: { flexGrow: 0 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: RADIUS.full,
    backgroundColor: COLORS.white, marginRight: SPACING.sm,
    borderWidth: 1.5, borderColor: COLORS.gray100,
  },
  chipActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: FONT_SIZES.sm + 1, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray400 },
  chipTextActive: { color: COLORS.accent },

  // Filtre
  filterRow: { flexDirection: "row", gap: SPACING.sm },
  filterBtn: {
    flex: 1, paddingVertical: SPACING.sm + 2, borderRadius: RADIUS.md,
    backgroundColor: COLORS.white, alignItems: "center", gap: 3,
    borderWidth: 1.5, borderColor: COLORS.gray100,
  },
  filterBtnActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  filterIcon: { fontSize: 14 },
  filterBtnText: { fontSize: FONT_SIZES.xs + 1, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray400 },
  filterBtnTextActive: { color: COLORS.accent },

  // Info
  infoCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.lg,
    marginTop: SPACING.xl, alignItems: "center", ...SHADOWS.small,
  },
  infoCardText: { fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.navy },
  infoCardSub: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, marginTop: SPACING.xs, textAlign: "center" },
  startBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 2, alignItems: "center", marginTop: SPACING.lg,
  },
  startBtnText: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold },

  // ─── REVIEW ───
  progressBar: { height: 4, backgroundColor: COLORS.gray200 },
  progressFill: { height: "100%", backgroundColor: COLORS.accent, borderRadius: 2 },
  reviewContent: { flex: 1, backgroundColor: COLORS.background },
  reviewContentInner: { padding: SPACING.md, paddingBottom: 40 },

  badgeRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: SPACING.sm,
  },
  courseBadge: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  courseBadgeDot: { width: 10, height: 10, borderRadius: 5 },
  courseBadgeText: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  statusBadgeText: { fontSize: FONT_SIZES.xs + 1, fontWeight: FONT_WEIGHTS.bold },

  questionImageContainer: {
    height: SCREEN_HEIGHT * 0.45, backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    overflow: "hidden", marginBottom: SPACING.sm,
    ...SHADOWS.medium,
  },
  questionImage: { width: "100%", height: "100%" },

  // Not
  noteContainer: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.sm + 2,
    marginBottom: SPACING.sm, ...SHADOWS.small,
  },
  noteIcon: { fontSize: 16 },
  noteText: { flex: 1, fontSize: FONT_SIZES.sm + 1, color: COLORS.navy, lineHeight: 18 },
  notePlaceholder: { flex: 1, fontSize: FONT_SIZES.sm + 1, color: COLORS.gray300 },

  noteEditContainer: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md,
    marginBottom: SPACING.sm, ...SHADOWS.small,
  },
  noteEditInput: {
    fontSize: FONT_SIZES.sm + 1, color: COLORS.navy, minHeight: 50,
    textAlignVertical: "top",
  },
  noteEditActions: { flexDirection: "row", justifyContent: "flex-end", gap: SPACING.sm, marginTop: SPACING.sm },
  noteEditCancel: { paddingVertical: 6, paddingHorizontal: 14 },
  noteEditCancelText: { color: COLORS.gray400, fontSize: FONT_SIZES.sm + 1, fontWeight: FONT_WEIGHTS.semibold },
  noteEditSave: {
    backgroundColor: COLORS.accent, paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
  },
  noteEditSaveText: { color: COLORS.white, fontSize: FONT_SIZES.sm + 1, fontWeight: FONT_WEIGHTS.bold },

  // Durum değiştir
  statusChangeRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm },
  statusChangeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.gray100, backgroundColor: COLORS.white,
  },
  statusChangeBtnText: { fontSize: FONT_SIZES.xs + 1, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray400 },

  // Navigasyon
  navRow: { flexDirection: "row", gap: SPACING.sm },
  navBtn: {
    flex: 1, paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white, alignItems: "center",
    borderWidth: 1.5, borderColor: COLORS.gray100,
  },
  navBtnText: { fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.gray400 },
  navBtnPrimary: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  navBtnPrimaryText: { fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.white },
  navBtnDone: { backgroundColor: COLORS.green, borderColor: COLORS.green },

  // ─── MODAL ───
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", justifyContent: "center" },
  modalClose: {
    position: "absolute", top: 60, right: 20, zIndex: 10,
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center", alignItems: "center",
  },
  modalCloseText: { color: COLORS.white, fontSize: 20 },
  modalImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.8 },
})
