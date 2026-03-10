import { useRouter } from 'expo-router'
import { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { COLORS, FONT_SIZES, FONT_WEIGHTS, RADIUS, SPACING } from '../../constants'
import { supabase } from '../../services/supabase'

export default function LoginScreen() {

  const router = useRouter()

  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')

  const handleLogin = async () => {

    if(!email || !password){
      alert("Email ve şifre gir")
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if(error){
      alert(error.message)
      return
    }

  }

  return (

    <View style={styles.container}>

      <Text style={styles.title}>🔐 Giriş Yap</Text>

      <TextInput
        placeholder="Email"
        placeholderTextColor={COLORS.gray300}
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Şifre"
        placeholderTextColor={COLORS.gray300}
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Giriş Yap</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.registerLink}
        onPress={() => router.push('/(auth)/register')}
      >
        <Text style={styles.registerText}>
          Hesabın yok mu? Kayıt ol
        </Text>
      </TouchableOpacity>

    </View>

  )

}

const styles = StyleSheet.create({

container:{
flex:1,
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

button:{
backgroundColor:COLORS.accent,
padding:SPACING.md,
borderRadius:RADIUS.md,
alignItems:'center',
marginTop:SPACING.sm
},

buttonText:{
color:COLORS.white,
fontWeight:FONT_WEIGHTS.bold,
fontSize:FONT_SIZES.md
},

registerLink:{
marginTop:SPACING.lg,
alignItems:'center'
},

registerText:{
color:COLORS.gray200,
fontSize:FONT_SIZES.sm
}

})