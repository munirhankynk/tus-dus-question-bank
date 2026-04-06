import { useRouter } from "expo-router"
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

type Group = {
  id: string
  name: string
  created_by: string
  memberCount: number
}

export default function GroupsScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadGroups() }, [])

  const loadGroups = async () => {
    if (!profile) return

    const { data: memberships } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", profile.id)

    if (!memberships || memberships.length === 0) {
      setGroups([])
      setLoading(false)
      return
    }

    const groupIds = memberships.map(m => m.group_id)

    const { data: groupsData } = await supabase
      .from("groups")
      .select("id, name, created_by")
      .in("id", groupIds)

    if (groupsData) {
      const withCounts = await Promise.all(
        groupsData.map(async (g) => {
          const { count } = await supabase
            .from("group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", g.id)
          return { ...g, memberCount: count || 0 }
        })
      )
      setGroups(withCounts)
    }

    setLoading(false)
  }

  const createGroup = async () => {
    if (!profile || !newGroupName.trim()) return
    setCreating(true)

    const { data: groupData, error: groupError } = await supabase
      .from("groups")
      .insert({ name: newGroupName.trim(), created_by: profile.id })
      .select()
      .single()

    if (groupError) {
      Alert.alert("Hata", groupError.message)
      setCreating(false)
      return
    }

    // Kendini admin olarak ekle
    await supabase
      .from("group_members")
      .insert({ group_id: groupData.id, user_id: profile.id, role: "admin" })

    setNewGroupName("")
    setShowCreate(false)
    setCreating(false)
    loadGroups()
  }

  const deleteGroup = (group: Group) => {
    if (group.created_by !== profile?.id) {
      // Üye ise gruptan ayrıl
      Alert.alert("Gruptan Ayrıl", `"${group.name}" grubundan ayrılmak istiyor musun?`, [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Ayrıl", style: "destructive",
          onPress: async () => {
            await supabase
              .from("group_members")
              .delete()
              .eq("group_id", group.id)
              .eq("user_id", profile!.id)
            loadGroups()
          }
        },
      ])
    } else {
      Alert.alert("Grubu Sil", `"${group.name}" grubu silinecek. Emin misin?`, [
        { text: "Vazgeç", style: "cancel" },
        {
          text: "Sil", style: "destructive",
          onPress: async () => {
            await supabase.from("groups").delete().eq("id", group.id)
            loadGroups()
          }
        },
      ])
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gruplarım</Text>
        <TouchableOpacity onPress={() => setShowCreate(!showCreate)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Grup oluştur */}
        {showCreate && (
          <View style={styles.createCard}>
            <Text style={styles.createTitle}>Yeni Grup</Text>
            <TextInput
              style={styles.createInput}
              placeholder="Grup adı..."
              value={newGroupName}
              onChangeText={setNewGroupName}
              maxLength={30}
            />
            <TouchableOpacity
              style={[styles.createBtn, creating && { opacity: 0.5 }]}
              onPress={createGroup}
              disabled={creating || !newGroupName.trim()}
            >
              <Text style={styles.createBtnText}>
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Grup listesi */}
        {groups.length === 0 && !loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Henüz grup yok</Text>
            <Text style={styles.emptySub}>
              Grup oluştur ve arkadaşlarınla soruları paylaş
            </Text>
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: SPACING.md, gap: SPACING.sm }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.groupCard}
                onPress={() => router.push(`/group/${item.id}` as any)}
                onLongPress={() => deleteGroup(item)}
              >
                <View style={styles.groupIcon}>
                  <Text style={{ fontSize: 22 }}>👥</Text>
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.groupMeta}>
                    {item.memberCount} üye {item.created_by === profile?.id ? "· Yönetici" : ""}
                  </Text>
                </View>
                <Text style={styles.groupArrow}>›</Text>
              </TouchableOpacity>
            )}
          />
        )}
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
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold },
  addBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.accent,
    justifyContent: "center", alignItems: "center",
  },
  addBtnText: { color: COLORS.white, fontSize: 22, fontWeight: FONT_WEIGHTS.bold, marginTop: -2 },

  content: { flex: 1, backgroundColor: COLORS.background },

  // Oluştur
  createCard: {
    margin: SPACING.md, backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.lg, ...SHADOWS.small,
  },
  createTitle: { fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy, marginBottom: SPACING.sm },
  createInput: {
    backgroundColor: COLORS.gray100, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZES.md, color: COLORS.navy,
  },
  createBtn: {
    backgroundColor: COLORS.accent, borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 4, alignItems: "center", marginTop: SPACING.md,
  },
  createBtnText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold },

  // Boş
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: SPACING.xl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  emptySub: { fontSize: FONT_SIZES.sm + 1, color: COLORS.gray400, textAlign: "center", marginTop: SPACING.xs },

  // Grup kartı
  groupCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, ...SHADOWS.small,
  },
  groupIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.accentLight,
    justifyContent: "center", alignItems: "center",
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  groupMeta: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, marginTop: 2 },
  groupArrow: { fontSize: 24, color: COLORS.gray300, fontWeight: FONT_WEIGHTS.bold },
})
