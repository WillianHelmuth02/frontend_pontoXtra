import { Stack } from 'expo-router';
import { AuthProvider } from '@/contexts/auth';

/**
 * Navegador principal compartilhado pelas rotas da pasta app.
 * O Stack gerencia o histórico usado por push e replace nas telas.
 * headerShown: false deixa as páginas desenharem seu próprio cabeçalho,
 * sem a barra de título automática acima da composição visual.
 */
export default function RootLayout() {
  // O provider fica acima do navegador para manter a sessão ao trocar de tela.
  return <AuthProvider><Stack screenOptions={{ headerShown: false }} /></AuthProvider>;
}
