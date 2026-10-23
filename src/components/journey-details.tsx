import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { api } from '@/services/api';
import { carregarDetalhes } from '@/services/jornadas';
import { ACAO_LABELS, STATUS_LABELS, acoesPermitidas, dataParaApi, dinheiro, formatarData, horarioFormulario, type AcaoJornada, type HistoricoJornada, type Jornada } from '@/utils/jornadas';
import { Button, Field, JourneyShell, ResourceState, ui } from './journey-ui';

const HISTORICO_LABELS: Record<string, string> = {
  CRIACAO: 'Criação', ENTRADA: 'Entrada', INICIO_INTERVALO: 'Início do intervalo', FIM_INTERVALO: 'Fim do intervalo',
  SAIDA: 'Saída', CONFERENCIA: 'Conferência', AUTORIZACAO: 'Autorização', REJEICAO: 'Rejeição', CORRECAO: 'Correção', PAGAMENTO: 'Pagamento', CANCELAMENTO: 'Cancelamento',
};
const CAMPOS: Record<string, string> = {
  entrada_em: 'Entrada', inicio_intervalo_em: 'Início do intervalo', fim_intervalo_em: 'Fim do intervalo', saida_em: 'Saída',
  data_jornada: 'Data de referência', valor_hora: 'Valor/hora', valor_calculado: 'Valor calculado', minutos_trabalhados: 'Minutos trabalhados',
  status: 'Status', conferida_por: 'Conferida pelo usuário', conferida_em: 'Conferência', decidida_por: 'Decidida pelo usuário', decidida_em: 'Decisão',
  justificativa_rejeicao: 'Justificativa de rejeição', justificativa_cancelamento: 'Motivo do cancelamento', paga_por: 'Pagamento registrado pelo usuário', data_pagamento: 'Data de pagamento',
  prestador_id: 'Prestador (ID)', funcao_id: 'Função (ID)', setor_id: 'Setor (ID)', criada_por: 'Criada pelo usuário',
};
function auditValue(key: string, value: unknown): string {
  if (value == null) return 'Não informado';
  if (key === 'status') return STATUS_LABELS[value as keyof typeof STATUS_LABELS] ?? String(value);
  if (typeof value === 'string' && key.endsWith('_em')) return horarioFormulario(value);
  if (typeof value === 'string' && key.startsWith('data_')) return formatarData(value);
  if (typeof value === 'string' && key.startsWith('valor_')) return dinheiro(value);
  return String(value);
}

/** Auditoria somente leitura. Exibe alterações campo a campo, sem oferecer
 * edição do histórico. Autor usa ID porque a API de usuários é restrita ao ADM.
 */
