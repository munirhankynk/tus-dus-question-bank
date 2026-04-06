import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  RADIUS,
  SPACING,
  STATUS_COLORS
} from "../../constants"
import { supabase } from "../../services/supabase"

type Question = {
  id: string
  course_id: string
  image_url: string
  status: "failed" | "skipped" | "solved"
  correct_answer: string | null
  question_text: string | null
  options: Record<string, string> | null
  is_favorite: boolean
  note: string | null
  uploaded_at: string
}

type Course = {
  id: string
  name: string
  color_code: string
}

type Tag = {
  id: string
  name: string
}

export default function QuestionDetailScreen() {
  const { questionId } = useLocalSearchParams<{ questionId: string }>()
  const router = useRouter()

  const [question, setQuestion] = useState<Question | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [editing, setEditing] = useState(false)
  const [editNote, setEditNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [imageModalVisible, setImageModalVisible] = useState(false)

  useEffect(() => {
    if (questionId) loadData()
  }, [questionId])

  const loadData = async () => {
    setLoading(true)

    // Soruyu çek
    const { data: qData } = await supabase
      .from("questions")
      .select("*")
      .eq("id", questionId)
      .single()

    if (qData) {
      setQuestion(qData)
      setEditNote(qData.note || "")

      // Dersi çek
      const { data: cData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", qData.course_id)
        .single()

      if (cData) setCourse(cData)
    }

    // Etiketleri çek
    const { data: tagData } = await supabase
      .from("question_tags")
      .select("tag_id, tags(id, name)")
      .eq("question_id", questionId)

    if (tagData) {
      const parsed = tagData.map((qt: any) => qt.tags).filter(Boolean)
      setTags(parsed)
    }

    setLoading(false)
  }

  const handleToggleFavorite = async () => {
    if (!question) return
    const newFav = !question.is_favorite

    await supabase
      .from("questions")
      .update({ is_favorite: newFav })
      .eq("id", question.id)

    setQuestion({ ...question, is_favorite: newFav })
  }

  const handleSaveNote = async () => {
    if (!question) return

    await supabase
      .from("questions")
      .update({ note: editNote.trim() || null })
      .eq("id", question.id)

    setQuestion({ ...question, note: editNote.trim() || null })
    setEditing(false)
  }

  const handleChangeStatus = async (newStatus: "failed" | "skipped" | "solved") => {
    if (!question) return

    const updates: any = { status: newStatus }
    // Doğru yapıldıysa correct_answer'ı temizle
    if (newStatus === "solved") {
      updates.correct_answer = null
    }

    await supabase
      .from("questions")
      .update(updates)
      .eq("id", question.id)

    setQuestion({ ...question, ...updates })
  }

  const handleDelete = () => {
    Alert.alert(
      "Soruyu Sil",
      "Bu soruyu arşivden silmek istediğine emin misin?",
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            // Önce etiket bağlantılarını sil
            await supabase
              .from("question_tags")
              .delete()
              .eq("question_id", questionId)

            // Soruyu sil
            await supabase
              .from("questions")
              .delete()
              .eq("id", questionId)

            router.back()
          },
        },
      ]
    )
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading || !question) {
    return (
      <SafeAreaView edges={["top"]} style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </SafeAreaView>
    )
  }

  const statusColor = STATUS_COLORS[question.status]

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soru Detay</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Durum + Favori */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.light, borderColor: statusColor.border }]}>
            <Text style={{ fontSize: 14 }}>{statusColor.icon}</Text>
            <Text style={[styles.statusText, { color: statusColor.main }]}>
              {statusColor.label}
            </Text>
          </View>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Text style={{ fontSize: 28 }}>
              {question.is_favorite ? "⭐" : "☆"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Durum değiştirme */}
        <View style={styles.statusChangeRow}>
          {(["failed", "skipped", "solved"] as const).map((s) => {
            const sc = STATUS_COLORS[s]
            const isActive = question.status === s
            return (
              <TouchableOpacity
                key={s}
                style={[
                  styles.statusChangeBtn,
                  isActive && { backgroundColor: sc.light, borderColor: sc.main },
                ]}
                onPress={() => handleChangeStatus(s)}
              >
                <Text style={{ fontSize: 16 }}>{sc.icon}</Text>
                <Text
                  style={[
                    styles.statusChangeBtnText,
                    isActive && { color: sc.main, fontWeight: FONT_WEIGHTS.bold },
                  ]}
                >
                  {s === "failed" ? "Yanlış" : s === "skipped" ? "Boş" : "Doğru"}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Görsel */}
        {question.image_url ? (
          <TouchableOpacity onPress={() => setImageModalVisible(true)}>
            <Image
              source={{ uri: question.image_url }}
              style={styles.image}
              resizeMode="contain"
            />
            <View style={styles.zoomHint}>
              <Text style={styles.zoomHintText}>🔍 Büyütmek için dokun</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={{ fontSize: 48, opacity: 0.3 }}>📄</Text>
          </View>
        )}

        {/* AI taranmış metin */}
        {question.question_text && (
          <View style={styles.scannedCard}>
            <Text style={styles.scannedTitle}>Soru Metni (AI)</Text>
            <Text style={styles.scannedText}>{question.question_text}</Text>
            {question.options && Object.entries(question.options).map(([key, val]) => (
              <Text key={key} style={styles.scannedOption}>
                <Text style={{ fontWeight: FONT_WEIGHTS.bold }}>{key})</Text> {val}
              </Text>
            ))}
          </View>
        )}

        {/* Bilgi kartı */}
        <View style={styles.infoCard}>
          {/* Ders */}
          <Text style={styles.courseName}>{course?.name || ""}</Text>

          {/* Etiketler */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag.id} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Not */}
          {editing ? (
            <View style={styles.noteEditContainer}>
              <TextInput
                style={styles.noteInput}
                value={editNote}
                onChangeText={setEditNote}
                placeholder="Not ekle..."
                multiline
                autoFocus
              />
              <View style={styles.noteEditActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditing(false)
                    setEditNote(question.note || "")
                  }}
                >
                  <Text style={styles.noteCancelText}>Vazgeç</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.noteSaveBtn} onPress={handleSaveNote}>
                  <Text style={styles.noteSaveText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.noteContainer}>
              {question.note ? (
                <Text style={styles.noteText}>💬 {question.note}</Text>
              ) : (
                <Text style={styles.notePlaceholder}>+ Not ekle...</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Tarih */}
        <Text style={styles.dateText}>
          Arşive eklendi: {formatDate(question.uploaded_at)}
        </Text>

        {/* Aksiyonlar */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>🗑️ Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Fotoğraf büyütme modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>
          <ScrollView
            maximumZoomScale={5}
            minimumZoomScale={1}
            contentContainerStyle={styles.modalImageContainer}
            centerContent
          >
            <Image
              source={{ uri: question.image_url }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray400,
  },

  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  backArrow: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: FONT_WEIGHTS.bold,
    marginTop: -2,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentInner: {
    padding: SPACING.md,
    paddingBottom: 100,
  },

  // Durum
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.sm + 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: FONT_WEIGHTS.bold,
  },

  // Durum değiştirme
  statusChangeRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statusChangeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.sm + 2,
    borderWidth: 1.5,
    borderColor: COLORS.gray100,
    backgroundColor: COLORS.white,
  },
  statusChangeBtnText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.gray400,
  },

  image: {
    width: "100%",
    height: 240,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.md,
  },
  imagePlaceholder: {
    width: "100%",
    height: 240,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },

  // AI taranmış metin
  scannedCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.sm, borderWidth: 1.5, borderColor: COLORS.accent + "30",
  },
  scannedTitle: {
    fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.accent,
    marginBottom: SPACING.sm,
  },
  scannedText: { fontSize: FONT_SIZES.sm + 1, color: COLORS.navy, lineHeight: 20, marginBottom: SPACING.sm },
  scannedOption: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, lineHeight: 18, marginLeft: SPACING.xs },

  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  // Zoom hint
  zoomHint: {
    position: "absolute",
    bottom: SPACING.sm + 4,
    right: SPACING.sm + 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  zoomHintText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xs + 1,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  modalClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    color: COLORS.white,
    fontSize: 20,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.8,
  },
  courseName: {
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.navy,
    marginBottom: SPACING.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: SPACING.sm,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.accentLight,
  },
  tagText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.accent,
  },

  noteContainer: {
    padding: SPACING.sm + 2,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.offWhite,
  },
  noteText: {
    fontSize: FONT_SIZES.sm + 1,
    color: COLORS.gray400,
    lineHeight: 20,
  },
  notePlaceholder: {
    fontSize: FONT_SIZES.sm + 1,
    color: COLORS.gray300,
  },
  noteEditContainer: {
    gap: SPACING.sm,
  },
  noteInput: {
    backgroundColor: COLORS.offWhite,
    borderRadius: RADIUS.sm + 2,
    padding: SPACING.sm + 2,
    fontSize: FONT_SIZES.sm + 1,
    color: COLORS.navy,
    minHeight: 60,
    textAlignVertical: "top",
  },
  noteEditActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: SPACING.md,
  },
  noteCancelText: {
    fontSize: FONT_SIZES.sm + 1,
    color: COLORS.gray400,
    fontWeight: FONT_WEIGHTS.semibold,
    paddingVertical: 6,
  },
  noteSaveBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  noteSaveText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHTS.bold,
    fontSize: FONT_SIZES.sm + 1,
  },

  dateText: {
    textAlign: "center",
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray300,
    marginBottom: SPACING.md,
  },

  actionsRow: {
    flexDirection: "row",
    gap: SPACING.sm + 2,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.redBorder,
    backgroundColor: COLORS.redLight,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.red,
  },
})