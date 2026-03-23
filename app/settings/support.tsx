import { useRouter } from "expo-router"
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from "../../constants"

export default function SupportScreen() {
  const router = useRouter()

  const handleEmail = () => {
    Linking.openURL("mailto:destek@medbank.app?subject=MedBank%20Destek%20Talebi")
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yardım & Destek</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.emoji}>💬</Text>
          <Text style={styles.title}>Bize Ulaş</Text>
          <Text style={styles.desc}>
            Sorun mu yaşıyorsun? Bir önerim mi var?{"\n"}Bize e-posta gönder, en kısa sürede döneceğiz.
          </Text>

          <TouchableOpacity style={styles.emailBtn} onPress={handleEmail}>
            <Text style={styles.emailBtnText}>📧 E-posta Gönder</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
        </View>
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
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl,
    padding: SPACING.lg, marginBottom: SPACING.md, alignItems: "center",
  },
  emoji: { fontSize: 48, marginBottom: SPACING.sm },
  title: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  desc: { fontSize: FONT_SIZES.sm + 1, color: COLORS.gray400, textAlign: "center", marginTop: SPACING.sm, lineHeight: 20 },
  emailBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 4, marginTop: SPACING.lg,
  },
  emailBtnText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md },
  cardTitle: {
    fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy,
    alignSelf: "flex-start", marginBottom: SPACING.md,
  },
  faqItem: { paddingVertical: SPACING.sm + 2, width: "100%" },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.gray100 },
  faqQ: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy, marginBottom: 4 },
  faqA: { fontSize: FONT_SIZES.sm + 1, color: COLORS.gray400, lineHeight: 18 },
})