import { useEffect, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  RADIUS,
  SHADOWS,
  SPACING
} from "../../constants"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"

type CourseStats = {
  courseId: string
  courseName: string
  colorCode: string
  count: number
}

export default function CommunityScreen() {
  const { profile } = useAuthStore()

  const [courseStats, setCourseStats] = useState<CourseStats[]>([])
  const [totalUploads, setTotalUploads] = useState(0)
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) loadStats()
  }, [profile])

  const loadStats = async () => {
    if (!profile) return
    setLoading(true)

    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)
    const mondayStr = monday.toISOString()

    const { data: courses } = await supabase
      .from("courses")
      .select("id, name, color_code")
      .eq("mode", profile.mode)
      .order("sort_order")

    if (!courses) { setLoading(false); return }

    // Bu hafta her dersten kaç soru yüklendi (tüm kullanıcılar)
    const stats: CourseStats[] = await Promise.all(
      courses.map(async (course) => {
        const { count } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("course_id", course.id)
          .gte("uploaded_at", mondayStr)

        return {
          courseId: course.id,
          courseName: course.name,
          colorCode: course.color_code,
          count: count || 0,
        }
      })
    )

    stats.sort((a, b) => b.count - a.count)
    setCourseStats(stats)

    const total = stats.reduce((sum, s) => sum + s.count, 0)
    setTotalUploads(total)

    const courseIds = courses.map((c: any) => c.id)

    const { data: activeUsers } = await supabase
      .from("questions")
      .select("user_id")
      .in("course_id", courseIds)
      .gte("uploaded_at", mondayStr)

    if (activeUsers) {
      const uniqueUsers = new Set(activeUsers.map((q: any) => q.user_id))
      setTotalUsers(uniqueUsers.size)
    }

    setLoading(false)
  }

  const topCourse = courseStats.length > 0 ? courseStats[0] : null
  const leastCourse = courseStats.length > 0
    ? courseStats.filter((c) => c.count > 0).slice(-1)[0] || null
    : null

  const getWeekRange = (): string => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const format = (d: Date) => d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
    return `${format(monday)} - ${format(sunday)}`
  }

  const getMedalColor = (index: number): string => {
    if (index === 0) return "#FFD700"
    if (index === 1) return "#C0C0C0"
    if (index === 2) return "#CD7F32"
    return COLORS.gray200
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Topluluk</Text>
        <View style={styles.modeBadge}>
          <Text style={styles.modeBadgeText}>{profile?.mode || ""}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Açıklama */}
        <Text style={styles.description}>
          Bu hafta tüm {profile?.mode} kullanıcılarının istatistikleri 👇
        </Text>
        <Text style={styles.weekRange}>{getWeekRange()}</Text>

        {/* Özet kartları */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalUploads}</Text>
            <Text style={styles.summaryLabel}>Toplam Soru</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{totalUsers}</Text>
            <Text style={styles.summaryLabel}>Aktif Kullanıcı</Text>
          </View>
        </View>

        {loading ? (
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        ) : (
          <>
            {/* En çok yüklenen */}
            {topCourse && topCourse.count > 0 && (
              <View style={styles.highlightCard}>
                <Text style={styles.highlightEmoji}>🏆</Text>
                <View style={styles.highlightInfo}>
                  <Text style={styles.highlightLabel}>En Çok Soru Yüklenen Ders</Text>
                  <Text style={styles.highlightName}>{topCourse.courseName}</Text>
                  <Text style={styles.highlightCount}>{topCourse.count} soru bu hafta</Text>
                </View>
              </View>
            )}

            {/* En az yüklenen */}
            {leastCourse && leastCourse.courseId !== topCourse?.courseId && (
              <View style={styles.highlightCardMuted}>
                <Text style={styles.highlightEmoji}>📉</Text>
                <View style={styles.highlightInfo}>
                  <Text style={styles.highlightLabel}>En Az Soru Yüklenen Ders</Text>
                  <Text style={styles.highlightName}>{leastCourse.courseName}</Text>
                  <Text style={styles.highlightCountMuted}>{leastCourse.count} soru bu hafta</Text>
                </View>
              </View>
            )}

            {/* Ders Sıralaması */}
            <Text style={styles.sectionTitle}>Ders Sıralaması</Text>

            {courseStats.map((item, index) => (
              <View key={item.courseId} style={styles.rankCard}>
                <View style={[styles.rankBadge, { backgroundColor: getMedalColor(index) }]}>
                  <Text style={[
                    styles.rankNumber,
                    { color: index < 3 ? COLORS.white : COLORS.gray400 }
                  ]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.rankInfo}>
                  <Text style={styles.rankName} numberOfLines={1}>{item.courseName}</Text>
                  {/* Mini bar */}
                  <View style={styles.miniBarBg}>
                    <View style={[
                      styles.miniBarFill,
                      {
                        backgroundColor: item.colorCode,
                        width: totalUploads > 0
                          ? `${Math.max((item.count / (topCourse?.count || 1)) * 100, 2)}%`
                          : "2%",
                      }
                    ]} />
                  </View>
                </View>
                <Text style={styles.rankCount}>{item.count}</Text>
              </View>
            ))}

            {/* Veri yoksa */}
            {totalUploads === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyText}>
                  Bu hafta henüz soru yüklenmemiş.{"\n"}İlk yükleyen sen ol!
                </Text>
              </View>
            )}

            {/* Gizlilik notu */}
            <View style={styles.privacyNote}>
              <Text style={styles.privacyText}>
                🔒 Bireysel sorular kesinlikle görünmez. Sadece anonim istatistikler gösterilir.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
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
  modeBadge: {
    backgroundColor: "rgba(79,140,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  modeBadgeText: { color: COLORS.accent, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },

  content: { flex: 1, backgroundColor: COLORS.background },
  contentInner: { padding: SPACING.md, paddingBottom: 100 },

  description: {
    fontSize: FONT_SIZES.sm + 1,
    color: COLORS.gray400,
    lineHeight: 20,
    marginBottom: 2,
  },
  weekRange: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray300,
    marginBottom: SPACING.md,
  },

  // Özet kartları
  summaryRow: { flexDirection: "row", gap: SPACING.sm + 2, marginBottom: SPACING.md },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    ...SHADOWS.small,
  },
  summaryValue: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.navy },
  summaryLabel: { fontSize: FONT_SIZES.xs, color: COLORS.gray400, fontWeight: FONT_WEIGHTS.semibold, marginTop: 2 },

  // Highlight kartları
  highlightCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOWS.small,
  },
  highlightCardMuted: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOWS.small,
  },
  highlightEmoji: { fontSize: 36 },
  highlightInfo: { flex: 1 },
  highlightLabel: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, fontWeight: FONT_WEIGHTS.semibold },
  highlightName: { fontSize: FONT_SIZES.xl - 2, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.navy, marginTop: 2 },
  highlightCount: { fontSize: FONT_SIZES.sm + 1, color: COLORS.accent, fontWeight: FONT_WEIGHTS.semibold, marginTop: 2 },
  highlightCountMuted: { fontSize: FONT_SIZES.sm + 1, color: COLORS.gray300, fontWeight: FONT_WEIGHTS.semibold, marginTop: 2 },

  // Sıralama
  sectionTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.navy, marginBottom: SPACING.sm },
  rankCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md - 2,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm + 2,
    ...SHADOWS.small,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rankNumber: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.extrabold },
  rankInfo: { flex: 1 },
  rankName: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy, marginBottom: 4 },
  miniBarBg: { height: 6, borderRadius: 3, backgroundColor: COLORS.gray100, overflow: "hidden" },
  miniBarFill: { height: "100%", borderRadius: 3 },
  rankCount: { fontSize: FONT_SIZES.sm + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.accent, minWidth: 30, textAlign: "right" },

  // Boş durum
  emptyContainer: { alignItems: "center", paddingTop: 40 },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyText: { fontSize: FONT_SIZES.md, color: COLORS.gray400, textAlign: "center", lineHeight: 22 },

  // Gizlilik notu
  privacyNote: {
    backgroundColor: COLORS.offWhite,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md,
  },
  privacyText: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, lineHeight: 18, textAlign: "center" },

  loadingText: { textAlign: "center", color: COLORS.gray400, marginTop: 40 },
})