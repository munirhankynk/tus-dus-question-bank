import { router } from "expo-router"
import { useEffect, useState } from "react"
import {
  FlatList,
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
  SPACING
} from "../../constants"
import { getCourseIcon } from "../../constants/courseIcons"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"
import { useQuestionStore } from "../../store/questionStore"

type Course = {
  id: string
  name: string
  color_code: string
  sort_order: number
  questionCount?: number
}

type GroupOption = {
  id: string
  name: string
}

export default function LibraryScreen(){

const { profile } = useAuthStore()
const [courses,setCourses] = useState<Course[]>([])
const [search,setSearch] = useState("")
const [totalQuestions,setTotalQuestions] = useState(0)
const { refreshCounter } = useQuestionStore()

// Grup filtresi: null = benim sorularım, groupId = grup soruları
const [groups, setGroups] = useState<GroupOption[]>([])
const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

useEffect(() => { loadCourses(); loadGroups() }, [refreshCounter, profile])
useEffect(() => { loadCourses() }, [selectedGroupId])

const loadGroups = async () => {
  if (!profile?.is_premium) return
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", profile.id)
  if (!memberships || memberships.length === 0) return
  const groupIds = memberships.map(m => m.group_id)
  const { data: groupsData } = await supabase
    .from("groups")
    .select("id, name")
    .in("id", groupIds)
  if (groupsData) setGroups(groupsData)
}

const loadCourses = async () => {

if(!profile) return

const { data, error } = await supabase
.from("courses")
.select("*")
.eq("mode",profile.mode)
.order("sort_order")

if (!error && data) {
      // Grup seçiliyse gruptaki tüm üyelerin sorularını say
      let userIds = [profile.id]
      if (selectedGroupId) {
        const { data: members } = await supabase
          .from("group_members")
          .select("user_id")
          .eq("group_id", selectedGroupId)
        if (members) userIds = members.map(m => m.user_id)
      }

      const withCounts = await Promise.all(
        data.map(async (course: any) => {
          const { count } = await supabase
            .from("questions")
            .select("*", { count: "exact", head: true })
            .in("user_id", userIds)
            .eq("course_id", course.id)
          return { ...course, questionCount: count || 0 }
        })
      )
      setCourses(withCounts)
      const total = withCounts.reduce((sum: number, c: any) => sum + (c.questionCount || 0), 0)
setTotalQuestions(total)
    }

}
const filtered = courses.filter((c:any) =>
c.name.toLowerCase().includes(search.toLowerCase())
)

return(

<SafeAreaView edges={['top']} style={{backgroundColor: COLORS.navy}}>

<View style={styles.header}>

<Text style={styles.title}> Kütüphane </Text>
<View style={styles.badge}>
<Text style={styles.badgeText}>
{totalQuestions} soru
</Text>
</View>

</View>

<TextInput
placeholder="Ders ara..."
value={search}
onChangeText={setSearch}
style={styles.search}
/>

{groups.length > 0 && (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.groupFilterScroll} contentContainerStyle={styles.groupFilterContent}>
    <TouchableOpacity
      style={[styles.groupChip, !selectedGroupId && styles.groupChipActive]}
      onPress={() => setSelectedGroupId(null)}
    >
      <Text style={[styles.groupChipText, !selectedGroupId && styles.groupChipTextActive]}>Benim Sorularım</Text>
    </TouchableOpacity>
    {groups.map((g) => (
      <TouchableOpacity
        key={g.id}
        style={[styles.groupChip, selectedGroupId === g.id && styles.groupChipActive]}
        onPress={() => setSelectedGroupId(g.id)}
      >
        <Text style={{ fontSize: 12 }}>👥</Text>
        <Text style={[styles.groupChipText, selectedGroupId === g.id && styles.groupChipTextActive]}>{g.name}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
)}

<FlatList
data={filtered}
keyExtractor={(item)=>item.id}
contentContainerStyle={styles.list}
renderItem={({item})=>(

<TouchableOpacity
style={styles.courseCard}
onPress={() => router.push(`/course/${item.id}${selectedGroupId ? `?groupId=${selectedGroupId}` : ""}` as any)}
>

<View
style={[
styles.countBadge,
{ backgroundColor: getCourseIcon(item.name).color + '20' }
]}
>
<Text style={styles.courseIcon}>{getCourseIcon(item.name).icon}</Text>
</View>

<View style={{flex:1}}>
<Text style={styles.courseName}>{item.name}</Text>
<Text style={styles.courseSub}>{item.questionCount || 0} soru arşivde</Text>
</View>

<View style={[styles.courseCountBadge, { backgroundColor: getCourseIcon(item.name).color }]}>
  <Text style={styles.countText}>{item.questionCount || 0}</Text>
</View>

<Text style={styles.arrow}>›</Text>

</TouchableOpacity>

)}
/>

</SafeAreaView>

)
}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F4F6FB"
},

header:{
backgroundColor:COLORS.navy,
paddingHorizontal:SPACING.lg,
paddingTop:SPACING.md,
paddingBottom:SPACING.lg,
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center"
},

title:{
color:COLORS.white,
fontSize:24,
fontWeight:FONT_WEIGHTS.bold
},

badge:{
backgroundColor:"#2A355C",
paddingHorizontal:14,
paddingVertical:6,
borderRadius:20
},

badgeText:{
color:COLORS.white,
fontWeight:FONT_WEIGHTS.medium
},

search:{
backgroundColor:COLORS.white,
marginHorizontal:SPACING.lg,
marginTop:-SPACING.md,
padding:SPACING.md,
borderRadius:RADIUS.md,
fontSize:FONT_SIZES.md,
elevation:2
},

list:{
paddingHorizontal:SPACING.lg,
paddingTop:SPACING.md,
paddingBottom:120
},

courseCard:{
backgroundColor:COLORS.white,
padding:SPACING.md,
borderRadius:RADIUS.md,
flexDirection:"row",
alignItems:"center",
marginBottom:SPACING.md
},

countBadge:{
width:46,
height:46,
borderRadius:14,
justifyContent:"center",
alignItems:"center",
marginRight:SPACING.md
},

courseIcon:{
fontSize:24,
},

courseCountBadge:{
paddingHorizontal:8,
paddingVertical:4,
borderRadius:10,
marginRight:SPACING.sm,
},

countText:{
color:"#fff",
fontWeight:"bold",
fontSize:FONT_SIZES.xs + 1,
},

courseName:{
fontWeight:FONT_WEIGHTS.bold,
fontSize:FONT_SIZES.md
},

courseSub:{
color:"#8A94A6",
fontSize:12
},

arrow:{
fontSize:22,
color:"#999"
},

// Grup filtresi
groupFilterScroll: { flexGrow: 0, marginTop: SPACING.sm },
groupFilterContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
groupChip: {
  flexDirection: "row", alignItems: "center", gap: 4,
  paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
  backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.gray100,
},
groupChipActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
groupChipText: { fontSize: FONT_SIZES.sm, fontWeight: FONT_WEIGHTS.semibold, color: COLORS.gray400 },
groupChipTextActive: { color: COLORS.accent },

})