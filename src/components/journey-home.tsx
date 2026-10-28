import { Redirect, router } from 'expo-router';
import { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { api } from '@/services/api';
import { STATUS_LABELS, dinheiro, type StatusJornada } from '@/utils/jornadas';
import { Button, JourneyShell, ResourceState, ui } from './journey-ui';

type Totais = { por_status: { status: StatusJornada; quantidade: string; valor_calculado: string }[] };
/** O protótipo distingue as páginas iniciais por perfil. Os números das pendências
 * são agregados pela API (não contagens fictícias ou limitadas à primeira página).
 * A navegação leva à mesma consulta de jornadas, já filtrada pelo status escolhido.
 */
export default function JourneyHome() {
  const { usuario } = useAuth();
  const loader = useCallback(() => api<Totais>('/relatorios/totais'), []);
  const resource = useApiResource(loader, !!usuario && usuario.perfil !== 'OPERACIONAL');
  if (!usuario) return <Redirect href="/login" />;
  if (usuario.perfil === 'OPERACIONAL') return <Redirect href="/jornadas" />;
  const statuses: StatusJornada[] = usuario.perfil === 'RH'
    ? ['AGUARDANDO_AUTORIZACAO_REALIZACAO', 'REALIZACAO_REJEITADA', 'AGUARDANDO_CONFERENCIA', 'REJEITADO', 'AUTORIZADO'] : ['AGUARDANDO_AUTORIZACAO_REALIZACAO', 'AGUARDANDO_AUTORIZACAO'];
  return <JourneyShell title="Pendências">
    <ResourceState loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()} />
    {resource.fresh && statuses.map((status) => {
      const total = resource.data?.por_status.find((group) => group.status === status);
      return <View style={ui.card} key={status}>
        <Text style={ui.subtitle}>{status === 'AUTORIZADO' ? 'Pagamentos a registrar' : STATUS_LABELS[status]}</Text>
        <Text style={ui.text}>{total?.quantidade ?? '0'} jornada(s) · {dinheiro(total?.valor_calculado ?? '0.00')}</Text>
        <Button label="Consultar jornadas" secondary onPress={() => router.push({ pathname: '/jornadas', params: { status } })} />
      </View>;
    })}
    <Text accessibilityRole="header" style={ui.title}>Acesso rápido</Text>
    {usuario.perfil === 'RH' && <Button label="Criar jornada" onPress={() => router.push('/nova-jornada')} />}
    {usuario.perfil === 'RH' && <>
      <Button label="Gerenciar funções" secondary onPress={() => router.push('/funcoes')} />
      <Button label="Gerenciar setores" secondary onPress={() => router.push('/setores')} />
    </>}
    <Button label="Consultar todas as jornadas" secondary onPress={() => router.push('/jornadas')} />
    <Button label="Lixeira de jornadas" secondary onPress={() => router.push('/lixeira')} />
    <Button label="Atualizar pendências" secondary disabled={resource.loading} onPress={() => void resource.reload()} />
  </JourneyShell>;
}
