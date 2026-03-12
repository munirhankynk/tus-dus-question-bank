import { useEffect, useState } from "react"
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native"

import { SafeAreaView } from "react-native-safe-area-context"

import { router } from "expo-router"
import {
    COLORS,
    FONT_SIZES,
    FONT_WEIGHTS,
    RADIUS,
    SPACING
} from "../../constants"
import { supabase } from "../../services/supabase"
import { useAuthStore } from "../../store/authStore"

type Course = {
id:string
name:string
color_code:string
sort_order:number
}

export default function LibraryScreen(){

const { profile } = useAuthStore()

const [courses,setCourses] = useState<Course[]>([])
const [search,setSearch] = useState("")
const [totalQuestions,setTotalQuestions] = useState(0)

useEffect(()=>{loadCourses()},[])

const loadCourses = async () => {

if(!profile) return

const { data, error } = await supabase
.from("courses")
.select("*")
.eq("mode",profile.mode)
.order("sort_order")

if(!error && data){
setCourses(data)
}

const { count } = await supabase
.from("questions")
.select("*",{ count:"exact", head:true })

if(count){
setTotalQuestions(count)
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

<FlatList
data={filtered}
keyExtractor={(item)=>item.id}
contentContainerStyle={styles.list}
renderItem={({item})=>(

<TouchableOpacity
style={styles.courseCard}
onPress={() => router.push(`/course/${item.id}` as any)}
>

<View
style={[
styles.countBadge,
{ backgroundColor:item.color_code }
]}
>
<Text style={styles.countText}>0</Text>
</View>

<View style={{flex:1}}>
<Text style={styles.courseName}>{item.name}</Text>
<Text style={styles.courseSub}>0 soru arşivde</Text>
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
width:42,
height:42,
borderRadius:12,
justifyContent:"center",
alignItems:"center",
marginRight:SPACING.md
},

countText:{
color:"#fff",
fontWeight:"bold",
fontSize:FONT_SIZES.md
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
}

})