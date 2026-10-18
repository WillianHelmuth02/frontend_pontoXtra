import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth';
import { api } from '@/services/api';

/** Página provisória após login: mostra dados reais e comprova uma consulta
 * autenticada. Será substituída pela página inicial dos futuros CRUDs.
 */
export default function SessionScreen() {
  const { usuario } = useAuth();
  const [status, setStatus] = useState('Consultando a sessão na API…');
  useEffect(() => {
    let active = true;
    api<{ nome: string }>('/auth/me').then(
      () => { if (active) setStatus('Sessão validada pela API.'); },
      (error: Error) => { if (active) setStatus(error.message); },
    );
    return () => { active = false; };
  }, []);
  if (!usuario) return <Redirect href="/login/index" />;
  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title}>Olá, {usuario.nome}</Text>
      <Text>{usuario.email}</Text>
      <Text>Perfil: {usuario.perfil}</Text>
      <Text accessibilityLiveRegion="polite">{status}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/logout/index')} style={styles.button}>
        <Text style={styles.buttonText}>Sair</Text>
      </Pressable>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, padding: 32, gap: 16, backgroundColor: '#F1F1F1' },
  title: { fontSize: 28, fontWeight: '700' },
  button: { padding: 16, backgroundColor: '#1D2323', borderRadius: 8 },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '700' },
});
