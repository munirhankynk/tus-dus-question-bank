import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  Alert,
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
  members: GroupMember[]
}

type GroupMember = {
  id: string
  user_id: string
  name: string
  username: string
  role: "admin" | "member"
}

const PREMIUM_FEATURES = [
  { icon: "🔁", title: "Aylık Soru Tekrarı", desc: "Aylık yüklediğin sorularını tekrar et, notlar ekle" },
  { icon: "👥", title: "Arkadaş Grupları", desc: "Arkadaşlarınla grup oluştur, birlikte çalış" },
  { icon: "📚", title: "Ortak Kütüphane", desc: "Gruptaki herkesin sorularını gör ve birlikte öğren" },
  { icon: "♾️", title: "Sınırsız Yükleme", desc: "Günlük yükleme limiti olmadan çalış" },
  { icon: "📊", title: "Gelişmiş İstatistik", desc: "Detaylı performans analizi ve haftalık raporlar" },
]

const MAX_MEMBERS = 5

export default function PremiumScreen() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const isPremium = profile?.is_premium === true

  // Grup state
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [creating, setCreating] = useState(false)

  // Üye ekleme
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null)
  const [addUsername, setAddUsername] = useState("")
  const [addingMember, setAddingMember] = useState(false)

  useEffect(() => {
    if (isPremium) loadGroups()
    else setLoading(false)
  }, [isPremium])

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
      const withMembers = await Promise.all(
        groupsData.map(async (g) => {
          const { data: membersData } = await supabase
            .from("group_members")
            .select("id, user_id, role")
            .eq("group_id", g.id)

          let members: GroupMember[] = []
          if (membersData) {
            const userIds = membersData.map(m => m.user_id)
            const { data: usersData } = await supabase
              .from("users")
              .select("id, name, username")
              .in("id", userIds)

            members = membersData.map(m => {
              const user = usersData?.find(u => u.id === m.user_id)
              return {
                id: m.id,
                user_id: m.user_id,
                name: user?.name || "",
                username: user?.username || "",
                role: m.role as "admin" | "member",
              }
            })
          }

          return { ...g, memberCount: members.length, members }
        })
      )
      setGroups(withMembers)
    }

    setLoading(false)
  }

  const createGroup = async () => {
    if (!profile || !newGroupName.trim()) return
    setCreating(true)

    const { data: groupData, error } = await supabase
      .from("groups")
      .insert({ name: newGroupName.trim(), created_by: profile.id })
      .select()
      .single()

    if (error) {
      Alert.alert("Hata", error.message)
      setCreating(false)
      return
    }

    await supabase
      .from("group_members")
      .insert({ group_id: groupData.id, user_id: profile.id, role: "admin" })

    setNewGroupName("")
    setShowCreateGroup(false)
    setCreating(false)
    loadGroups()
  }

  const addMember = async (groupId: string) => {
    if (!addUsername.trim() || !profile) return

    const group = groups.find(g => g.id === groupId)
    if (group && group.memberCount >= MAX_MEMBERS) {
      Alert.alert("Limit", `Bir grupta en fazla ${MAX_MEMBERS} kişi olabilir.`)
      return
    }

    setAddingMember(true)

    const { data: userData } = await supabase
      .from("users")
      .select("id, name, username, is_premium")
      .eq("username", addUsername.trim().toLowerCase())
      .single()

    if (!userData) {
      Alert.alert("Bulunamadı", "Bu kullanıcı adına sahip biri yok.")
      setAddingMember(false)
      return
    }

    if (!userData.is_premium) {
      Alert.alert("Premium Gerekli", `@${userData.username} premium üye değil. Gruba eklenebilmesi için premium olması gerekiyor.`)
      setAddingMember(false)
      return
    }

    if (group?.members.some(m => m.user_id === userData.id)) {
      Alert.alert("Zaten Üye", "Bu kişi zaten grupta.")
      setAddingMember(false)
      return
    }

    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userData.id, role: "member" })

    if (error) {
      Alert.alert("Hata", error.message)
    } else {
      Alert.alert("Eklendi", `@${userData.username} gruba eklendi.`)
      setAddUsername("")
      setAddingToGroupId(null)
      loadGroups()
    }

    setAddingMember(false)
  }

  const removeMember = (groupId: string, member: GroupMember) => {
    if (member.role === "admin") return

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
            loadGroups()
          }
        },
      ]
    )
  }

  const leaveOrDeleteGroup = (group: Group) => {
    if (group.created_by === profile?.id) {
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
    } else {
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
    }
  }

  // ─── FREE KULLANICI ───
  if (!isPremium) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Premium</Text>
        </View>

        <ScrollView style={styles.freeContent} contentContainerStyle={styles.freeInner}>
          {/* Hero */}
          <View style={styles.heroCard}>
            <Text style={styles.heroEmoji}>👑</Text>
            <Text style={styles.heroTitle}>MedBank Premium</Text>
            <Text style={styles.heroSub}>
              Arkadaşlarınla birlikte çalış, sınırsız soru yükle
            </Text>
          </View>

          {/* Özellikler */}
          <Text style={styles.sectionTitle}>Premium Avantajları</Text>
          {PREMIUM_FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Text style={{ fontSize: 24 }}>{f.icon}</Text>
              </View>
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}

          {/* Fiyat + Satın al */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Aylık</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>₺39.99</Text>
              <Text style={styles.pricePeriod}>/ay</Text>
            </View>
            <Text style={styles.priceSub}>3 gün ücretsiz dene, istediğin zaman iptal et</Text>
          </View>

          <TouchableOpacity
            style={styles.purchaseBtn}
            onPress={() => Alert.alert("Yakında", "Ödeme sistemi çok yakında aktif olacak!")}
          >
            <Text style={styles.purchaseBtnText}>Premiuma Katıl</Text>
          </TouchableOpacity>

          <Text style={styles.termsText}>
            Abonelik Apple/Google hesabınız üzerinden yönetilir
          </Text>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ─── PREMIUM KULLANICI ───
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: COLORS.navy }}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Premium</Text>
        <View style={styles.premiumBadge}>
          <Text style={styles.premiumBadgeText}>PRO</Text>
        </View>
      </View>

      <ScrollView style={styles.premiumContent} contentContainerStyle={styles.premiumInner}>
        {/* Soru Tekrarı */}
        <TouchableOpacity
          style={styles.reviewCard}
          onPress={() => router.push("/review/test" as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.reviewIcon}>🔁</Text>
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewTitle}>Soru Tekrarı</Text>
            <Text style={styles.reviewDesc}>Yüklediğin soruları aylık tekrar et</Text>
          </View>
          <Text style={styles.reviewArrow}>›</Text>
        </TouchableOpacity>

        {/* Grup oluştur */}
        <View style={styles.createSection}>
          <View style={styles.createSectionHeader}>
            <Text style={styles.sectionTitle}>Gruplarım</Text>
            <TouchableOpacity
              style={styles.createGroupBtn}
              onPress={() => setShowCreateGroup(!showCreateGroup)}
            >
              <Text style={styles.createGroupBtnText}>{showCreateGroup ? "Kapat" : "+ Yeni Grup"}</Text>
            </TouchableOpacity>
          </View>

          {showCreateGroup && (
            <View style={styles.createGroupCard}>
              <TextInput
                style={styles.createGroupInput}
                placeholder="Grup adı..."
                value={newGroupName}
                onChangeText={setNewGroupName}
                maxLength={30}
              />
              <TouchableOpacity
                style={[styles.createGroupSubmit, (!newGroupName.trim() || creating) && { opacity: 0.5 }]}
                onPress={createGroup}
                disabled={!newGroupName.trim() || creating}
              >
                <Text style={styles.createGroupSubmitText}>
                  {creating ? "..." : "Oluştur"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Grup listesi */}
        {groups.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>Henüz grup yok</Text>
            <Text style={styles.emptySub}>Grup oluştur ve arkadaşlarını ekle</Text>
          </View>
        ) : (
          groups.map((group) => {
            const isAdmin = group.created_by === profile?.id
            const isAddingHere = addingToGroupId === group.id

            return (
              <View key={group.id} style={styles.groupCard}>
                {/* Grup başlık */}
                <View style={styles.groupHeader}>
                  <View style={styles.groupHeaderLeft}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupMeta}>
                      {group.memberCount}/{MAX_MEMBERS} üye
                      {isAdmin ? " · Yönetici" : ""}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => leaveOrDeleteGroup(group)}>
                    <Text style={styles.groupActionText}>
                      {isAdmin ? "Sil" : "Ayrıl"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Üyeler */}
                {group.members.map((member) => (
                  <View key={member.id} style={styles.memberRow}>
                    <Text style={{ fontSize: 16 }}>
                      {member.role === "admin" ? "👑" : "👤"}
                    </Text>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberUsername}>@{member.username}</Text>
                    </View>
                    {isAdmin && member.role !== "admin" && (
                      <TouchableOpacity onPress={() => removeMember(group.id, member)}>
                        <Text style={styles.memberRemove}>Çıkar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Üye ekle */}
                {isAdmin && group.memberCount < MAX_MEMBERS && (
                  <>
                    {isAddingHere ? (
                      <View style={styles.addMemberRow}>
                        <TextInput
                          style={styles.addMemberInput}
                          placeholder="Kullanıcı adı..."
                          value={addUsername}
                          onChangeText={(t) => setAddUsername(t.toLowerCase())}
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoFocus
                        />
                        <TouchableOpacity
                          style={[styles.addMemberBtn, (addingMember || !addUsername.trim()) && { opacity: 0.5 }]}
                          onPress={() => addMember(group.id)}
                          disabled={addingMember || !addUsername.trim()}
                        >
                          <Text style={styles.addMemberBtnText}>{addingMember ? "..." : "Ekle"}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setAddingToGroupId(null); setAddUsername("") }}>
                          <Text style={styles.addMemberCancel}>Vazgeç</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addMemberTrigger}
                        onPress={() => setAddingToGroupId(group.id)}
                      >
                        <Text style={styles.addMemberTriggerText}>+ Üye Ekle</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )
          })
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // ─── COMMON ───
  header: {
    backgroundColor: COLORS.navy, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  headerTitle: { color: COLORS.white, fontSize: FONT_SIZES.xl, fontWeight: FONT_WEIGHTS.bold },
  premiumBadge: {
    backgroundColor: COLORS.premium, paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  premiumBadgeText: { color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },

  sectionTitle: {
    fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy,
  },

  // ─── FREE ───
  freeContent: { flex: 1, backgroundColor: COLORS.background },
  freeInner: { padding: SPACING.lg, paddingBottom: 100 },

  heroCard: {
    backgroundColor: COLORS.premium, borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: "center", marginBottom: SPACING.lg,
  },
  heroEmoji: { fontSize: 48, marginBottom: SPACING.sm },
  heroTitle: {
    fontSize: FONT_SIZES.xxl, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.white,
  },
  heroSub: {
    fontSize: FONT_SIZES.md, color: "rgba(255,255,255,0.8)", textAlign: "center",
    marginTop: SPACING.xs,
  },

  featureCard: {
    flexDirection: "row", alignItems: "center", gap: SPACING.md,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    marginTop: SPACING.sm, ...SHADOWS.small,
  },
  featureIcon: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.premiumLight,
    justifyContent: "center", alignItems: "center",
  },
  featureInfo: { flex: 1 },
  featureTitle: { fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  featureDesc: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, marginTop: 2 },

  priceCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.lg,
    alignItems: "center", marginTop: SPACING.xl, ...SHADOWS.medium,
    borderWidth: 2, borderColor: COLORS.premium,
  },
  priceLabel: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.premium },
  priceRow: { flexDirection: "row", alignItems: "baseline", marginTop: SPACING.xs },
  priceAmount: { fontSize: 36, fontWeight: FONT_WEIGHTS.extrabold, color: COLORS.navy },
  pricePeriod: { fontSize: FONT_SIZES.lg, color: COLORS.gray400, marginLeft: 4 },
  priceSub: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, marginTop: SPACING.sm, textAlign: "center" },

  purchaseBtn: {
    backgroundColor: COLORS.premium, borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md + 4, alignItems: "center", marginTop: SPACING.lg,
  },
  purchaseBtnText: { color: COLORS.white, fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold },

  termsText: {
    fontSize: FONT_SIZES.xs + 1, color: COLORS.gray300, textAlign: "center",
    marginTop: SPACING.md,
  },

  // ─── PREMIUM ───
  premiumContent: { flex: 1, backgroundColor: COLORS.background },
  premiumInner: { padding: SPACING.md, paddingBottom: 100 },

  createSection: { marginBottom: SPACING.md },
  createSectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: SPACING.sm,
  },
  createGroupBtn: {
    backgroundColor: COLORS.premium, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  createGroupBtnText: { color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },

  createGroupCard: {
    flexDirection: "row", gap: SPACING.sm,
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md,
    ...SHADOWS.small,
  },
  createGroupInput: {
    flex: 1, backgroundColor: COLORS.gray100, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.md, color: COLORS.navy,
  },
  createGroupSubmit: {
    backgroundColor: COLORS.premium, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg, justifyContent: "center",
  },
  createGroupSubmitText: { color: COLORS.white, fontSize: FONT_SIZES.md, fontWeight: FONT_WEIGHTS.bold },

  // Boş
  emptyCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.xl,
    alignItems: "center", ...SHADOWS.small,
  },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.sm },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  emptySub: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, marginTop: SPACING.xs },

  // Grup kartı
  groupCard: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.xl, padding: SPACING.md,
    marginBottom: SPACING.md, ...SHADOWS.small,
  },
  groupHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: SPACING.sm, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  groupHeaderLeft: { flex: 1 },
  groupName: { fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  groupMeta: { fontSize: FONT_SIZES.sm, color: COLORS.gray400, marginTop: 2 },
  groupActionText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.red },

  // Üye satırı
  memberRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.gray100,
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: FONT_SIZES.sm + 1, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.navy },
  memberUsername: { fontSize: FONT_SIZES.sm, color: COLORS.gray400 },
  memberRemove: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.red },

  // Üye ekle
  addMemberRow: {
    flexDirection: "row", alignItems: "center", gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  addMemberInput: {
    flex: 1, backgroundColor: COLORS.gray100, borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.sm + 1, color: COLORS.navy,
  },
  addMemberBtn: {
    backgroundColor: COLORS.premium, borderRadius: RADIUS.md,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addMemberBtnText: { color: COLORS.white, fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold },
  addMemberCancel: { fontSize: FONT_SIZES.sm, color: COLORS.gray400 },

  addMemberTrigger: {
    marginTop: SPACING.sm, paddingVertical: SPACING.sm, alignItems: "center",
    borderWidth: 1.5, borderStyle: "dashed", borderColor: COLORS.gray200,
    borderRadius: RADIUS.md,
  },
  addMemberTriggerText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.bold, color: COLORS.premium },

  // Soru Tekrarı
  reviewCard: {
    backgroundColor: COLORS.premiumLight, borderRadius: RADIUS.xl, padding: SPACING.lg,
    marginBottom: SPACING.lg, flexDirection: "row" as const, alignItems: "center" as const,
    gap: SPACING.md, borderWidth: 1, borderColor: COLORS.premium + "30",
  },
  reviewIcon: { fontSize: 32 },
  reviewInfo: { flex: 1 },
  reviewTitle: { fontSize: FONT_SIZES.md + 1, fontWeight: FONT_WEIGHTS.bold, color: COLORS.navy },
  reviewDesc: { fontSize: FONT_SIZES.sm, color: COLORS.premium, marginTop: 2 },
  reviewArrow: { fontSize: 22, color: COLORS.premium },
})
