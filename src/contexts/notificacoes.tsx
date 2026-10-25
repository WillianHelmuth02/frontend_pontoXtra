import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/auth';
import { api } from '@/services/api';
import { ativarPush, observarPush, cancelarRegistroPush } from '@/services/push';

export type Aviso = { id: string; jornada_id: string; titulo: string; mensagem: string; lida_em: string | null; criada_em: string };
export type ListaAvisos = { itens: Aviso[]; nao_lidas: number; proximo: string | null };
type Contexto = { lista: ListaAvisos; erro: string; atualizar: () => Promise<void>; ler: (id: string) => Promise<void> };
const Context = createContext<Contexto | null>(null);
const vazia: ListaAvisos = { itens: [], nao_lidas: 0, proximo: null };

export function NotificacoesProvider({ children }: PropsWithChildren) {
  const { usuario } = useAuth();
  return <SessaoAvisos key={usuario?.id ?? 'sem-sessao'} usuarioId={usuario?.id}>{children}</SessaoAvisos>;
}

function SessaoAvisos({ usuarioId, children }: PropsWithChildren<{ usuarioId?: string }>) {
  const [lista, setLista] = useState<ListaAvisos>(vazia);
  const [erro, setErro] = useState('');
  const atualizar = useCallback(async () => {
    if (!usuarioId) return;
    const result = await api<ListaAvisos>('/notificacoes');
    setLista(result);
    setErro('');
  }, [usuarioId]);
  const ler = useCallback(async (id: string) => {
    await api<void>(`/notificacoes/${id}/lida`, { method: 'PATCH' });
    await atualizar();
  }, [atualizar]);

  useEffect(() => {
    if (!usuarioId) return;
    let vivo = true;
    // Respostas de outra sessão nunca atualizam este provider, reiniciado por usuário.
    const refresh = () => { void atualizar().catch(() => { if (vivo) setErro('Não foi possível atualizar os avisos. Tente novamente.'); }); };
    refresh();
    const intervalo = setInterval(() => { if (AppState.currentState === 'active') refresh(); }, 15000);
    const estado = AppState.addEventListener('change', (s) => { if (s === 'active') refresh(); });
    void ativarPush(false).catch(() => {}); // Reassocia apenas se já houver permissão.
    const parar = observarPush(refresh, (data) => {
      if (!vivo || String(data.usuarioId) !== usuarioId || !/^[1-9]\d{0,19}$/.test(String(data.jornadaId)) || !/^[1-9]\d{0,19}$/.test(String(data.notificacaoId))) return;
      void ler(String(data.notificacaoId)).catch(() => {});
      router.push({ pathname: '/jornada', params: { id: String(data.jornadaId) } });
    });
    return () => { vivo = false; cancelarRegistroPush(); clearInterval(intervalo); estado.remove(); parar(); };
  }, [usuarioId, atualizar, ler]);
  return <Context.Provider value={{ lista, erro, atualizar, ler }}>{children}</Context.Provider>;
}
export function useNotificacoes() {
  const value = useContext(Context);
  if (!value) throw new Error('Provider de notificações ausente.');
  return value;
}
