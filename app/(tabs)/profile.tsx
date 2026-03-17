import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  ScrollView,
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
  SPACING
} from "../../constants"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"
import { useQuestionStore } from "../../store/questionStore"

interface WeeklyStats {
  totalUploaded: number
  totalFailed: number
  totalSkipped: number
  totalSolved: number
  totalFavorited: number
  previousWeekUploaded: number
  topCourse: string | null
  leastCourse: string | null
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore()
  const router = useRouter()
  const { refreshCounter } = useQuestionStore()
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [topCourseName, setTopCourseName] = useState("")
  const [reportExpanded, setReportExpanded] = useState(false)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

 useEffect(() => {
    if (profile) {
      loadStats()
      loadWeeklyStats()
    }
  }, [profile, refreshCounter])

  const loadStats = async () => {
    if (!profile) return

    const { count: qCount } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)

    setTotalQuestions(qCount || 0)

    // En çok soru yüklenen ders
    const { data: questions } = await supabase
      .from("questions")
      .select("course_id")
      .eq("user_id", profile.id)

    if (questions && questions.length > 0) {
      const counts: Record<string, number> = {}
      questions.forEach((q) => { counts[q.course_id] = (counts[q.course_id] || 0) + 1 })
      const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
      const { data: course } = await supabase.from("courses").select("name").eq("id", topId).single()
      if (course) setTopCourseName(course.name)
    }
  }

  const loadWeeklyStats = async () => {
    if (!profile) return
    setLoadingStats(true)

    // Bu haftanın başlangıcı (Pazartesi)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    monday.setHours(0, 0, 0, 0)

    // Geçen haftanın başlangıcı
    const lastMonday = new Date(monday)
    lastMonday.setDate(monday.getDate() - 7)

    const mondayStr = monday.toISOString()
    const lastMondayStr = lastMonday.toISOString()

    // Bu hafta yüklenen sorular
    const { data: thisWeekQuestions } = await supabase
      .from("questions")
      .select("status, is_favorite, course_id")
      .eq("user_id", profile.id)
      .gte("uploaded_at", mondayStr)

    // Geçen hafta yüklenen sorular
    const { count: prevCount } = await supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte("uploaded_at", lastMondayStr)
      .lt("uploaded_at", mondayStr)

    if (thisWeekQuestions) {
      const totalUploaded = thisWeekQuestions.length
      const totalFailed = thisWeekQuestions.filter((q) => q.status === "failed").length
      const totalSkipped = thisWeekQuestions.filter((q) => q.status === "skipped").length
      const totalSolved = thisWeekQuestions.filter((q) => q.status === "solved").length
      const totalFavorited = thisWeekQuestions.filter((q) => q.is_favorite).length

      // En çok/az soru yüklenen ders
      const courseCount: Record<string, number> = {}
      thisWeekQuestions.forEach((q) => {
        courseCount[q.course_id] = (courseCount[q.course_id] || 0) + 1
      })

      let topCourseId: string | null = null
      let leastCourseId: string | null = null
      let maxCount = 0
      let minCount = Infinity

      Object.entries(courseCount).forEach(([id, count]) => {
        if (count > maxCount) { maxCount = count; topCourseId = id }
        if (count < minCount) { minCount = count; leastCourseId = id }
      })

      // Ders isimlerini çek
      let topCourseName: string | null = null
      let leastCourseName: string | null = null

      if (topCourseId) {
        const { data } = await supabase.from("courses").select("name").eq("id", topCourseId).single()
        if (data) topCourseName = `${data.name} (${maxCount} soru)`
      }
      if (leastCourseId && leastCourseId !== topCourseId) {
        const { data } = await supabase.from("courses").select("name").eq("id", leastCourseId).single()
        if (data) leastCourseName = `${data.name} (${minCount} soru)`
      }

      setWeeklyStats({
        totalUploaded,
        totalFailed,
        totalSkipped,
        totalSolved,
        totalFavorited,
        previousWeekUploaded: prevCount || 0,
        topCourse: topCourseName,
        leastCourse: leastCourseName,
      })
    }

    setLoadingStats(false)
  }

  // Haftalık değişim yüzdesi
  const getChangePercent = (): { text: string; positive: boolean } | null => {
    if (!weeklyStats || weeklyStats.previousWeekUploaded === 0) return null
    const change = Math.round(
      ((weeklyStats.totalUploaded - weeklyStats.previousWeekUploaded) /
        weeklyStats.previousWeekUploaded) *
        100
    )
    return {
      text: change >= 0 ? `↑ %${change}` : `↓ %${Math.abs(change)}`,
      positive: change >= 0,
    }
  }

  // Hafta tarih aralığı
  const getWeekRange = (): string => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)

    const format = (d: Date) =>
      d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })

    return `${format(monday)} - ${format(sunday)}`
  }

  const changePercent = getChangePercent()

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Kullanıcı kartı */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.name?.charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{profile?.name || "Kullanıcı"}</Text>
            <Text style={styles.userMeta}>
              {profile?.mode || ""}
              {profile?.university ? ` • ${profile.university}` : ""}
              {profile?.attempt_number ? ` • ${profile.attempt_number}. kez` : ""}
            </Text>
          </View>
          {/* TODO: Streak sistemi buraya gelecek */}
        </View>

        {/* Streak placeholder — sonra eklenecek */}
        {/* 
        <View style={styles.streakCard}>
          <Text>🔥 Streak</Text>
        </View>
        */}

        {/* Haftalık Rapor — expand/collapse */}
        <TouchableOpacity
          style={styles.reportCard}
          onPress={() => setReportExpanded(!reportExpanded)}
          activeOpacity={0.7}
        >
          <View style={styles.reportHeader}>
            <View>
              <Text style={styles.reportTitle}>📋 Haftalık Rapor</Text>
              <Text style={styles.reportDate}>{getWeekRange()}</Text>
            </View>
            <View style={styles.reportHeaderRight}>
              {changePercent && (
                <View
                  style={[
                    styles.changeBadge,
                    { backgroundColor: changePercent.positive ? COLORS.greenLight : COLORS.redLight },
                  ]}
                >
                  <Text
                    style={[
                      styles.changeBadgeText,
                      { color: changePercent.positive ? COLORS.green : COLORS.red },
                    ]}
                  >
                    {changePercent.text}
                  </Text>
                </View>
              )}
              <Text style={styles.expandArrow}>{reportExpanded ? "▲" : "▼"}</Text>
            </View>
          </View>

          {reportExpanded && weeklyStats && (
            <View style={styles.reportBody}>
              {/* Ana sayılar */}
              <View style={styles.statsRow}>
                {[
                  { label: "Yüklenen", value: weeklyStats.totalUploaded, color: COLORS.accent },
                  { label: "Yanlış", value: weeklyStats.totalFailed, color: COLORS.red },
                  { label: "Boş", value: weeklyStats.totalSkipped, color: COLORS.yellow },
                  { label: "Doğru", value: weeklyStats.totalSolved, color: COLORS.green },
                ].map((s, i) => (
                  <View key={i} style={styles.statItem}>
                    <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Karşılaştırma */}
              <View style={styles.comparisonBox}>
                <Text style={styles.comparisonTitle}>Geçen haftayla karşılaştırma</Text>
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonLabel}>Bu hafta</Text>
                  <Text style={[styles.comparisonValue, { color: COLORS.accent }]}>
                    {weeklyStats.totalUploaded} soru
                  </Text>
                </View>
                <View style={styles.comparisonRow}>
                  <Text style={styles.comparisonLabel}>Geçen hafta</Text>
                  <Text style={styles.comparisonValue}>
                    {weeklyStats.previousWeekUploaded} soru
                  </Text>
                </View>
              </View>

              {/* Ders bilgileri */}
              <View style={styles.courseStats}>
                {weeklyStats.topCourse && (
                  <Text style={styles.courseStatText}>
                    📈 En çok: <Text style={styles.courseStatBold}>{weeklyStats.topCourse}</Text>
                  </Text>
                )}
                {weeklyStats.leastCourse && (
                  <Text style={styles.courseStatText}>
                    📉 En az: <Text style={styles.courseStatBold}>{weeklyStats.leastCourse}</Text>
                  </Text>
                )}
                <Text style={styles.courseStatText}>
                  ⭐ Favorilere eklenen: <Text style={styles.courseStatBold}>{weeklyStats.totalFavorited} soru</Text>
                </Text>
              </View>
            </View>
          )}

          {reportExpanded && !weeklyStats && !loadingStats && (
            <Text style={styles.noDataText}>Bu hafta henüz veri yok</Text>
          )}

          {reportExpanded && loadingStats && (
            <Text style={styles.noDataText}>Yükleniyor...</Text>
          )}
        </TouchableOpacity>

      <View style={styles.overviewRow}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>📚</Text>
            <Text style={styles.overviewValue}>{totalQuestions}</Text>
            <Text style={styles.overviewLabel}>Toplam Arşiv</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewIcon}>🏆</Text>
            <Text style={styles.overviewValue} numberOfLines={1}>{topCourseName || "-"}</Text>
            <Text style={styles.overviewLabel}>En Çok Yüklenen</Text>
          </View>
        </View>

        {/* Ayarlar */}
        <View style={styles.settingsCard}>
          {[
            { icon: "🔔", label: "Bildirim Ayarları", action: () => router.push("/settings/notifications" as any) },
            { icon: "🎨", label: "Tema Ayarları", action: () => router.push("/settings/theme" as any) },
            { icon: "❓", label: "Yardım & Destek", action: () => router.push("/settings/support" as any) },
            { icon: "🚪", label: "Çıkış Yap", action: signOut, isRed: true },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.settingsRow, i < 3 && styles.settingsRowBorder]}
              onPress={item.action}
            >
              <Text style={styles.settingsIcon}>{item.icon}</Text>
              <Text
                style={[
                  styles.settingsLabel,
                  (item as any).isRed && { color: COLORS.red },
                ]}
              >
                {item.label}
              </Text>
              <Text style={styles.settingsArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
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
    paddingBottom: 100,
  },

  // Kullanıcı kartı
  userCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: COLORS.navy,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: COLORS.white,
    fontSize: FONT_SIZES.xxl,
    fontWeight: FONT_WEIGHTS.extrabold,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONT_SIZES.xl - 2,
    fontWeight: FONT_WEIGHTS.extrabold,
    color: COLORS.navy,
  },
  userMeta: {
    fontSize: FONT_SIZES.sm + 1,
    color: COLORS.gray400,
    marginTop: 2,
  },

  // Haftalık Rapor
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.extrabold,
    color: COLORS.navy,
  },
  reportDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray300,
    marginTop: 4,
  },
  reportHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  changeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  changeBadgeText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: FONT_WEIGHTS.bold,
  },
  expandArrow: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  reportBody: {
    marginTop: SPACING.md,
  },
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: FONT_SIZES.xxl - 2,
    fontWeight: FONT_WEIGHTS.extrabold,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  comparisonBox: {
    backgroundColor: COLORS.offWhite,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  comparisonTitle: {
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.navy,
    marginBottom: SPACING.sm,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  comparisonLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
  },
  comparisonValue: {
    fontSize: FONT_SIZES.sm + 1,
    fontWeight: FONT_WEIGHTS.bold,
    color: COLORS.gray400,
  },
  courseStats: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    paddingTop: SPACING.sm,
    gap: 6,
  },
  courseStatText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.gray400,
  },
  courseStatBold: {
    color: COLORS.navy,
    fontWeight: FONT_WEIGHTS.bold,
  },
  noDataText: {
    textAlign: "center",
    color: COLORS.gray300,
    fontSize: FONT_SIZES.sm,
    marginTop: SPACING.md,
  },

  // Genel Bakış
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.extrabold,
    color: COLORS.navy,
    marginBottom: SPACING.sm,
  },
  overviewRow: {
    flexDirection: "row",
    gap: SPACING.sm + 2,
    marginBottom: SPACING.md,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: "center",
    ...SHADOWS.small,
  },
  overviewIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.extrabold,
    color: COLORS.navy,
  },
  overviewLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.gray400,
    fontWeight: FONT_WEIGHTS.semibold,
    marginTop: 2,
  },

  // Ayarlar
  settingsCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    ...SHADOWS.small,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: SPACING.sm + 4,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  settingsIcon: {
    fontSize: 18,
  },
  settingsLabel: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.navy,
  },
  settingsArrow: {
    fontSize: 20,
    color: COLORS.gray300,
  },
})