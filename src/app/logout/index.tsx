import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Posições [esquerda, topo] dos círculos decorativos, em unidades de layout.
 * O desenho usa uma área central de 414 de largura, baseada na imagem de referência.
 * Alterar um par move apenas aquela forma; posições negativas criam os recortes nas bordas.
 */
const circles = [
  [-32, 9], [9, 2], [130, -20], [117, 19], [294, -54],
  [331, -41], [321, 56], [310, 109], [46, 106], [160, 86],
  [200, 79], [-25, 162], [5, 190], [327, 217], [366, 227],
  [-57, 282], [53, 299], [366, 334],
];

/**
 * Confirmação de saída: revoga a sessão na API e descarta o token local.
 * Se a rede falhar, informa o erro e permite tentar novamente.
 */
export default function LogoutScreen() {
  // Insets representam áreas reservadas pelo sistema, como notch e indicador inferior.
  const insets = useSafeAreaInsets();
  const { usuario, logout } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function confirmLogout() {
    if (pending) return;
    setPending(true);
    setError('');
    try { await logout(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível sair.'); }
    finally { setPending(false); }
  }
  // Protege a confirmação contra acesso direto sem uma sessão ativa.
  if (!usuario) return <Redirect href="/login/index" />;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {/* A rolagem mantém o botão alcançável em aparelhos com pouca altura útil. */}
      <ScrollView bounces={false} contentContainerStyle={styles.content}>
        {/* Fundo sem interação; overflow no cabeçalho recorta as formas nas bordas. */}
        <View pointerEvents="none" style={styles.header}>
          <View style={styles.pattern}>
            {circles.map(([left, top], index) => (
              <View key={index} style={[styles.circle, { left, top }]} />
            ))}
          </View>
        </View>
        {/* AJUSTE DA ALTURA DA LOGO: 130 é a distância mínima do topo ao cartão.
            insets.top + 70 aumenta essa distância se a área do sistema exigir.
            Aumentar o mínimo desce o cartão e todo o painel que vem depois dele. */}
        <View style={[styles.logoCard, { marginTop: Math.max(130, insets.top + 70) }]}>
          <Image
            source={require('@/assets/images/Logo/Logo principal.png')}
            contentFit="contain"
            accessibilityLabel="PontoXtra"
            style={styles.logo}
          />
        </View>
        {/* O painel começa atrás da logo e se estende pelo restante da tela.
            A margem inferior respeita o sistema e garante pelo menos 32 de respiro. */}
        <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 32) }]}>
          <Text style={styles.title}>Logout</Text>
          <Text style={styles.subtitle}>Tem Certeza?</Text>
          {/* O contexto encerra a sessão somente após a resposta da API (ou 401).
              Sem usuário, o Redirect acima leva de volta ao login. */}
          <Pressable
            accessibilityRole="button"
            disabled={pending}
            onPress={confirmLogout}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <Text style={styles.buttonText}>{pending ? 'Saindo…' : 'Sair'}</Text>
          </Pressable>
          {error ? <Text accessibilityRole="alert" style={{ color: '#B42318', marginTop: 16 }}>{error}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fundo claro fixo. flexGrow preenche a tela mesmo quando há pouco conteúdo.
  screen: { flex: 1, backgroundColor: '#EEEEEE' },
  content: { flexGrow: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 390, backgroundColor: '#005D25', overflow: 'hidden' },
  // Mantém a composição decorativa centralizada em larguras diferentes da referência.
  pattern: { width: 414, height: 390, alignSelf: 'center' },
  circle: { position: 'absolute', width: 73, height: 73, borderRadius: 37, backgroundColor: '#062354' },
  // zIndex coloca a marca acima do painel. maxWidth limita o cartão em telas estreitas.
  logoCard: { width: 280, height: 280, maxWidth: '90%', alignSelf: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  logo: { width: '100%', height: '100%' },
  // A sobreposição de 76 cria a transição atrás da logo. paddingTop de 86 deixa
  // 10 de espaço após o cartão antes do título. minHeight mantém o painel longo
  // da referência, permitindo rolagem em telas menores.
  panel: { flex: 1, minHeight: 562, marginTop: -76, paddingTop: 86, paddingHorizontal: 32, backgroundColor: '#EEEEEE', borderTopLeftRadius: 64, borderTopRightRadius: 64, alignItems: 'center' },
  title: { fontSize: 46, lineHeight: 58, fontWeight: '800', letterSpacing: -1.5, color: '#1D2323' },
  subtitle: { marginTop: 8, fontSize: 14, lineHeight: 20, color: '#666666' },
  // AJUSTE DO BOTÃO: marginTop define a distância após a pergunta de confirmação.
  // A largura acompanha o painel até o limite de 268, mantendo o botão centralizado.
  button: { marginTop: 74, width: '100%', maxWidth: 268, height: 47, borderRadius: 8, backgroundColor: '#FF3035', alignItems: 'center', justifyContent: 'center' },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
});
