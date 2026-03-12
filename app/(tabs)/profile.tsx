import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from '../../constants';
import { useAuthStore } from '../../store/authStore';

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();
  return (
    <View style={styles.container}>
      <Text style={styles.text}>👤 {profile?.name || 'Profil'}</Text>
      <Text style={styles.sub}>{profile?.mode || ''}</Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
        <Text style={styles.logoutText}>Çıkış Yap</Text>
      </TouchableOpacity>
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  sub: { fontSize: FONT_SIZES.md, color: COLORS.gray400, marginTop: 8 },
  logoutBtn: { marginTop: SPACING.lg, backgroundColor: COLORS.red, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm + 4, borderRadius: RADIUS.md },
  logoutText: { color: COLORS.white, fontWeight: FONT_WEIGHTS.bold },
});