import { Stack } from 'expo-router';

/**
 * Navegador principal compartilhado pelas rotas da pasta app.
 * O Stack gerencia o histórico usado por push e replace nas telas.
 * headerShown: false deixa as páginas desenharem seu próprio cabeçalho,
 * sem a barra de título automática acima da composição visual.
 */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
