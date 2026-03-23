import { useRouter } from "expo-router"
import { useState } from "react"
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from "../../constants"

export default function NotificationSettings() {
  const router = useRouter()

  const [spacedRepetition, setSpacedRepetition] = useState(true)
  const [dailyReminder, setDailyReminder] = useState(false)
  const [weeklyReport, setWeeklyReport] = useState(true)

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {/* Spaced Repetition */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔔 Tekrar Hatırlatmaları</Text>
          <Text style={styles.cardDesc}>
            Favori sorularını belirli aralıklarla hatırlat. Aralıklar: 1. gün → 2. gün → 7. gün → 30. gün
          </Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Spaced Repetition</Text>
            <Switch
              value={spacedRepetition}
              onValueChange={setSpacedRepetition}
              trackColor={{ false: COLORS.gray200, true: COLORS.accent }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        {/* Haftalık rapor */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Haftalık Rapor</Text>
          <Text style={styles.cardDesc}>
            Her hafta başında ilerleme raporunu bildirim olarak al.
          </Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Haftalık özet</Text>
            <Switch
              value={weeklyReport}
              onValueChange={setWeeklyReport}
              trackColor={{ false: COLORS.gray200, true: COLORS.accent }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        <Text style={styles.note}>
          Bildirimler şu an geliştirme aşamasında. Ayarlar kaydedilecek ancak bildirimler yakında aktif olacak.
        </Text>
      </View>
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
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  backArrow: { color: COLORS.white, fontSize: 24, fontWeight: FONT_WEIGHTS.bold, marginTop: -2 },
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold },
  content: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.md },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm + 2,
  },
  cardTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy, marginBottom: 4 },
  cardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, lineHeight: 18, marginBottom: SPACING.sm },
  toggleRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.gray100,
  },
  toggleLabel: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.navy },
  note: {
    fontSize: FONT_SIZES.sm, color: COLORS.gray300, textAlign: "center",
    marginTop: SPACING.md, lineHeight: 18, paddingHorizontal: SPACING.md,
  },
})