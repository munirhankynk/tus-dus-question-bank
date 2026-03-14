import * as ImagePicker from "expo-image-picker"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import { useAuthStore } from "../../store/authStore"

type Course = {
  id: string
  name: string
  color_code: string
  sort_order: number
}

type QuestionStatus = "failed" | "skipped" | "solved"

export default function UploadScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()

  const [imageUri, setImageUri] = useState<string | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showCourseList, setShowCourseList] = useState(false)
  const [status, setStatus] = useState<QuestionStatus | null>(null)
  const [note, setNote] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadCourses()
  }, [])

  const loadCourses = async () => {
    if (!profile) return
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("mode", profile.mode)
      .order("sort_order")
    if (data) setCourses(data)
  }

  // Fotoğraf seç (galeri veya kamera)
  const pickImage = async (useCamera: boolean) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("İzin Gerekli", "Kamera izni verilmedi")
        return
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("İzin Gerekli", "Galeri izni verilmedi")
        return
      }
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: true })

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri)
    }
  }

  const showImageOptions = () => {
    Alert.alert("Fotoğraf", "Nereden yüklemek istersin?", [
      { text: "Kamera", onPress: () => pickImage(true) },
      { text: "Galeri", onPress: () => pickImage(false) },
      { text: "Vazgeç", style: "cancel" },
    ])
  }

  // Etiket ekle
  const addTag = (tagName: string) => {
    const cleaned = tagName.toLowerCase().trim()
    if (cleaned && !tags.includes(cleaned)) {
      setTags([...tags, cleaned])
    }
    setTagInput("")
    setSuggestedTags([])
  }

  const removeTag = (tagName: string) => {
    setTags(tags.filter((t) => t !== tagName))
  }

  // Etiket otomatik tamamlama
  const handleTagInputChange = async (text: string) => {
    setTagInput(text)
    if (text.length < 2 || !selectedCourse || !profile) {
      setSuggestedTags([])
      return
    }

    const { data } = await supabase
      .from("tags")
      .select("name")
      .eq("user_id", profile.id)
      .eq("course_id", selectedCourse.id)
      .ilike("name", `%${text}%`)
      .limit(5)

    if (data) {
      const names = data.map((t: any) => t.name).filter((n: string) => !tags.includes(n))
      setSuggestedTags(names)
    }
  }

  // Kaydet
  const handleSave = async () => {
    if (!imageUri) { Alert.alert("Hata", "Fotoğraf seç"); return }
    if (!selectedCourse) { Alert.alert("Hata", "Ders seç"); return }
    if (!status) { Alert.alert("Hata", "Soru durumu seç"); return }
    if (!profile) return

    setUploading(true)

    try {
      // 1. Görseli Storage'a yükle
      const fileName = `${profile.id}/${Date.now()}.jpg`
      const response = await fetch(imageUri)
      const blob = await response.blob()

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("question-images")
        .upload(fileName, blob, { contentType: "image/jpeg" })

      if (uploadError) {
        Alert.alert("Hata", "Görsel yüklenemedi: " + uploadError.message)
        setUploading(false)
        return
      }

      // 2. Public URL al
      const { data: urlData } = supabase.storage
        .from("question-images")
        .getPublicUrl(uploadData.path)

      // 3. Soruyu kaydet
      const {
  data: { user },
} = await supabase.auth.getUser()

const { data: questionData, error: questionError } = await supabase
  .from("questions")
  .insert({
    user_id: user?.id,
    course_id: selectedCourse.id,
    image_url: urlData.publicUrl,
    status: status,
    note: note.trim() || null,
    is_favorite: false,
  })
  .select()
  .single()

      if (questionError) {
        Alert.alert("Hata", "Soru kaydedilemedi: " + questionError.message)
        setUploading(false)
        return
      }

      // 4. Etiketleri kaydet
      for (const tagName of tags) {
        // Etiket var mı kontrol et, yoksa oluştur
        let tagId: string

        const { data: existingTag } = await supabase
          .from("tags")
          .select("id")
          .eq("user_id", profile.id)
          .eq("course_id", selectedCourse.id)
          .ilike("name", tagName)
          .single()

        if (existingTag) {
          tagId = existingTag.id
        } else {
          const { data: newTag } = await supabase
            .from("tags")
            .insert({
              user_id: profile.id,
              course_id: selectedCourse.id,
              name: tagName,
            })
            .select()
            .single()

          if (!newTag) continue
          tagId = newTag.id
        }

        // question_tags bağlantısı
        await supabase
          .from("question_tags")
          .insert({ question_id: questionData.id, tag_id: tagId })
      }

      // 5. Başarılı — formu sıfırla
      Alert.alert("Başarılı", "Soru arşive eklendi! 🎉", [
        {
          text: "Tamam",
          onPress: () => {
            setImageUri(null)
            setSelectedCourse(null)
            setStatus(null)
            setNote("")
            setTags([])
            setTagInput("")
          },
        },
      ])
    } catch (err: any) {
      Alert.alert("Hata", err.message || "Bir şeyler yanlış gitti")
    }

    setUploading(false)
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Soru Yükle</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
        >
          {/* Fotoğraf alanı */}
          <TouchableOpacity style={styles.photoArea} onPress={showImageOptions}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.photoPreview} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoTitle}>Fotoğraf Çek veya Seç</Text>
                <Text style={styles.photoSub}>Kamera veya galeriden yükle</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Ders Seçimi */}
          <Text style={styles.label}>Ders Seçimi</Text>
          <TouchableOpacity
            style={styles.selectBtn}
            onPress={() => setShowCourseList(!showCourseList)}
          >
            <Text style={selectedCourse ? styles.selectText : styles.selectPlaceholder}>
              {selectedCourse ? selectedCourse.name : "Ders seçin..."}
            </Text>
            <Text style={styles.selectArrow}>{showCourseList ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {showCourseList && (
            <View style={styles.courseList}>
              <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }}>
                {courses.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.courseOption,
                      selectedCourse?.id === c.id && styles.courseOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedCourse(c)
                      setShowCourseList(false)
                      setTags([])
                      setSuggestedTags([])
                    }}
                  >
                    <View style={[styles.courseDot, { backgroundColor: c.color_code }]} />
                    <Text style={styles.courseOptionText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Soru Durumu */}
          <Text style={styles.label}>Soru Durumu</Text>
          <View style={styles.statusRow}>
            {(["failed", "skipped", "solved"] as const).map((s) => {
              const sc = STATUS_COLORS[s]
              const isActive = status === s
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusBtn,
                    isActive && { backgroundColor: sc.light, borderColor: sc.border },
                  ]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{sc.icon}</Text>
                  <Text
                    style={[
                      styles.statusBtnText,
                      isActive && { color: sc.main, fontWeight: FONT_WEIGHTS.bold },
                    ]}
                  >
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Etiketler */}
          <Text style={styles.label}>Etiketler</Text>
          <View style={styles.tagsContainer}>
            {tags.map((t) => (
              <View key={t} style={styles.tagChip}>
                <Text style={styles.tagChipText}>#{t}</Text>
                <TouchableOpacity onPress={() => removeTag(t)}>
                  <Text style={styles.tagRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TextInput
              style={styles.tagInput}
              placeholder={selectedCourse ? "+ Etiket ekle..." : "Önce ders seç"}
              value={tagInput}
              onChangeText={handleTagInputChange}
              onSubmitEditing={() => {
                if (tagInput.trim()) addTag(tagInput)
              }}
              editable={!!selectedCourse}
            />
          </View>

          {/* Otomatik tamamlama önerileri */}
          {suggestedTags.length > 0 && (
            <View style={styles.suggestionsRow}>
              {suggestedTags.map((s) => (
                <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => addTag(s)}>
                  <Text style={styles.suggestionText}>#{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Not */}
          <Text style={styles.label}>Not (opsiyonel)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Kendine bir not bırak..."
            value={note}
            onChangeText={setNote}
            multiline
          />

          {/* Kaydet */}
          <TouchableOpacity
            style={[styles.saveBtn, uploading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={uploading}
          >
            <Text style={styles.saveBtnText}>
              {uploading ? "Yükleniyor..." : "Arşive Kaydet"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentInner: {
    padding: SPACING.md,
    paddingBottom: 120,
  },

  // Fotoğraf
  photoArea: {
    borderRadius: RADIUS.xl,
    borderWidth: 3,
    borderStyle: "dashed",
    borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    overflow: "hidden",
    marginBottom: SPACING.lg,
  },
  photoPlaceholder: {
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  photoIcon: {
    fontSize: 28,
    width: 56,
    height: 56,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentLight,
    textAlign: "center",
    lineHeight: 56,
    overflow: "hidden",
  },
  photoTitle: {
    fontSize: FONT_SIZES.md + 1,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.navy,
  },
  photoSub: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray300,
  },
  photoPreview: {
    width: "100%",
    height: 200,
  },

  // Label
  label: {
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.navy,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },

  // Ders seçimi
  selectBtn: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.gray100,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md - 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.navy,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  selectPlaceholder: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray300,
  },
  selectArrow: {
    fontSize: 12,
    color: COLORS.gray300,
  },
  courseList: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginTop: SPACING.xs,
    overflow: "hidden",
  },
  courseOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  courseOptionActive: {
    backgroundColor: COLORS.accentLight,
  },
  courseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  courseOptionText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.navy,
  },

  // Durum
  statusRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: SPACING.md - 2,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.gray100,
    backgroundColor: COLORS.white,
    alignItems: "center",
  },
  statusBtnText: {
    fontSize: FONT_SIZES.xs + 1,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.navy,
  },

  // Etiketler
  tagsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.gray100,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: SPACING.sm,
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm + 2,
  },
  tagChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.accent,
  },
  tagRemove: {
    fontSize: 12,
    color: COLORS.accent,
    opacity: 0.5,
  },
  tagInput: {
    fontSize: FONT_SIZES.sm + 1,
    color: COLORS.navy,
    minWidth: 100,
    paddingVertical: 4,
  },
  suggestionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  suggestionChip: {
    backgroundColor: COLORS.gray100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  suggestionText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
  },

  // Not
  noteInput: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.gray100,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.sm + 1,
    color: COLORS.navy,
    minHeight: 60,
    textAlignVertical: "top",
  },

  // Kaydet
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
})