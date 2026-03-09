import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '../../constants';

export default function LoginScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏥</Text>
      <Text style={styles.title}>MedBank</Text>
      <Text style={styles.subtitle}>TUS & DUS Soru Arşivi</Text>
      <TouchableOpacity style={styles.btn} onPress={() => router.push('/(auth)/register')}>
        <Text style={styles.btnText}>Kayıt Ol →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.navy, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  logo: { fontSize: 64, marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZES.hero, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.white },
  subtitle: { fontSize: FONT_SIZES.md, color: COLORS.gray300, marginTop: SPACING.xs },
  btn: { marginTop: SPACING.xl, backgroundColor: COLORS.accent, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 4, borderRadius: 12 },
  btnText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold, fontSize: FONT_SIZES.md },
});