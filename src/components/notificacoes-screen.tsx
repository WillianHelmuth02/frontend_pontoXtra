import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useNotificacoes, type Aviso, type ListaAvisos } from '@/contexts/notificacoes';
import { useAuth } from '@/contexts/auth';
import { ativarPush } from '@/services/push';
import { api } from '@/services/api';
import { JourneyShell, Button, ui } from '@/components/journey-ui';

export default function NotificacoesScreen() {
  const { usuario } = useAuth();
  const { lista, erro, atualizar, ler } = useNotificacoes();
  const [mais, setMais] = useState<Aviso[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [mensagem, setMensagem] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const executar = async (fn: () => Promise<void>) => {
    setOcupado(true); setMensagem('');
    try { await fn(); } catch (e) { setMensagem(e instanceof Error ? e.message : 'Não foi possível concluir.'); } finally { setOcupado(false); }
  };
  const proximo = cursor === undefined ? lista.proximo : cursor;
  const itens = [...lista.itens, ...mais.filter((n) => !lista.itens.some((a) => a.id === n.id))];
  if (!usuario) return <JourneyShell title="Notificações" />;
  return <JourneyShell title="Notificações" busy={ocupado}>
    <Text style={ui.text}>{lista.nao_lidas} aviso(s) não lido(s).</Text>
    <Button label="Ativar avisos neste celular" disabled={ocupado} onPress={() => void executar(async () => setMensagem(await ativarPush()))} />
    <Button label="Atualizar" secondary disabled={ocupado} onPress={() => void executar(async () => { await atualizar(); setMais([]); setCursor(undefined); })} />
    {!!erro && <Text accessibilityRole="alert" style={ui.error}>{erro}</Text>}
    {!!mensagem && <Text accessibilityRole="alert" style={ui.text}>{mensagem}</Text>}
    {!itens.length && !erro && <Text style={ui.text}>Nenhum aviso por enquanto.</Text>}
    {itens.map((n) => <View key={n.id} style={ui.card}>
      <Text style={ui.subtitle}>{!n.lida_em ? '● ' : ''}{n.titulo}</Text>
      <Text style={ui.text}>{n.mensagem}</Text>
      <Text style={ui.text}>Jornada #{n.jornada_id} · {new Date(n.criada_em).toLocaleString('pt-BR')}</Text>
      <Button secondary label="Ver jornada" disabled={ocupado} onPress={() => void executar(async () => { await ler(n.id); router.push({ pathname: '/jornada', params: { id: n.jornada_id } }); })} />
      {!n.lida_em && <Button secondary label="Marcar como lida" disabled={ocupado} onPress={() => void executar(async () => { await ler(n.id); setMais((prev) => prev.map((a) => a.id === n.id ? { ...a, lida_em: new Date().toISOString() } : a)); })} />}
    </View>)}
    {!!proximo && <Button secondary label="Carregar anteriores" disabled={ocupado} onPress={() => void executar(async () => { const page = await api<ListaAvisos>(`/notificacoes?antes=${proximo}`); setMais((p) => [...p, ...page.itens.filter((n) => !p.some((a) => a.id === n.id))]); setCursor(page.proximo); })} />}
  </JourneyShell>;
}
