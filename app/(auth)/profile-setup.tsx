import { useRouter } from "expo-router"
import { useState } from "react"

import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native"

import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view"

import {
    COLORS,
    FONT_SIZES,
    FONT_WEIGHTS,
    RADIUS,
    SPACING
} from "../../constants"

import { useAuthStore } from "../../store/authStore"

export default function ProfileSetup(){

const router = useRouter()
const { createProfile } = useAuthStore()

const [name,setName] = useState("")
const [mode,setMode] = useState<"TUS"|"DUS">("TUS")
const [university,setUniversity] = useState("")
const [attemptNumber,setAttemptNumber] = useState("")

const handleCreate = async ()=>{

if(!name){
Alert.alert("Hata","Adını girmen gerekiyor")
return
}

const { error } = await createProfile({
name,
mode,
university,
attemptNumber: attemptNumber ? Number(attemptNumber) : undefined
})

if(error){
Alert.alert("Hata","Profil oluşturulamadı")
return
}

router.replace("/(tabs)/library")

}

return(

<SafeAreaView style={styles.safe}>

<KeyboardAvoidingView
style={styles.flex}
behavior={Platform.OS === "ios" ? "padding" : undefined}
>

<KeyboardAwareScrollView
contentContainerStyle={styles.container}
enableOnAndroid
extraScrollHeight={20}
keyboardShouldPersistTaps="handled"
>

<Text style={styles.title}>Profil Oluştur</Text>

<TextInput
style={styles.input}
placeholder="Adın"
placeholderTextColor={COLORS.gray300}
value={name}
onChangeText={setName}
autoCorrect={false}
autoCapitalize="words"
textContentType="name"
autoComplete="off"
/>

<Text style={styles.label}>Hedef Sınav</Text>

<View style={styles.modeRow}>

<TouchableOpacity
style={[styles.modeBtn, mode === "TUS" && styles.modeActive]}
onPress={()=>setMode("TUS")}
>

<Text style={styles.modeText}>TUS</Text>

</TouchableOpacity>

<TouchableOpacity
style={[styles.modeBtn, mode === "DUS" && styles.modeActive]}
onPress={()=>setMode("DUS")}
>

<Text style={styles.modeText}>DUS</Text>

</TouchableOpacity>

</View>

<TextInput
style={styles.input}
placeholder="Üniversite"
placeholderTextColor={COLORS.gray300}
value={university}
onChangeText={setUniversity}
autoCorrect={false}
autoCapitalize="words"
textContentType="none"
autoComplete="off"
/>

<TextInput
style={styles.input}
placeholder="Kaçıncı deneme?"
placeholderTextColor={COLORS.gray300}
value={attemptNumber}
onChangeText={setAttemptNumber}
keyboardType="number-pad"
autoCorrect={false}
autoComplete="off"
textContentType="none"
/>

<TouchableOpacity
style={styles.button}
onPress={handleCreate}
>

<Text style={styles.buttonText}>Profili Oluştur</Text>

</TouchableOpacity>

</KeyboardAwareScrollView>

</KeyboardAvoidingView>

</SafeAreaView>

)

}

const styles = StyleSheet.create({

safe:{
flex:1,
backgroundColor:COLORS.navy
},

flex:{
flex:1
},

container:{
flexGrow:1,
backgroundColor:COLORS.navy,
justifyContent:"center",
padding:SPACING.lg
},

title:{
fontSize:FONT_SIZES.hero,
fontWeight:FONT_WEIGHTS.extrabold,
color:COLORS.white,
marginBottom:SPACING.xl,
textAlign:"center"
},

label:{
color:COLORS.gray200,
marginBottom:SPACING.sm
},

input:{
backgroundColor:COLORS.white,
padding:SPACING.md,
borderRadius:RADIUS.md,
marginBottom:SPACING.md,
fontSize:FONT_SIZES.md
},

modeRow:{
flexDirection:"row",
marginBottom:SPACING.md
},

modeBtn:{
flex:1,
padding:SPACING.md,
backgroundColor:COLORS.gray100,
borderRadius:RADIUS.md,
alignItems:"center",
marginRight:SPACING.sm
},

modeActive:{
backgroundColor:COLORS.accent
},

modeText:{
fontWeight:FONT_WEIGHTS.bold
},

button:{
backgroundColor:COLORS.accent,
padding:SPACING.md,
borderRadius:RADIUS.md,
alignItems:"center"
},

buttonText:{
color:COLORS.white,
fontWeight:FONT_WEIGHTS.bold
}

})