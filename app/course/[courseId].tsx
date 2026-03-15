import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  FlatList,
  Image,
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

type Question = {
  id: string
  course_id: string
  image_url: string
  status: "failed" | "skipped" | "solved"
  is_favorite: boolean
  note: string | null
  uploaded_at: string
}

type Course = {
  id: string
  name: string
  color_code: string
}

type FilterId = "all" | "favorite" | "failed" | "skipped" | "solved"

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Tümü" },
  { id: "favorite", label: "⭐ Favoriler" },
  { id: "failed", label: "🔴 Yanlış" },
  { id: "skipped", label: "🟡 Boş" },
  { id: "solved", label: "🟢 Doğru" },
]

export default function CourseScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>()
  const router = useRouter()
  const { profile } = useAuthStore()

  const [course, setCourse] = useState<Course | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeFilters, setActiveFilters] = useState<FilterId[]>(["all"])
  const [loading, setLoading] = useState(true)
  const [searchMode, setSearchMode] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [searchResults, setSearchResults] = useState<string[]>([])
  
  useEffect(() => {
    if (courseId) {
      loadData()
    }
  }, [courseId])

  const loadData = async () => {
    setLoading(true)

    // Ders bilgisini çek
    const { data: courseData } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single()

    if (courseData) setCourse(courseData)

    // Soruları çek
    const { data: questionData } = await supabase
      .from("questions")
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", profile?.id)
      .order("uploaded_at", { ascending: false })

    if (questionData) setQuestions(questionData)

    setLoading(false)
  }

  const toggleFilter = (filterId: FilterId) => {
    if (filterId === "all") {
      setActiveFilters(["all"])
      return
    }

    let next = activeFilters.filter((f) => f !== "all")

    if (next.includes(filterId)) {
      next = next.filter((f) => f !== filterId)
    } else {
      next.push(filterId)
    }

    setActiveFilters(next.length === 0 ? ["all"] : next)
  }

  // Filtreleme + arama uygula
  const filteredQuestions = questions.filter((q) => {
    // Etiket araması aktifse
    if (searchMode && searchText.length > 0) {
      if (searchResults.length === 0) return false
      if (!searchResults.includes(q.id)) return false
    }

    // Normal filtreler
    if (activeFilters.includes("all")) return true
    return activeFilters.some((f) => {
      if (f === "favorite") return q.is_favorite
      return q.status === f
    })
  })

  const getFilterCount = (filterId: FilterId): number => {
    if (filterId === "all") return questions.length
    if (filterId === "favorite") return questions.filter((q) => q.is_favorite).length
    return questions.filter((q) => q.status === filterId).length
  }
  // Etiketle arama
  const handleSearch = async (text: string) => {
    setSearchText(text)
    if (text.length < 1) {
      setSearchResults([])
      return
    }

    // Bu dersteki eşleşen etiketleri bul
    const { data: tagData } = await supabase
      .from("tags")
      .select("id, name")
      .eq("user_id", profile?.id)
      .eq("course_id", courseId)
      .ilike("name", `%${text}%`)

    if (tagData && tagData.length > 0) {
      const tagIds = tagData.map((t: any) => t.id)

      // Bu etiketlere sahip soruları bul
      const { data: questionTagData } = await supabase
        .from("question_tags")
        .select("question_id")
        .in("tag_id", tagIds)

      if (questionTagData) {
        const questionIds = [...new Set(questionTagData.map((qt: any) => qt.question_id))]
        setSearchResults(questionIds)
      }
    } else {
      setSearchResults([])
    }
  }

  const clearSearch = () => {
    setSearchMode(false)
    setSearchText("")
    setSearchResults([])
  }

  const handleToggleFavorite = async (questionId: string, currentFav: boolean) => {
    await supabase
      .from("questions")
      .update({ is_favorite: !currentFav })
      .eq("id", questionId)

    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, is_favorite: !currentFav } : q
      )
    )
  }

  const formatDate = (dateStr: string): string => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)
    

    if (diffMin < 60) return `${diffMin}dk önce`
    if (diffHour < 24) return `${diffHour}s önce`
    if (diffDay < 7) return `${diffDay}g önce`
    return date.toLocaleDateString("tr-TR")
  }

  const renderQuestion = ({ item }: { item: Question }) => {
    const statusColor = STATUS_COLORS[item.status]

    return (
      <TouchableOpacity
        style={[styles.questionCard, { borderLeftColor: statusColor.main }]}
        activeOpacity={0.7}
        onPress={() => router.push(`/question/${item.id}` as any)}
      >
        {/* Üst satır: durum + tarih + favori */}
        <View style={styles.questionHeader}>
          <View style={styles.statusRow}>
            <Text style={{ fontSize: 12 }}>{statusColor.icon}</Text>
            <Text style={[styles.statusLabel, { color: statusColor.main }]}>
              {statusColor.label}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.dateText}>{formatDate(item.uploaded_at)}</Text>
            <TouchableOpacity
              onPress={() => handleToggleFavorite(item.id, item.is_favorite)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={{ fontSize: 18, opacity: item.is_favorite ? 1 : 0.25 }}>
                ⭐
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Soru görseli */}
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.questionImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={{ fontSize: 24, opacity: 0.3 }}>📄</Text>
          </View>
        )}

        {/* Not */}
        {item.note ? (
          <Text style={styles.noteText} numberOfLines={2}>
            💬 {item.note}
          </Text>
        ) : null}
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      {/* Header */}
      <View style={styles.header}>
        {searchMode ? (
          <View style={styles.searchHeader}>
            <TouchableOpacity onPress={clearSearch} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Etiket ara..."
              placeholderTextColor={COLORS.gray300}
              value={searchText}
              onChangeText={handleSearch}
              autoFocus
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Text style={{ color: COLORS.gray300, fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {course?.name || "Yükleniyor..."}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
              <TouchableOpacity onPress={() => setSearchMode(true)} style={styles.searchBtn}>
                <Text style={{ fontSize: 16 }}>🔍</Text>
              </TouchableOpacity>
              <Text style={styles.headerCount}>{questions.length} soru</Text>
            </View>
          </>
        )}
      </View>

      {/* Filtre barı */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const isActive = activeFilters.includes(f.id)
            const count = getFilterCount(f.id)
            return (
              <TouchableOpacity
                key={f.id}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => toggleFilter(f.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {f.label} ({count})
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Arama sonucu bilgisi */}
      {searchMode && searchText.length > 0 && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            🏷️ "{searchText}" etiketinde {filteredQuestions.length} soru bulundu
          </Text>
        </View>
      )}

      {/* Soru listesi */}
      <FlatList
        data={filteredQuestions}
        keyExtractor={(item) => item.id}
        renderItem={renderQuestion}
        contentContainerStyle={styles.list}
        style={{ backgroundColor: COLORS.background }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>
              {loading
                ? "Yükleniyor..."
                : activeFilters.includes("all")
                ? "Bu derste henüz soru yok"
                : "Bu filtreye uygun soru yok"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // Header
  header: {
    backgroundColor: COLORS.navy,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
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
    flex: 1,
  },
  headerCount: {
    color: COLORS.white,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    opacity: 0.8,
  },
  // Arama
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: FONT_SIZES.lg,
    paddingVertical: 4,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  searchInfo: {
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  searchInfoText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.accent,
    fontWeight: FONT_WEIGHTS.semibold,
  },

  filterContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.xl,
    borderWidth: 2,
    borderColor: COLORS.gray100,
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    borderColor: COLORS.navy,
    backgroundColor: COLORS.navy,
  },
  filterChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.gray400,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },

  // Soru listesi
  list: {
    padding: SPACING.md,
    paddingBottom: 100,
  },

  // Soru kartı
  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
    borderLeftWidth: 4,
    shadowColor: COLORS.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusLabel: {
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: FONT_WEIGHTS.bold,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  dateText: {
    fontSize: FONT_SIZES.xs + 1,
    color: COLORS.gray300,
  },

  questionImage: {
    width: "100%",
    height: 80,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.gray100,
    marginBottom: SPACING.sm,
  },
  imagePlaceholder: {
    width: "100%",
    height: 80,
    borderRadius: RADIUS.sm + 2,
    backgroundColor: COLORS.offWhite,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },

  noteText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
    lineHeight: 18,
  },

  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: FONT_SIZES.md,
    color: COLORS.gray400,
    textAlign: "center",
  },
})
