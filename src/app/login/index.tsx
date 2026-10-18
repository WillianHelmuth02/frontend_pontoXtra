import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const circles = [
  { top: -35, left: -26, width: 78, height: 78, backgroundColor: '#06265E' },
  { top: 4, left: 9, width: 67, height: 67, backgroundColor: '#00651F' },
  { top: -30, right: 10, width: 82, height: 82, backgroundColor: '#06265E' },
  { top: -20, right: 66, width: 53, height: 53, backgroundColor: '#00651F' },
  { top: 22, left: 117, width: 72, height: 72, backgroundColor: '#00651F' },
  { top: 48, left: 130, width: 72, height: 72, backgroundColor: '#06265E' },
  { top: 76, right: 8, width: 84, height: 84, backgroundColor: '#06265E' },
  { top: 108, right: -13, width: 70, height: 70, backgroundColor: '#00651F' },
  { top: 157, left: 45, width: 73, height: 73, backgroundColor: '#06265E' },
  { top: 165, right: 22, width: 68, height: 68, backgroundColor: '#06265E' },
  { top: 215, left: -19, width: 72, height: 72, backgroundColor: '#00651F' },
  { top: 238, right: -27, width: 71, height: 71, backgroundColor: '#00651F' },
  { top: 285, left: 1, width: 68, height: 68, backgroundColor: '#06265E' },
];

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View pointerEvents="none" style={styles.header}>
        {circles.map((circle, index) => <View key={index} style={[styles.circle, circle]} />)}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoidingView}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView bounces={false} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.logoCard}>
              <Image contentFit="contain" source={require('@/assets/images/Logo/Logo principal.png')} style={styles.logo} />
            </View>
            <View style={styles.formPanel}>
              <Text style={styles.title}>Login</Text>
              <View style={styles.fields}>
                <View>
                  <Text style={styles.label}>NOME</Text>
                  <TextInput autoCapitalize="words" autoComplete="name" onChangeText={setName} placeholder="Seu nome" placeholderTextColor="#666666" style={styles.input} value={name} />
                </View>
                <View>
                  <Text style={styles.label}>SENHA</Text>
                  <TextInput autoComplete="password" onChangeText={setPassword} placeholder="••••••••" placeholderTextColor="#666666" secureTextEntry style={styles.input} value={password} />
                </View>
                <Pressable accessibilityRole="button" style={styles.loginButton}><Text style={styles.loginButtonText}>Entrar</Text></Pressable>
              </View>
              <Pressable accessibilityRole="button" hitSlop={8}><Text style={styles.forgotPassword}>Esqueceu a senha?</Text></Pressable>
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/logout/index')}><Text style={styles.exit}>Sair</Text></Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1F1F1' },
  header: { ...StyleSheet.absoluteFill, height: 365, backgroundColor: '#00651F', overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999 },
  keyboardAvoidingView: { flex: 1 }, safeArea: { flex: 1 }, scrollContent: { flexGrow: 1, paddingTop: 106 },
  logoCard: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 280, height: 280, borderRadius: 17, backgroundColor: '#FFFFFF', shadowColor: '#00245B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, zIndex: 1 },
  logo: { width: 255, height: 255 },
  formPanel: { flex: 1, minHeight: 440, marginTop: -76, paddingTop: 159, paddingHorizontal: 32, alignItems: 'center', borderTopLeftRadius: 52, borderTopRightRadius: 52, backgroundColor: '#F1F1F1' },
  title: { color: '#1E2424', fontSize: 46, fontWeight: '800', letterSpacing: -1.5 },
  fields: { alignSelf: 'stretch', marginTop: 45, gap: 13 },
  label: { marginLeft: 3, marginBottom: 5, color: '#606060', fontSize: 12, fontWeight: '500', letterSpacing: 2.1 },
  input: { height: 57, paddingHorizontal: 23, borderRadius: 17, color: '#383838', backgroundColor: '#CECECE', fontSize: 16 },
  loginButton: { height: 48, marginTop: 7, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D2323' },
  loginButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  forgotPassword: { marginTop: 43, color: '#696969', fontSize: 16 }, exit: { marginTop: 7, color: '#FF3131', fontSize: 16 },
});
