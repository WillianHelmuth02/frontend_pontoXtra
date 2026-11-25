import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState, type ElementRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/app-text';
import { FontSizeControl } from '@/components/font-size-control';
import { useAppLayout } from '@/hooks/use-app-layout';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Decoração do cabeçalho: cada objeto define posição, tamanho e cor de um círculo.
 * Coordenadas negativas deixam parte da forma fora da tela, como na referência.
 * A ordem do array também é a ordem de desenho: os últimos ficam sobre os primeiros.
 */
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

/**
 * Tela de entrada do PontoXtra, com cores fixas para o tema claro.
 * Envia e-mail e senha à API e apresenta falhas de validação ou de conexão.
 */
export default function LoginScreen() {
  // Campos controlados pelo React. A senha permanece apenas no estado desta tela;
  // secureTextEntry oculta a digitação, mas não substitui proteção no envio à API.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const rolagem = useRef<ElementRef<typeof ScrollView>>(null);
  const campoEmail = useRef<ElementRef<typeof TextInput>>(null);
  const campoSenha = useRef<ElementRef<typeof TextInput>>(null);
  const { usuario, login } = useAuth();
  const { split, wide, short } = useAppLayout();

  function mostrarCampoAtivo() {
    if (Platform.OS === 'web' || !Keyboard.isVisible()) return;
    requestAnimationFrame(() => {
      const campo = campoSenha.current?.isFocused() ? campoSenha.current : campoEmail.current;
      if (campo?.isFocused()) rolagem.current?.scrollResponderScrollNativeHandleToKeyboard(campo, 40, true);
    });
  }

  // Evita novo envio durante a requisição. A senha não recebe trim: espaços
  // podem fazer parte da credencial. A validação definitiva ocorre no backend.
  async function submit() {
    if (pending) return;
    if (!email.trim() || !password) { setError('Informe e-mail e senha.'); return; }
    setPending(true);
    setError('');
    try { await login(email, password); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível entrar.'); }
    finally { setPending(false); }
  }

  if (usuario) return <Redirect href="/session" />;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      {/* O fundo é decorativo e não deve interceptar toques no formulário. */}
      <View pointerEvents="none" style={[styles.header, split && styles.splitHeader]}>
        {circles.map((circle, index) => <View key={index} style={[styles.circle, circle]} />)}
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'web' ? undefined : 'padding'} style={styles.keyboardAvoidingView}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView ref={rolagem} bounces={false} contentContainerStyle={[styles.scrollContent, short && styles.shortContent, split && styles.splitContent]}
            keyboardShouldPersistTaps="handled" onKeyboardDidShow={mostrarCampoAtivo} onLayout={mostrarCampoAtivo}>
            <View style={styles.fontControl}><FontSizeControl /></View>
            {/* Cartão branco sobreposto ao painel. contentFit preserva a marca
                inteira e sua proporção, sem recortar o arquivo original. */}
            <View style={[styles.logoCard, short && styles.shortLogoCard]}>
              <Image contentFit="contain" source={require('@/assets/images/Logo/Logo principal.png')} style={styles.logo} />
            </View>
            <View style={[styles.formPanel, short && styles.shortPanel, split && styles.splitPanel]}>
              <Text style={styles.title}>Login</Text>
              {/* Os rótulos ficam fora dos inputs para continuar visíveis ao digitar. */}
              <View style={[styles.fields, wide && styles.wideFields, short && styles.shortFields]}>
                <View>
                  <Text style={styles.label}>E-MAIL</Text>
                  <TextInput ref={campoEmail} accessibilityLabel="E-mail" autoCapitalize="none" autoCorrect={false}
                    keyboardType="email-address" autoComplete="email" returnKeyType="next" submitBehavior="submit"
                    onSubmitEditing={() => campoSenha.current?.focus()} onFocus={mostrarCampoAtivo}
                    onChangeText={setEmail} placeholder="Seu e-mail" placeholderTextColor="#666666" style={styles.input} value={email} editable={!pending} />
                </View>
                <View>
                  <Text style={styles.label}>SENHA</Text>
                  <TextInput ref={campoSenha} accessibilityLabel="Senha" autoComplete="password" returnKeyType="done"
                    onFocus={mostrarCampoAtivo} onSubmitEditing={submit} onChangeText={setPassword}
                    placeholder="••••••••" placeholderTextColor="#666666" secureTextEntry style={styles.input} value={password} editable={!pending} />
                </View>
                {error ? <Text accessibilityRole="alert" style={{ color: '#B42318' }}>{error}</Text> : null}
                {/* Desabilitar o botão também impede envios duplicados por toque. */}
                <Pressable accessibilityRole="button" disabled={pending} onPress={submit} style={[styles.loginButton, pending && { opacity: 0.6 }]}><Text style={styles.loginButtonText}>{pending ? 'Entrando…' : 'Entrar'}</Text></Pressable>
              </View>
              {/* Recuperação de senha ainda sem ação. hitSlop amplia a área de toque
                  sem aumentar o texto ou alterar o espaçamento visual. */}
              <Text style={styles.forgotPassword}>Para recuperar a senha, contate o administrador.</Text>
              {/* Abre a confirmação de saída, mantendo esta tela no histórico. */}
              <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/logout')}><Text style={styles.exit}>Sair</Text></Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Cores explícitas mantêm esta interface clara, independentemente do tema do aparelho.
  screen: { flex: 1, backgroundColor: '#F1F1F1' },
  header: { ...StyleSheet.absoluteFill, height: 365, backgroundColor: '#00651F', overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999 },
  keyboardAvoidingView: { flex: 1 }, safeArea: { flex: 1 }, scrollContent: { flexGrow: 1, paddingTop: 106 },
  fontControl: { position: 'absolute', top: 16, right: 20 },
  shortContent: { paddingTop: 68 },
  splitContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', padding: 28, paddingTop: 68, gap: 24, width: '100%', maxWidth: 1080, alignSelf: 'center' },
  splitHeader: { right: '53%', height: '100%' },
  logoCard: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', width: 280, height: 280, borderRadius: 17, backgroundColor: '#FFFFFF', shadowColor: '#00245B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3, zIndex: 1 },
  logo: { width: '91%', height: '91%' },
  shortLogoCard: { width: 180, height: 180 },
  formPanel: { flex: 1, minHeight: 440, marginTop: -76, paddingTop: 159, paddingBottom: 32, paddingHorizontal: 32, alignItems: 'center', borderTopLeftRadius: 52, borderTopRightRadius: 52, backgroundColor: '#F1F1F1' },
  shortPanel: { minHeight: 0, paddingTop: 96 },
  splitPanel: { flexGrow: 1, minHeight: 0, marginTop: 0, paddingTop: 12, paddingBottom: 16, maxWidth: 480 },
  title: { color: '#1E2424', fontSize: 46, fontWeight: '800', letterSpacing: -1.5 },
  fields: { alignSelf: 'stretch', marginTop: 45, gap: 13 },
  wideFields: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  shortFields: { marginTop: 16 },
  label: { marginLeft: 3, marginBottom: 5, color: '#606060', fontSize: 12, fontWeight: '500', letterSpacing: 2.1 },
  input: { height: 57, paddingHorizontal: 23, borderRadius: 17, color: '#383838', backgroundColor: '#CECECE', fontSize: 16 },
  loginButton: { height: 48, marginTop: 7, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1D2323' },
  loginButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  forgotPassword: { marginTop: 43, color: '#696969', fontSize: 16 }, exit: { marginTop: 7, color: '#FF3131', fontSize: 16 },
});
