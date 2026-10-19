import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { api, ApiError } from '@/services/api';
import { acoesPermitidas, formatarData, horarioFormulario, payloadCorrecao, type CorrecaoForm, type Jornada } from '@/utils/jornadas';
import { Button, Field, JourneyShell, ResourceState, ui } from './journey-ui';

/** Mantém os campos do formulário separados do estado consultado, sem sobrescrever
 * a digitação após um render. A edição somente é montada com dados válidos da API.
 */
function CorrectionForm({ jornada }: { jornada: Jornada }) {
  const [form, setForm] = useState<CorrecaoForm>(() => ({
    data_jornada: formatarData(jornada.data_jornada), valor_hora: jornada.valor_hora.replace('.', ','),
    entrada_em: horarioFormulario(jornada.entrada_em), saida_em: horarioFormulario(jornada.saida_em),
    inicio_intervalo_em: horarioFormulario(jornada.inicio_intervalo_em), fim_intervalo_em: horarioFormulario(jornada.fim_intervalo_em),
  }));
  const [payload, setPayload] = useState<ReturnType<typeof payloadCorrecao> | null>(null);
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const writing = useRef(false);
  function review() {
    try { setPayload(payloadCorrecao(form)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Confira os campos.'); }
  }
  async function save() {
    if (writing.current || !payload || uncertain) return;
    writing.current = true; setPending(true); setError('');
    try {
      const current = await api<Jornada>(`/jornadas/${jornada.id}`);
      if (!acoesPermitidas('RH', current).includes('corrigir')) throw new Error('A jornada não permite mais correção. Volte aos detalhes e atualize a consulta.');
      // Detecta alterações concorrentes já visíveis antes da escrita. O backend
      // ainda valida e serializa a transição; não existe atualização livre de status.
      const keys = ['entrada_em', 'saida_em', 'inicio_intervalo_em', 'fim_intervalo_em', 'valor_hora', 'data_jornada', 'status'] as const;
      if (keys.some((key) => current[key] !== jornada[key])) throw new Error('Esta jornada foi alterada por outro usuário. Volte aos detalhes antes de editar novamente.');
      await api<Jornada>(`/jornadas/${jornada.id}/corrigir`, { method: 'PATCH', body: JSON.stringify(payload) });
      router.replace({ pathname: '/jornada', params: { id: jornada.id } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível corrigir a jornada.');
      if (!(cause instanceof ApiError) || cause.status >= 500 || cause.status === 409) setUncertain(true);
      setPayload(null);
    } finally { writing.current = false; setPending(false); }
  }
  const disabled = pending || uncertain;
  return <JourneyShell title={`Corrigir jornada #${jornada.id}`} busy={pending}>
    <Text style={ui.text}>Horários em Brasília (UTC-03), com data completa e segundos. Use DD/MM/AAAA HH:mm:ss, inclusive se a jornada atravessou a meia-noite.</Text>
    <Field label="Data de referência *" value={form.data_jornada} onChangeText={(value) => setForm({ ...form, data_jornada: value })} placeholder="DD/MM/AAAA" disabled={disabled} />
    <Field label="Valor/hora histórico *" value={form.valor_hora} onChangeText={(value) => setForm({ ...form, valor_hora: value })} placeholder="25,50" disabled={disabled} />
    {(['entrada_em', 'inicio_intervalo_em', 'fim_intervalo_em', 'saida_em'] as const).map((key) => <Field key={key}
      label={{ entrada_em: 'Entrada *', inicio_intervalo_em: 'Início do intervalo', fim_intervalo_em: 'Fim do intervalo', saida_em: 'Saída *' }[key]}
      value={form[key]} onChangeText={(value) => setForm({ ...form, [key]: value })} placeholder="DD/MM/AAAA HH:mm:ss" disabled={disabled} />)}
    <Text style={ui.text}>Para remover o intervalo, deixe os dois campos de intervalo vazios. A API recalcula tempo e valor e preserva a versão anterior no histórico.</Text>
    {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
    {uncertain && <Text style={ui.error}>Confira os detalhes atualizados antes de outra tentativa. O envio não será repetido automaticamente.</Text>}
    <Button label="Revisar correção" disabled={disabled} onPress={review} />
    <Button label="Voltar aos detalhes" secondary disabled={pending} onPress={() => router.replace({ pathname: '/jornada', params: { id: jornada.id } })} />
    <Modal visible={!!payload} transparent onRequestClose={() => { if (!pending) setPayload(null); }} animationType="fade">
      <View style={{ flex: 1, backgroundColor: '#001B4266', padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <View accessibilityViewIsModal style={[ui.card, { backgroundColor: '#FFFFFF', width: '100%', maxWidth: 520 }]}>
          <Text style={ui.subtitle}>Confirmar correção?</Text>
          <Text style={ui.text}>A jornada voltará para Aguardando conferência. A conferência e a decisão anteriores serão preservadas no histórico, mas deixarão de valer para os dados corrigidos.</Text>
          <Button label={pending ? 'Salvando…' : 'Confirmar correção'} disabled={pending} onPress={save} />
          <Button label="Voltar ao formulário" secondary disabled={pending} onPress={() => setPayload(null)} />
        </View>
      </View>
    </Modal>
  </JourneyShell>;
}

export default function JourneyCorrection({ id }: { id: string }) {
  const { usuario } = useAuth();
  const valid = /^[1-9]\d{0,19}$/.test(id);
  const loader = useCallback(() => api<Jornada>(`/jornadas/${id}`), [id]);
  const resource = useApiResource(loader, usuario?.perfil === 'RH' && valid);
  if (usuario?.perfil === 'RH' && resource.fresh && resource.data && acoesPermitidas('RH', resource.data).includes('corrigir')) return <CorrectionForm jornada={resource.data} />;
  return <JourneyShell title="Corrigir jornada">
    {usuario?.perfil !== 'RH' ? <Text style={ui.error}>Somente RH pode corrigir jornadas.</Text> : !valid ? <Text style={ui.error}>Identificador inválido.</Text> : <>
      <ResourceState loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()} />
      {resource.fresh && <Text style={ui.text}>Correção disponível somente para jornadas aguardando conferência ou rejeitadas.</Text>}
    </>}
    <Button label="Voltar às jornadas" secondary onPress={() => router.replace('/jornadas')} />
  </JourneyShell>;
}
