import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { api, ApiError } from '@/services/api';
import { carregarCadastrosAtivos } from '@/services/jornadas';
import { dataParaApi, dinheiro, horarioFormulario, type Jornada } from '@/utils/jornadas';
import { Button, CadastroPicker, Field, JourneyShell, ResourceState, ui } from './journey-ui';

/** Criação não registra entrada: apenas reserva a jornada EM_ANDAMENTO.
 * Enviamos os quatro campos permitidos; valor histórico, autor e status vêm da API.
 * Catálogos vazios não são preenchidos com dados falsos para viabilizar o teste.
 */
export default function JourneyCreate() {
  const { usuario } = useAuth();
  const allowed = usuario?.perfil === 'RH' || usuario?.perfil === 'OPERACIONAL';
  const loader = useCallback(() => carregarCadastrosAtivos(), []);
  const resource = useApiResource(loader, allowed);
  const [prestador, setPrestador] = useState('');
  const [funcao, setFuncao] = useState('');
  const [setor, setSetor] = useState('');
  const [data, setData] = useState(() => horarioFormulario(new Date().toISOString()).slice(0, 10));
  const [pending, setPending] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  async function save() {
    if (saving.current || !allowed || !resource.fresh || uncertain) return;
    try {
      if (!prestador || !funcao || !setor || !data.trim()) throw new Error('Selecione prestador, função, setor e informe a data.');
      const data_jornada = dataParaApi(data);
      saving.current = true; setPending(true); setError('');
      const jornada = await api<Jornada>('/jornadas', { method: 'POST', body: JSON.stringify({ prestador_id: prestador, funcao_id: funcao, setor_id: setor, data_jornada }) });
      router.replace({ pathname: '/jornada', params: { id: jornada.id, criada: '1' } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível criar a jornada.');
      // Sem resposta conclusiva, verifique a listagem antes de outra tentativa.
      // Não repetimos POST automaticamente: a primeira criação pode ter sido salva.
      if (saving.current && (!(cause instanceof ApiError) || cause.status >= 500)) setUncertain(true);
    } finally { saving.current = false; setPending(false); }
  }
  const catalogsEmpty = resource.data && [resource.data.prestadores, resource.data.funcoes, resource.data.setores].some((items) => !items.length);
  return <JourneyShell title="Criar jornada" busy={pending}>
    {!allowed ? <Text style={ui.error}>Seu perfil permite consultar jornadas, mas não criá-las.</Text> : <>
      <ResourceState loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()} />
      {catalogsEmpty && <Text style={ui.error}>Para criar uma jornada, é necessário ter prestadores, funções e setores ativos cadastrados na API.</Text>}
      {resource.fresh && resource.data && <>
        <CadastroPicker label="Prestador *" items={resource.data.prestadores} value={prestador} onChange={setPrestador} disabled={pending || uncertain} />
        <CadastroPicker label="Função *" items={resource.data.funcoes} value={funcao} onChange={setFuncao} disabled={pending || uncertain} />
        <CadastroPicker label="Setor *" items={resource.data.setores} value={setor} onChange={setSetor} disabled={pending || uncertain} />
        <Field label="Data de referência *" value={data} onChangeText={setData} placeholder="DD/MM/AAAA" disabled={pending || uncertain} />
        <View style={ui.card}><Text style={ui.text}>Valor/hora de referência: {funcao ? dinheiro(resource.data.funcoes.find((item) => item.id === funcao)?.valor_hora) : 'Selecione uma função'}</Text>
          <Text style={ui.text}>O valor vigente da função será preservado na jornada pelo servidor. Criar a jornada não registra entrada.</Text></View>
      </>}
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {uncertain && <Text style={ui.error}>A resposta não foi conclusiva. Consulte as jornadas para verificar se a criação foi registrada antes de iniciar outra.</Text>}
      <Button label={pending ? 'Salvando…' : 'Salvar jornada'} disabled={pending || uncertain || !resource.fresh || !!catalogsEmpty} onPress={save} />
    </>}
    <Button label={uncertain ? 'Consultar jornadas' : 'Voltar às jornadas'} secondary disabled={pending} onPress={() => router.replace('/jornadas')} />
  </JourneyShell>;
}
