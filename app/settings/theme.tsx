import { useRouter } from "expo-router"
import { StyleSheet, Text, TouchableOpacity, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from "../../constants"

export default function ThemeSettings() {
  const router = useRouter()

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tema Ayarları</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎨</Text>
          <Text style={styles.title}>Yakında yeni temalar gelecek!</Text>
          <Text style={styles.sub}>
            Karanlık mod, farklı renk paletleri ve daha fazlası üzerinde çalışıyoruz.
          </Text>
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
    padding: SPACING.xl, alignItems: "center",
  },
  emoji: { fontSize: 48, marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy, textAlign: "center" },
  sub: { fontSize: FONT_SIZES.sm + 1, color: COLORS.gray400, textAlign: "center", marginTop: SPACING.sm, lineHeight: 20 },
})