import { useLocalSearchParams, useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
  FlatList,
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
  SHADOWS,
  SPACING
} from "../../constants"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"

type Member = {
  id: string
  user_id: string
  name: string
  username: string
  role: "admin" | "member"
}

type GroupInfo = {
  id: string
  name: string
  created_by: string
}

const MAX_MEMBERS = 5

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>()
  const router = useRouter()
  const { profile } = useAuthStore()

  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [searchUsername, setSearchUsername] = useState("")
  const [searching, setSearching] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => { loadGroup() }, [])

  const loadGroup = async () => {
    if (!groupId || !profile) return

    const { data: groupData } = await supabase
      .from("groups")
      .select("id, name, created_by")
      .eq("id", groupId)
      .single()

    if (groupData) setGroup(groupData)

    const { data: membersData } = await supabase
      .from("group_members")
      .select("id, user_id, role")
      .eq("group_id", groupId)

    if (membersData) {
      const userIds = membersData.map(m => m.user_id)
      const { data: usersData } = await supabase
        .from("users")
        .select("id, name, username")
        .in("id", userIds)

      const enriched = membersData.map(m => {
        const user = usersData?.find(u => u.id === m.user_id)
        return {
          id: m.id,
          user_id: m.user_id,
          name: user?.name || "",
          username: user?.username || "",
          role: m.role as "admin" | "member",
        }
      })

      setMembers(enriched)
      setIsAdmin(enriched.some(m => m.user_id === profile.id && m.role === "admin"))
    }
  }

  const addMember = async () => {
    if (!searchUsername.trim() || !groupId || !profile) return

    if (members.length >= MAX_MEMBERS) {
      Alert.alert("Limit", `Bir grupta en fazla ${MAX_MEMBERS} kişi olabilir.`)
      return
    }

    setSearching(true)

    // Kullanıcıyı bul
    const { data: userData } = await supabase
      .from("users")
      .select("id, name, username, is_premium")
      .eq("username", searchUsername.trim().toLowerCase())
      .single()

    if (!userData) {
      Alert.alert("Bulunamadı", "Bu kullanıcı adına sahip biri yok.")
      setSearching(false)
      return
    }

    // Premium kontrolü
    if (!userData.is_premium) {
      Alert.alert("Premium Gerekli", "Bu kişi premium üye değil. Gruba eklenebilmesi için premium olması gerekiyor.")
      setSearching(false)
      return
    }

    // Zaten üye mi?
    if (members.some(m => m.user_id === userData.id)) {
      Alert.alert("Zaten Üye", "Bu kişi zaten grupta.")
      setSearching(false)
      return
    }

    // Ekle
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userData.id, role: "member" })

    if (error) {
      Alert.alert("Hata", error.message)
    } else {
      setSearchUsername("")
      loadGroup()
    }

    setSearching(false)
  }

  const removeMember = (member: Member) => {
    if (member.role === "admin") {
      Alert.alert("Uyarı", "Grup yöneticisi çıkarılamaz.")
      return
    }

    Alert.alert(
      "Üye Çıkar",
      `${member.name} (@${member.username}) gruptan çıkarılsın mı?`,
      [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Çıkar", style: "destructive",
          onPress: async () => {
            await supabase
              .from("group_members")
              .delete()
              .eq("group_id", groupId)
              .eq("user_id", member.user_id)
            loadGroup()
          }
        },
      ]
    )
  }

  if (!group) return null

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.content}>
        {/* Üye ekle — sadece admin */}
        {isAdmin && (
          <View style={styles.addCard}>
            <Text style={styles.addTitle}>Üye Ekle</Text>
            <Text style={styles.addSub}>{members.length}/{MAX_MEMBERS} üye</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Kullanıcı adı..."
                value={searchUsername}
                onChangeText={(t) => setSearchUsername(t.toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.addSendBtn, (searching || !searchUsername.trim()) && { opacity: 0.5 }]}
                onPress={addMember}
                disabled={searching || !searchUsername.trim()}
              >
                <Text style={styles.addSendBtnText}>{searching ? "..." : "Ekle"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Üye listesi */}
        <Text style={styles.sectionTitle}>Üyeler</Text>
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={[styles.memberAvatar, item.role === "admin" && { backgroundColor: COLORS.accentLight }]}>
                <Text style={{ fontSize: 18 }}>
                  {item.role === "admin" ? "👑" : "👤"}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberUsername}>@{item.username}</Text>
              </View>
              {isAdmin && item.role !== "admin" && (
                <TouchableOpacity onPress={() => removeMember(item)} style={styles.memberRemoveBtn}>
                  <Text style={styles.memberRemoveText}>Çıkar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.navy, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  backArrow: { color: COLORS.white, fontSize: 24, fontWeight: FONT_WEIGHTS.bold, marginTop: -2 },
  headerTitle: {
    flex: 1, textAlign: "center",
    color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold,
  },

  content: { flex: 1, backgroundColor: COLORS.background },

  // Üye ekle
  addCard: {
    margin: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.lg, ...SHADOWS.small,
  },
  addTitle: { fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  addSub: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, marginBottom: SPACING.sm },
  addRow: { flexDirection: "row", gap: SPACING.sm },
  addInput: {
    flex: 1, backgroundColor: COLORS.gray100, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.md, color: COLORS.navy,
  },
  addSendBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, justifyContent: "center",
  },
  addSendBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold },

  // Section
  sectionTitle: {
    fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy,
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
  },

  // Üye kartı
  memberCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, ...SHADOWS.small,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.gray100,
    justifyContent: "center", alignItems: "center",
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  memberUsername: { fontSize: FONT_SIZES.sm, color: COLORS.gray400 },
  memberRemoveBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.redLight,
  },
  memberRemoveText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.red },
})
