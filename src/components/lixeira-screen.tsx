import { useCallback, useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { carregarLixeira, detalhesLixeira, operarLixeira } from '@/services/jornadas';
import { dinheiro, formatarData, horarioFormulario } from '@/utils/jornadas';
import { History } from './journey-details';
import { Button, JourneyShell, ResourceState, ui } from './journey-ui';

export default function LixeiraScreen() {
  const { usuario } = useAuth();
  const loader = useCallback(() => carregarLixeira(), []);
  const resource = useApiResource(loader, !!usuario);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [action, setAction] = useState<'restaurar' | 'excluir' | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [details, setDetails] = useState<Awaited<ReturnType<typeof detalhesLixeira>> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const writing = useRef(false);
  const detailSequence = useRef(0);
  const data = resource.data;
  const canWrite = resource.fresh && !resource.loading && !pending && !detailLoading && selectedIds.length > 0
    && selectedIds.length <= 50 && selectedIds.every((id) => data?.jornadas.some((j) => j.id === id));

  async function showDetails(id: string) {
    const current = ++detailSequence.current;
    setDetailLoading(true); setDetails(null); setError('');
    try {
      const result = await detalhesLixeira(id);
      if (current === detailSequence.current) setDetails(result);
    } catch (cause) {
      if (current === detailSequence.current) setError(cause instanceof Error ? cause.message : 'Não foi possível consultar detalhes.');
    } finally { if (current === detailSequence.current) setDetailLoading(false); }
  }

  async function confirm() {
    if (!action || !canWrite || writing.current) return;
    writing.current = true; setPending(true); setError(''); setNotice('');
    detailSequence.current++; setDetails(null);
    try {
      const result = await operarLixeira(selectedIds, action);
      setNotice(action === 'excluir'
        ? `${result.quantidade} jornada(s) e seus históricos foram excluídos definitivamente.`
        : `${result.quantidade} jornada(s) restaurada(s) como Cancelado.`);
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : 'Não foi possível confirmar.'} Atualize a lista antes de selecionar e tentar novamente.`);
    } finally {
      setAction(null); setSelectedIds([]);
      await resource.reload(); writing.current = false; setPending(false);
    }
  }

  async function reload() {
    if (pending) return;
    detailSequence.current++; setDetailLoading(false); setDetails(null); setSelectedIds([]);
    await resource.reload();
  }

  return <JourneyShell title="Lixeira de jornadas" busy={pending}>
    <Text style={ui.text}>Somente jornadas canceladas e sem marcações ficam aqui. Restaurar devolve à consulta como Cancelado. Excluir definitivamente apaga a jornada e todo o seu histórico do banco, sem recuperação pelo aplicativo.</Text>
    <Text style={ui.text}>{usuario?.perfil === 'RH' ? 'RH pode gerenciar as jornadas da lixeira.' : 'Você pode consultar e gerenciar as jornadas de sua autoria na lixeira.'}</Text>
    <ResourceState loading={resource.loading} error={resource.error} onRetry={() => void reload()} />
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={ui.notice}>{notice}</Text>}
    {resource.fresh && <>
      <Text style={ui.subtitle}>{data?.jornadas.length ?? 0} jornada(s) · {selectedIds.length} selecionada(s)</Text>
      <Button secondary label="Atualizar lixeira" disabled={pending || detailLoading} onPress={() => void reload()} />
      <View style={ui.row}>
        <Button label="Restaurar selecionadas" secondary disabled={!canWrite} onPress={() => setAction('restaurar')} />
        <Button label="Excluir definitivamente" danger disabled={!canWrite} onPress={() => setAction('excluir')} />
      </View>
      {!data?.jornadas.length && <Text style={ui.text}>A lixeira está vazia.</Text>}
      {data?.jornadas.map((j) => {
        const checked = selectedIds.includes(j.id);
        const nome = data.prestadores.find((p) => p.id === j.prestador_id)?.nome ?? `Prestador #${j.prestador_id}`;
        return <View style={ui.card} key={j.id}>
          <Text style={ui.subtitle}>{nome}</Text>
          <Text style={ui.text}>#{j.id} · {formatarData(j.data_jornada)} · Cancelado</Text>
          <Text style={ui.text}>Função: {data.funcoes.find((f) => f.id === j.funcao_id)?.nome ?? `#${j.funcao_id}`}</Text>
          <Text style={ui.text}>Setor: {data.setores.find((s) => s.id === j.setor_id)?.nome ?? `#${j.setor_id}`}</Text>
          <Text style={ui.text}>Valor/hora histórico: {dinheiro(j.valor_hora)}</Text>
          <Text style={ui.text}>Enviada à lixeira em {horarioFormulario(j.excluida_em)} · Usuário #{j.excluida_por}</Text>
          <Button label={checked ? '✓ Selecionada — desmarcar' : 'Selecionar jornada'} secondary={!checked}
            disabled={pending || detailLoading || (!checked && selectedIds.length >= 50)}
            onPress={() => setSelectedIds((ids) => checked ? ids.filter((id) => id !== j.id) : [...ids, j.id])} />
          <Button label="Ver histórico" secondary disabled={pending || detailLoading} onPress={() => void showDetails(j.id)} />
        </View>;
      })}
    </>}
    {detailLoading && <Text style={ui.text}>Consultando histórico…</Text>}
    {details && resource.fresh && <View style={ui.card}>
      <Text style={ui.subtitle}>Histórico da jornada #{details.jornada.id}</Text>
      <History items={details.historico} />
      <Button secondary label="Fechar histórico" onPress={() => setDetails(null)} />
    </View>}
    <Modal visible={!!action} transparent animationType="fade" onRequestClose={() => { if (!pending) setAction(null); }}>
      <View style={{ flex: 1, backgroundColor: '#001B4266', padding: 24, alignItems: 'center', justifyContent: 'center' }}>
        <View accessibilityViewIsModal style={[ui.card, { width: '100%', maxWidth: 520, backgroundColor: '#FFFFFF' }]}>
          <Text style={ui.subtitle}>{action === 'excluir' ? 'Excluir definitivamente?' : 'Restaurar como Cancelado?'}</Text>
          <Text style={ui.text}>{selectedIds.length} jornada(s) selecionada(s).</Text>
          <Text style={ui.text}>{action === 'excluir'
            ? 'A jornada e todas as informações do seu histórico serão removidas do banco de dados. Não será possível consultá-las ou restaurá-las pelo aplicativo após esta ação.'
            : 'As jornadas voltarão à consulta com status Cancelado. A restauração não autoriza realização nem reabre a jornada.'}</Text>
          <Button label={pending ? 'Registrando…' : action === 'excluir' ? 'Excluir definitivamente' : 'Confirmar restauração'} danger={action === 'excluir'} disabled={!canWrite} onPress={() => void confirm()} />
          <Button label="Voltar" secondary disabled={pending} onPress={() => setAction(null)} />
        </View>
      </View>
    </Modal>
  </JourneyShell>;
}
