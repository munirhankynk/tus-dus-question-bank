import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback
} from 'react-native'
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from '../../constants'
import { supabase } from '../../services/supabase'

export default function RegisterScreen() {

const router = useRouter()

const [email,setEmail] = useState('')
const [password,setPassword] = useState('')
const [confirmPassword,setConfirmPassword] = useState('')

const handleRegister = async () => {

if(!email.includes("@")){
Alert.alert("Email Hatası","Geçerli bir email giriniz")
return
}

if(password.length < 6){
Alert.alert("Şifre Hatası","Şifre en az 6 karakter olmalıdır")
return
}

if(password !== confirmPassword){
Alert.alert("Şifre Hatası","Şifreler eşleşmiyor")
return
}

const { error } = await supabase.auth.signUp({
email,
password
})

if(error){
Alert.alert("Kayıt Hatası",error.message)
return
}

router.replace('/(auth)/profile-setup')

}

return (

<KeyboardAvoidingView
style={{flex:1}}
behavior={Platform.OS === "ios" ? "padding" : "height"}
>

<TouchableWithoutFeedback onPress={Keyboard.dismiss}>

<ScrollView
contentContainerStyle={styles.container}
keyboardShouldPersistTaps="handled"
>

<Text style={styles.title}>📝 Kayıt Ol</Text>

<TextInput
  style={styles.input}
  placeholder="Email"
  placeholderTextColor={COLORS.gray300}
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
/>

<TextInput
  style={styles.input}
  placeholder="Şifre"
  placeholderTextColor={COLORS.gray300}
  value={password}
  onChangeText={setPassword}
  secureTextEntry
/>

<Text style={styles.passwordHint}>
Şifre en az 6 karakter olmalıdır
</Text>

<TextInput
placeholder="Şifre Tekrar"
placeholderTextColor={COLORS.gray300}
style={styles.input}
secureTextEntry
value={confirmPassword}
onChangeText={setConfirmPassword}
autoCapitalize="none"
/>

<TouchableOpacity
style={styles.button}
onPress={handleRegister}
>
<Text style={styles.buttonText}>Kayıt Ol</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.loginLink}
onPress={()=>router.push('/(auth)/login')}
>
<Text style={styles.loginText}>
Zaten hesabın var mı? Giriş yap
</Text>
</TouchableOpacity>

</ScrollView>

</TouchableWithoutFeedback>

</KeyboardAvoidingView>

)

}

const styles = StyleSheet.create({

container:{
flexGrow:1,
backgroundColor:COLORS.navy,
justifyContent:'center',
padding:SPACING.lg
},

title:{
fontSize:FONT_SIZES.hero,
fontWeight:FONT_WEIGHTS.extrabold,
color:COLORS.white,
marginBottom:SPACING.xl,
textAlign:'center'
},

input:{
backgroundColor:COLORS.white,
padding:SPACING.md,
borderRadius:RADIUS.md,
marginBottom:SPACING.md,
fontSize:FONT_SIZES.md
},

passwordHint:{
color:COLORS.gray300,
fontSize:FONT_SIZES.sm,
marginBottom:SPACING.md
},

button:{
backgroundColor:COLORS.accent,
padding:SPACING.md,
borderRadius:RADIUS.md,
alignItems:'center'
},

buttonText:{
color:COLORS.white,
fontWeight:FONT_WEIGHTS.bold,
fontSize:FONT_SIZES.md
},

loginLink:{
marginTop:SPACING.lg,
alignItems:'center'
},

loginText:{
color:COLORS.gray200,
fontSize:FONT_SIZES.sm
}

})