function History({ items }: { items: HistoricoJornada[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <>
    <Text accessibilityRole="header" style={ui.title}>Histórico de alterações</Text>
    {!items.length && <Text style={ui.text}>Nenhuma alteração registrada.</Text>}
    {items.map((item) => {
      const before = item.dados_anteriores ?? {};
      const after = item.dados_novos ?? {};
      const changes = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
      return <View key={item.id} style={ui.card}>
        <Text style={ui.subtitle}>{HISTORICO_LABELS[item.acao] ?? item.acao}</Text>
        <Text style={ui.text}>{horarioFormulario(item.criado_em)} · Usuário #{item.usuario_id}</Text>
        {typeof after.justificativa_cancelamento === 'string' && <Text style={ui.text}>Motivo: {after.justificativa_cancelamento}</Text>}
        <Button secondary label={expanded === item.id ? 'Ocultar alterações' : 'Ver alterações'} onPress={() => setExpanded(expanded === item.id ? null : item.id)} />
        {expanded === item.id && changes.map((key) => <View key={key}>
          <Text style={ui.label}>{CAMPOS[key] ?? key.replace(/_/g, ' ')}</Text>
          <Text style={ui.text}>Antes: {auditValue(key, before[key])}</Text>
          <Text style={ui.text}>Depois: {auditValue(key, after[key])}</Text>
        </View>)}
      </View>;
    })}
  </>;
}

/** Detalhes e ações são compartilhados, mas a lista de comandos depende do
 * perfil e status. Nenhuma transição livre nem horário operacional é enviado.
 */
export default function JourneyDetails({ id, criada }: { id: string; criada: boolean }) {
  const { usuario } = useAuth();
  const valid = /^[1-9]\d{0,19}$/.test(id);
  const loader = useCallback(() => carregarDetalhes(id), [id]);
  const resource = useApiResource(loader, !!usuario && valid);
  const [action, setAction] = useState<AcaoJornada | null>(null);
  const [motivo, setMotivo] = useState('');
  const [dataPagamento, setDataPagamento] = useState(() => horarioFormulario(new Date().toISOString()).slice(0, 10));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(criada ? 'Jornada criada. A entrada ainda não foi registrada.' : '');
  const writing = useRef(false);
  const data = resource.data;
  const j = data?.jornada;
  const actions = j && usuario && resource.fresh ? acoesPermitidas(usuario.perfil, j, usuario.id) : [];

  async function confirm() {
    if (!action || !usuario || !resource.fresh || writing.current) return;
    let body: Record<string, string> | undefined;
    try {
      if (action === 'rejeitar' || action === 'cancelar') {
        if (!motivo.trim() || Array.from(motivo.trim()).length > 1000) throw new Error('Informe uma justificativa de 1 a 1000 caracteres.');
        body = { justificativa: motivo.trim() };
      }
      if (action === 'pagar') {
        if (!dataPagamento.trim()) throw new Error('Informe a data de pagamento.');
        body = { data_pagamento: dataParaApi(dataPagamento) };
      }
      writing.current = true; setPending(true); setError(''); setNotice('');
      // Releitura não substitui a transação, mas detecta mudanças antes de enviar.
      const current = await api<Jornada>(`/jornadas/${id}`);
      if (!acoesPermitidas(usuario.perfil, current, usuario.id).includes(action)) throw new Error('A jornada foi alterada e não permite mais esta ação.');
      await api<Jornada>(`/jornadas/${id}/${action}`, { method: 'PATCH', ...(body ? { body: JSON.stringify(body) } : {}) });
      setNotice(`${ACAO_LABELS[action]}: operação registrada com sucesso.`);
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'Não foi possível confirmar a operação.'}${writing.current ? ' Confira os dados atualizados antes de tentar novamente.' : ''}`);
    } finally {
      if (writing.current) {
        setAction(null);
        // Apenas GETs após falha: nunca repetimos uma gravação automaticamente.
        await resource.reload(); writing.current = false; setPending(false);
      }
    }
  }

  return <JourneyShell title={`Jornada #${id}`} busy={pending}>
    {!valid ? <Text style={ui.error}>Identificador de jornada inválido.</Text> : <ResourceState loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()} />}
    {!!notice && <Text accessibilityLiveRegion="polite" style={ui.notice}>{notice}</Text>}
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {j && data && <>
      <View style={ui.card}>
        <Text style={ui.subtitle}>{data.prestadores.find((item) => item.id === j.prestador_id)?.nome ?? `Prestador #${j.prestador_id}`}</Text>
        <Text style={ui.text}>Função: {data.funcoes.find((item) => item.id === j.funcao_id)?.nome ?? `#${j.funcao_id}`}</Text>
        <Text style={ui.text}>Setor: {data.setores.find((item) => item.id === j.setor_id)?.nome ?? `#${j.setor_id}`}</Text>
        <Text style={ui.text}>Data de referência: {formatarData(j.data_jornada)}</Text>
        <Text style={ui.label}>{STATUS_LABELS[j.status]}</Text>
      </View>
      <View style={ui.card}>
        <Text style={ui.subtitle}>Marcações · Brasília (UTC-03)</Text>
        {(['entrada_em', 'inicio_intervalo_em', 'fim_intervalo_em', 'saida_em'] as const).map((key) => <Text key={key} style={ui.text}>{CAMPOS[key]}: {j[key] ? horarioFormulario(j[key]) : 'Não registrada'}</Text>)}
        <Text style={ui.text}>Valor/hora histórico: {dinheiro(j.valor_hora)}</Text>
        <Text style={ui.text}>Tempo líquido: {j.minutos_trabalhados === null ? 'Ainda não calculado' : `${Math.floor(j.minutos_trabalhados / 60)}h ${String(j.minutos_trabalhados % 60).padStart(2, '0')}min`}</Text>
        <Text style={ui.label}>Valor calculado: {dinheiro(j.valor_calculado)}</Text>
        {!!j.justificativa_rejeicao && <Text style={ui.error}>Motivo da rejeição: {j.justificativa_rejeicao}</Text>}
        {!!j.data_pagamento && <Text style={ui.text}>Pagamento registrado em: {formatarData(j.data_pagamento)}</Text>}
      </View>
      <Text accessibilityRole="header" style={ui.subtitle}>Ações disponíveis</Text>
      {actions.length === 0 && <Text style={ui.text}>{resource.fresh ? 'Nenhuma alteração disponível para seu perfil no status atual.' : 'Atualize a consulta antes de realizar alterações.'}</Text>}
      {actions.map((command) => <Button key={command} label={ACAO_LABELS[command]} danger={command === 'cancelar' || command === 'rejeitar'} disabled={pending || resource.loading}
        onPress={() => {
          setError(''); setMotivo('');
          if (command === 'corrigir') router.push({ pathname: '/corrigir-jornada', params: { id } });
          else setAction(command);
        }} />)}
      <Button label="Atualizar dados" secondary disabled={pending || resource.loading} onPress={() => void resource.reload()} />
      <History items={data.historico} />
    </>}
    <Button label="Voltar às jornadas" secondary disabled={pending} onPress={() => router.replace('/jornadas')} />

    <Modal visible={!!action} transparent animationType="fade" onRequestClose={() => { if (!pending) setAction(null); }}>
      <View style={{ flex: 1, padding: 24, backgroundColor: '#001B4266', alignItems: 'center', justifyContent: 'center' }}>
        <View accessibilityViewIsModal style={[ui.card, { width: '100%', maxWidth: 520, backgroundColor: '#FFFFFF' }]}>
          <Text accessibilityRole="header" style={ui.subtitle}>{action ? ACAO_LABELS[action] : ''}?</Text>
          <Text style={ui.text}>Jornada #{id} · {data?.prestadores.find((item) => item.id === j?.prestador_id)?.nome}</Text>
          {action === 'cancelar' ? <Text style={ui.text}>A exclusão preserva a jornada e seu histórico, com status Cancelado. Só é permitida antes de qualquer marcação e libera o prestador para outra jornada. Não é possível restaurá-la.</Text>
            : action === 'pagar' ? <Text style={ui.text}>Este registro informa a quitação, sem realizar transferência bancária.</Text>
              : <Text style={ui.text}>A ação será registrada no histórico. Marcações operacionais usam o horário atual do servidor.</Text>}
          {(action === 'cancelar' || action === 'rejeitar') && <Field label="Justificativa *" value={motivo} onChangeText={setMotivo} multiline disabled={pending} />}
          {action === 'pagar' && <Field label="Data do pagamento *" value={dataPagamento} onChangeText={setDataPagamento} placeholder="DD/MM/AAAA" disabled={pending} />}
          {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
          <Button label={pending ? 'Registrando…' : 'Confirmar'} disabled={pending || !resource.fresh} onPress={confirm} />
          <Button label="Voltar" secondary disabled={pending} onPress={() => setAction(null)} />
        </View>
      </View>
    </Modal>
  </JourneyShell>;
}
