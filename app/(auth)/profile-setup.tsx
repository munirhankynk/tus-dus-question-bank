import { useState } from "react"
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native"

import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  RADIUS,
  SPACING
} from "../../constants"

import { useAuthStore } from "../../store/authStore"

export default function ProfileSetup(){

const { createProfile } = useAuthStore()

const [name,setName] = useState("")
const [mode,setMode] = useState<"TUS"|"DUS">("TUS")
const [university,setUniversity] = useState("")
const [attempt,setAttempt] = useState<number | null>(null)

const handleCreate = async ()=>{

if(!name){
alert("İsim gir")
return
}

await createProfile({
name,
mode,
university,
attemptNumber: attempt ?? undefined
})

}

return(

<TouchableWithoutFeedback onPress={Keyboard.dismiss}>

<KeyboardAvoidingView
style={styles.container}
behavior={Platform.OS === "ios" ? "padding" : "height"}
>

<ScrollView
contentContainerStyle={styles.scroll}
keyboardShouldPersistTaps="handled"
>

<Text style={styles.step}>Adım 2/2</Text>

<Text style={styles.title}>Profilini Oluştur</Text>

<Text style={styles.subtitle}>
Sana özel deneyim için birkaç bilgi
</Text>

<View style={styles.card}>

<Text style={styles.label}>Adın</Text>

<TextInput
style={styles.input}
placeholder="Adın"
value={name}
onChangeText={setName}
/>

<Text style={styles.label}>Hangi sınava hazırlanıyorsun?</Text>

<View style={styles.modeRow}>

<TouchableOpacity
style={[
styles.modeButton,
mode === "TUS" && styles.modeActive
]}
onPress={()=>setMode("TUS")}
>
<Text style={styles.modeTitle}>TUS</Text>
<Text style={styles.modeSub}>Tıpta Uzmanlık</Text>
</TouchableOpacity>

<TouchableOpacity
style={[
styles.modeButton,
mode === "DUS" && styles.modeActive
]}
onPress={()=>setMode("DUS")}
>
<Text style={styles.modeTitle}>DUS</Text>
<Text style={styles.modeSub}>Diş Hekimliği</Text>
</TouchableOpacity>

</View>

<Text style={styles.label}>Üniversite (opsiyonel)</Text>

<TextInput
style={styles.input}
placeholder="Üniversite..."
value={university}
onChangeText={setUniversity}
/>

<Text style={styles.label}>Kaçıncı kez giriyorsun?</Text>

<View style={styles.attemptRow}>

{[
{label:"İlk kez",value:1},
{label:"2. kez",value:2},
{label:"3+ kez",value:3}
].map(item=>(
<TouchableOpacity
key={item.value}
style={[
styles.attemptButton,
attempt === item.value && styles.attemptActive
]}
onPress={()=>setAttempt(item.value)}
>
<Text>{item.label}</Text>
</TouchableOpacity>
))}

</View>

<TouchableOpacity
style={styles.startButton}
onPress={handleCreate}
>
<Text style={styles.startText}>Başlayalım! 🚀</Text>
</TouchableOpacity>

</View>

</ScrollView>

</KeyboardAvoidingView>

</TouchableWithoutFeedback>

)
}

const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:COLORS.navy
},

scroll:{
flexGrow:1,
justifyContent:"center",
padding:SPACING.lg
},

step:{
color:COLORS.gray300,
textAlign:"center",
marginBottom:SPACING.xs
},

title:{
fontSize:FONT_SIZES.hero,
fontWeight:FONT_WEIGHTS.extrabold,
color:COLORS.white,
textAlign:"center"
},

subtitle:{
textAlign:"center",
color:COLORS.gray300,
marginBottom:SPACING.lg
},

card:{
backgroundColor:COLORS.white,
borderRadius:RADIUS.xl,
padding:SPACING.lg
},

label:{
marginTop:SPACING.md,
marginBottom:SPACING.xs,
fontWeight:FONT_WEIGHTS.semibold
},

input:{
backgroundColor:COLORS.gray100,
padding:SPACING.md,
borderRadius:RADIUS.md
},

modeRow:{
flexDirection:"row",
gap:SPACING.md,
marginTop:SPACING.md
},

modeButton:{
flex:1,
backgroundColor:COLORS.gray100,
padding:SPACING.md,
borderRadius:RADIUS.lg,
alignItems:"center"
},

modeActive:{
borderWidth:2,
borderColor:COLORS.accent
},

modeTitle:{
fontWeight:FONT_WEIGHTS.bold,
fontSize:FONT_SIZES.lg
},

modeSub:{
color:COLORS.gray400
},

attemptRow:{
flexDirection:"row",
gap:SPACING.sm,
marginTop:SPACING.md
},

attemptButton:{
flex:1,
padding:SPACING.md,
borderRadius:RADIUS.md,
backgroundColor:COLORS.gray100,
alignItems:"center"
},

attemptActive:{
borderWidth:2,
borderColor:COLORS.accent
},

startButton:{
backgroundColor:COLORS.gray200,
padding:SPACING.lg,
borderRadius:RADIUS.lg,
alignItems:"center",
marginTop:SPACING.lg
},

startText:{
fontWeight:FONT_WEIGHTS.bold
}

})