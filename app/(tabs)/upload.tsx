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
import { useQuestionStore } from "../../store/questionStore"

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
  const { triggerRefresh } = useQuestionStore()

  type ImageItem = {
    uri: string
    status: "uploading" | "done" | "error"
    publicUrl?: string
    storagePath?: string
  }

  const [images, setImages] = useState<ImageItem[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [showCourseList, setShowCourseList] = useState(false)
  const [status, setStatus] = useState<QuestionStatus | null>(null)
  const [note, setNote] = useState("")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")

  useEffect(() => { loadCourses() }, [])

  const loadCourses = async () => {
    if (!profile) return
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("mode", profile.mode)
      .order("sort_order")
    if (data) setCourses(data)
  }
// Fotoğraf seçilince hemen Storage'a yüklemeye başla
  const uploadToStorage = async (uri: string, index: number) => {
    if (!profile) return

    try {
      const fileName = `${profile.id}/${Date.now()}_${index}.jpg`
      const response = await fetch(uri)
      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      const { data: uploadData, error } = await supabase.storage
        .from("question-images")
        .upload(fileName, uint8Array, { contentType: "image/jpeg", upsert: false })

      if (error) {
        setImages((prev) => prev.map((img) =>
          img.uri === uri ? { ...img, status: "error" as const } : img
        ))
        return
      }

      const { data: urlData } = supabase.storage
        .from("question-images")
        .getPublicUrl(uploadData.path)

      setImages((prev) => prev.map((img) =>
        img.uri === uri
          ? { ...img, status: "done" as const, publicUrl: urlData.publicUrl, storagePath: uploadData.path }
          : img
      ))
    } catch {
      setImages((prev) => prev.map((img) =>
        img.uri === uri ? { ...img, status: "error" as const } : img
      ))
    }
  }

  const addImages = (uris: string[]) => {
    const newItems: ImageItem[] = uris.map((uri) => ({
      uri,
      status: "uploading" as const,
    }))

    setImages((prev) => {
      const updated = [...prev, ...newItems]
      newItems.forEach((item, i) => {
        uploadToStorage(item.uri, prev.length + i)
      })
      return updated
    })
  }

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("İzin Gerekli", "Galeri izni verilmedi")
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    })

    if (!result.canceled && result.assets.length > 0) {
      addImages(result.assets.map((a) => a.uri))
    }
  }

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("İzin Gerekli", "Kamera izni verilmedi")
      return
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
    })

    if (!result.canceled && result.assets[0]) {
      addImages([result.assets[0].uri])
    }
  }

  const showImageOptions = () => {
    Alert.alert("Fotoğraf", "Nereden yüklemek istersin?", [
      { text: "📷 Kamera", onPress: pickFromCamera },
      { text: "🖼️ Galeri (çoklu)", onPress: pickFromGallery },
      { text: "Vazgeç", style: "cancel" },
    ])
  }

  const removeImage = async (index: number) => {
    const img = images[index]
    // Storage'dan da sil
    if (img.storagePath) {
      await supabase.storage.from("question-images").remove([img.storagePath])
    }
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Etiket işlemleri
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

  // Tek bir görseli yükle ve soruyu kaydet
  const uploadSingleQuestion = async (imageUri: string, index: number, total: number) => {
    if (!profile || !selectedCourse || !status) return null

    setUploadProgress(`${index + 1}/${total} yükleniyor...`)

    // Görseli Storage'a yükle
    const fileName = `${profile.id}/${Date.now()}_${index}.jpg`
    const response = await fetch(imageUri)
    const arrayBuffer = await response.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("question-images")
      .upload(fileName, uint8Array, { contentType: "image/jpeg", upsert: false })

    if (uploadError) throw new Error(`Görsel yüklenemedi: ${uploadError.message}`)

    // Public URL al
    const { data: urlData } = supabase.storage
      .from("question-images")
      .getPublicUrl(uploadData.path)

    // Auth user al
    const { data: { user } } = await supabase.auth.getUser()

    // Soruyu kaydet
    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .insert({
        user_id: user?.id,
        course_id: selectedCourse.id,
        image_url: urlData.publicUrl,
        status: status,
        note: total === 1 ? (note.trim() || null) : null,
        is_favorite: false,
      })
      .select()
      .single()

    if (questionError) throw new Error(`Soru kaydedilemedi: ${questionError.message}`)

    // Etiketleri kaydet
    for (const tagName of tags) {
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
          .insert({ user_id: profile.id, course_id: selectedCourse.id, name: tagName })
          .select()
          .single()

        if (!newTag) continue
        tagId = newTag.id
      }

      await supabase
        .from("question_tags")
        .insert({ question_id: questionData.id, tag_id: tagId })
    }

    return questionData
  }

  const handleSave = async () => {
    if (images.length === 0) { Alert.alert("Hata", "En az 1 fotoğraf ekle"); return }
    if (!selectedCourse) { Alert.alert("Hata", "Ders seç"); return }
    if (!status) { Alert.alert("Hata", "Soru durumu seç"); return }
    if (!profile) return

    // Hâlâ yüklenen var mı kontrol et
    const stillUploading = images.some((img) => img.status === "uploading")
    if (stillUploading) {
      Alert.alert("Bekle", "Fotoğraflar hâlâ yükleniyor...")
      return
    }

    // Hatalı olanlar var mı
    const failed = images.filter((img) => img.status === "error")
    if (failed.length > 0) {
      Alert.alert("Hata", `${failed.length} fotoğraf yüklenemedi. Onları kaldırıp tekrar dene.`)
      return
    }

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      let successCount = 0

      for (let i = 0; i < images.length; i++) {
        const img = images[i]
        if (!img.publicUrl) continue

        setUploadProgress(`${i + 1}/${images.length} kaydediliyor...`)

        // Soruyu kaydet
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .insert({
            user_id: user?.id,
            course_id: selectedCourse.id,
            image_url: img.publicUrl,
            status: status,
            note: images.length === 1 ? (note.trim() || null) : null,
            is_favorite: false,
          })
          .select()
          .single()

        if (questionError) continue

        // Etiketleri kaydet
        for (const tagName of tags) {
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
              .insert({ user_id: profile.id, course_id: selectedCourse.id, name: tagName })
              .select()
              .single()
            if (!newTag) continue
            tagId = newTag.id
          }

          await supabase
            .from("question_tags")
            .insert({ question_id: questionData.id, tag_id: tagId })
        }

        successCount++
      }

      setUploadProgress("")

      Alert.alert("Başarılı! 🎉", `${successCount} soru arşive eklendi.`, [{
        text: "Tamam",
        onPress: () => {
          setImages([])
          setSelectedCourse(null)
          setStatus(null)
          setNote("")
          setTags([])
          setTagInput("")
          triggerRefresh()
        },
      }])
    } catch (err: any) {
      setUploadProgress("")
      Alert.alert("Hata", err.message || "Bir şeyler yanlış gitti")
    }

    setUploading(false)
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Soru Yükle</Text>
        {images.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{images.length} fotoğraf</Text>
          </View>
        )}
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
          {images.length === 0 ? (
            <TouchableOpacity style={styles.photoArea} onPress={showImageOptions}>
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoIcon}>📷</Text>
                <Text style={styles.photoTitle}>Fotoğraf Çek veya Seç</Text>
                <Text style={styles.photoSub}>Kamera veya galeriden çoklu yükle</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.imageGrid}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageGridItem}>
                  <Image source={{ uri: img.uri }} style={styles.imageGridThumb} resizeMode="cover" />
                  <TouchableOpacity style={styles.imageRemoveBtn} onPress={() => removeImage(index)}>
                    <Text style={styles.imageRemoveText}>✕</Text>
                  </TouchableOpacity>
                  {/* Yükleme durumu */}
                  {img.status === "uploading" && (
                    <View style={styles.imageOverlay}>
                      <Text style={styles.imageOverlayText}>⏳</Text>
                    </View>
                  )}
                  {img.status === "done" && (
                    <View style={styles.imageIndexBadge}>
                      <Text style={styles.imageIndexText}>✓</Text>
                    </View>
                  )}
                  {img.status === "error" && (
                    <View style={[styles.imageOverlay, { backgroundColor: "rgba(239,68,68,0.6)" }]}>
                      <Text style={styles.imageOverlayText}>✕</Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Daha fazla ekle butonu */}
              <TouchableOpacity style={styles.addMoreBtn} onPress={showImageOptions}>
                <Text style={styles.addMoreIcon}>+</Text>
                <Text style={styles.addMoreText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          )}

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
                    style={[styles.courseOption, selectedCourse?.id === c.id && styles.courseOptionActive]}
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
          <Text style={styles.label}>Soru Durumu {images.length > 1 ? `(${images.length} soru için geçerli)` : ""}</Text>
          <View style={styles.statusRow}>
            {(["failed", "skipped", "solved"] as const).map((s) => {
              const sc = STATUS_COLORS[s]
              const isActive = status === s
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.statusBtn, isActive && { backgroundColor: sc.light, borderColor: sc.border }]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{sc.icon}</Text>
                  <Text style={[styles.statusBtnText, isActive && { color: sc.main, fontWeight: FONT_WEIGHTS.bold }]}>
                    {sc.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Etiketler */}
          <Text style={styles.label}>Etiketler {images.length > 1 ? "(tümüne eklenir)" : ""}</Text>
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
              onSubmitEditing={() => { if (tagInput.trim()) addTag(tagInput) }}
              editable={!!selectedCourse}
            />
          </View>

          {suggestedTags.length > 0 && (
            <View style={styles.suggestionsRow}>
              {suggestedTags.map((s) => (
                <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => addTag(s)}>
                  <Text style={styles.suggestionText}>#{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Not — sadece tekli yüklemede */}
          {images.length <= 1 && (
            <>
              <Text style={styles.label}>Not (opsiyonel)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Kendine bir not bırak..."
                value={note}
                onChangeText={setNote}
                multiline
              />
            </>
          )}

          {images.length > 1 && (
            <View style={styles.multiInfo}>
              <Text style={styles.multiInfoText}>
                ℹ️ {images.length} soru aynı derse, duruma ve etiketlere sahip olacak. Not sadece tekli yüklemede eklenebilir.
              </Text>
            </View>
          )}

          {/* Kaydet */}
          <TouchableOpacity
            style={[styles.saveBtn, uploading && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={uploading}
          >
            <Text style={styles.saveBtnText}>
              {uploading
                ? uploadProgress || "Yükleniyor..."
                : images.length > 1
                ? `${images.length} Soruyu Arşive Kaydet`
                : "Arşive Kaydet"}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold },
  countBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  countBadgeText: { color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  content: { flex: 1, backgroundColor: COLORS.background },
  contentInner: { padding: SPACING.md, paddingBottom: 120 },

  // Fotoğraf — boş durum
  photoArea: {
    borderRadius: RADIUS.xl, borderWidth: 3, borderStyle: "dashed",
    borderColor: COLORS.gray200, backgroundColor: COLORS.white,
    overflow: "hidden", marginBottom: SPACING.lg,
  },
  photoPlaceholder: { height: 170, alignItems: "center", justifyContent: "center", gap: SPACING.sm },
  photoIcon: {
    fontSize: 28, width: 56, height: 56, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.accentLight, textAlign: "center", lineHeight: 56, overflow: "hidden",
  },
  photoTitle: { fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  photoSub: { fontSize: FONT_SIZES.sm, color: COLORS.gray300 },

  // Fotoğraf grid
  imageGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  imageGridItem: {
    width: 100, height: 100, borderRadius: RADIUS.md,
    overflow: "hidden", position: "relative",
  },
  imageGridThumb: { width: "100%", height: "100%" },
  imageRemoveBtn: {
    position: "absolute", top: 4, right: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  imageRemoveText: { color: COLORS.white, fontSize: 12, fontWeight: FONT_WEIGHTS.bold },
  imageIndexBadge: {
    position: "absolute", bottom: 4, left: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.navy,
    justifyContent: "center", alignItems: "center",
  },
  imageIndexText: { color: COLORS.white, fontSize: 10, fontWeight: FONT_WEIGHTS.bold },
  addMoreBtn: {
    width: 100, height: 100, borderRadius: RADIUS.md,
    borderWidth: 2, borderStyle: "dashed", borderColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    justifyContent: "center", alignItems: "center",
  },
  imageOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: RADIUS.md,
  },
  imageOverlayText: { fontSize: 20, color: COLORS.white },

  addMoreIcon: { fontSize: 28, color: COLORS.gray300 },
  addMoreText: { fontSize: FONT_SIZES.xs, color: COLORS.gray300, marginTop: 2 },

  // Label
  label: { fontSize: FONT_SIZES.sm + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy, marginBottom: SPACING.sm, marginTop: SPACING.sm },

  // Ders seçimi
  selectBtn: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 2,
    borderColor: COLORS.gray100, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md - 2,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  selectText: { fontSize: FONT_SIZES.md, color: COLORS.navy, fontWeight: FONT_WEIGHTS.semibold },
  selectPlaceholder: { fontSize: FONT_SIZES.md, color: COLORS.gray300 },
  selectArrow: { fontSize: 12, color: COLORS.gray300 },
  courseList: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.gray100, marginTop: SPACING.xs, overflow: "hidden",
  },
  courseOption: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  courseOptionActive: { backgroundColor: COLORS.accentLight },
  courseDot: { width: 10, height: 10, borderRadius: 5 },
  courseOptionText: { fontSize: FONT_SIZES.md, color: COLORS.navy },

  // Durum
  statusRow: { flexDirection: "row", gap: SPACING.sm },
  statusBtn: {
    flex: 1, paddingVertical: SPACING.md - 2, borderRadius: RADIUS.md,
    borderWidth: 2, borderColor: COLORS.gray100, backgroundColor: COLORS.white, alignItems: "center",
  },
  statusBtnText: { fontSize: FONT_SIZES.xs + 1, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.navy },

  // Etiketler
  tagsContainer: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 2,
    borderColor: COLORS.gray100, paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.sm,
    flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACING.sm,
  },
  tagChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.accentLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm + 2,
  },
  tagChipText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.accent },
  tagRemove: { fontSize: 12, color: COLORS.accent, opacity: 0.5 },
  tagInput: { fontSize: FONT_SIZES.sm + 1, color: COLORS.navy, minWidth: 100, paddingVertical: 4 },
  suggestionsRow: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.xs },
  suggestionChip: { backgroundColor: COLORS.gray100, paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm },
  suggestionText: { fontSize: FONT_SIZES.sm, color: COLORS.gray400 },

  // Not
  noteInput: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 2,
    borderColor: COLORS.gray100, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.sm + 1, color: COLORS.navy, minHeight: 60, textAlignVertical: "top",
  },

  // Çoklu bilgi
  multiInfo: {
    backgroundColor: COLORS.accentLight, borderRadius: RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm,
  },
  multiInfoText: { fontSize: FONT_SIZES.sm, color: COLORS.accent, lineHeight: 18 },

  // Kaydet
  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md, alignItems: "center", marginTop: SPACING.lg,
  },
  saveBtnText: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold },
})