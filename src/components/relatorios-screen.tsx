import { Redirect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { api } from '@/services/api';
import { carregarRelatorio } from '@/services/relatorios';
import { consultasRelatorio, type GrupoRelatorio } from '@/utils/relatorios';
import { FILTROS_VAZIOS, STATUS_LABELS, dinheiro, formatarData, type CadastroResumo, type FiltrosJornadas, type StatusJornada } from '@/utils/jornadas';
import { Button, CadastroPicker, Field, JourneyShell, ResourceState, ui } from './journey-ui';

export function RelatoriosScreen() {
  const { usuario } = useAuth();
  if (!usuario) return <Redirect href="/login" />;
  return <ConsultaRelatorios key={usuario.id} />;
}

function Resumo({ grupo }: { grupo: GrupoRelatorio }) {
  return <>
    <Text style={ui.text}>Jornadas: {grupo.quantidade} · Sem cálculo: {grupo.sem_calculo}</Text>
    <Text style={ui.text}>Horas líquidas: {grupo.horas_trabalhadas}</Text>
    <Text style={ui.text}>Valor calculado: {dinheiro(grupo.valor_calculado)}</Text>
  </>;
}

function ConsultaRelatorios() {
  const [form, setForm] = useState<FiltrosJornadas>({ ...FILTROS_VAZIOS });
  const [consulta, setConsulta] = useState({ filtros: { ...FILTROS_VAZIOS }, pagina: 1 });
  const [erro, setErro] = useState('');
  const loader = useCallback(() => carregarRelatorio(consulta.filtros, consulta.pagina), [consulta]);
  const resource = useApiResource(loader, true);
  const catalogo = useApiResource(useCallback(() => api<CadastroResumo[]>('/prestadores'), []), true);
  const chave = JSON.stringify([consulta.filtros, consulta.pagina]);
  const atual = resource.fresh && resource.data?.chave === chave;
  const carregando = resource.loading || (!atual && !resource.error);
  const setCampo = (campo: keyof FiltrosJornadas, valor: string) => setForm((anterior) => ({ ...anterior, [campo]: valor }));
  function aplicar(filtros: FiltrosJornadas) {
    try {
      consultasRelatorio(filtros, 1);
      setErro(''); setConsulta({ filtros: { ...filtros }, pagina: 1 });
    } catch (cause) { setErro(cause instanceof Error ? cause.message : 'Confira os filtros.'); }
  }
  const f = consulta.filtros;
  const periodo = `${f.data_inicio || 'Início não limitado'} até ${f.data_fim || 'Fim não limitado'}`;
  return <JourneyShell title="Relatórios">
    <Text style={ui.text}>Consulte jornadas e totais pelo período da data de referência da jornada. As datas inicial e final são inclusivas.</Text>
    <Field label="Data inicial (DD/MM/AAAA)" value={form.data_inicio} onChangeText={(v) => setCampo('data_inicio', v)} />
    <Field label="Data final (DD/MM/AAAA)" value={form.data_fim} onChangeText={(v) => setCampo('data_fim', v)} />
    <ResourceState loading={catalogo.loading} error={catalogo.error} onRetry={() => void catalogo.reload()} />
    <CadastroPicker label="Prestador" items={[{ id: '', nome: 'Todos os prestadores' }, ...(catalogo.data ?? []).map((p) => ({ id: p.id, nome: `${p.nome}${p.ativo === false ? ' (inativo)' : ''}` }))]} value={form.prestador_id} onChange={(v) => setCampo('prestador_id', v)} disabled={!catalogo.fresh} />
    <CadastroPicker label="Status" items={[{ id: '', nome: 'Todos os status' }, ...Object.entries(STATUS_LABELS).map(([id, nome]) => ({ id, nome }))]} value={form.status} onChange={(v) => setCampo('status', v as StatusJornada | '')} disabled={false} />
    <Text style={ui.text}>Altere os filtros e toque em Consultar. Os resultados abaixo usam os filtros aplicados.</Text>
    {!!erro && <Text accessibilityRole="alert" style={ui.error}>{erro}</Text>}
    <Button label="Consultar" disabled={carregando} onPress={() => aplicar(form)} />
    <Button label="Limpar filtros e consultar" secondary disabled={carregando} onPress={() => { setForm({ ...FILTROS_VAZIOS }); aplicar(FILTROS_VAZIOS); }} />
    <ResourceState loading={carregando} error={resource.error} onRetry={() => void resource.reload()} />
    {atual && resource.data && <>
      <View style={ui.card}>
        <Text accessibilityRole="header" style={ui.subtitle}>Filtros aplicados</Text>
        <Text style={ui.text}>{periodo}</Text>
        <Text style={ui.text}>Prestador: {f.prestador_id ? catalogo.data?.find((p) => p.id === f.prestador_id)?.nome ?? `#${f.prestador_id}` : 'Todos'}</Text>
        <Text style={ui.text}>Status: {f.status ? STATUS_LABELS[f.status] : 'Todos'}</Text>
      </View>
      <View style={ui.card}>
        <Text accessibilityRole="header" style={ui.subtitle}>Total de todo o resultado filtrado</Text>
        <Resumo grupo={resource.data.totais.geral} />
        <Text style={ui.text}>O total soma valores já calculados, incluindo rejeitados e cancelados que atendam aos filtros. Não representa automaticamente valor a pagar. Jornadas na lixeira ficam fora.</Text>
        <Text style={ui.text}>Para consultar valores liberados ainda não pagos, use Pagamento autorizado. Para quitações, use Pago. O período filtra a data da jornada, não a data do pagamento.</Text>
      </View>
      <Text accessibilityRole="header" style={ui.subtitle}>Totais por status</Text>
      {resource.data.totais.por_status.map((grupo) => <View style={ui.card} key={grupo.status}>
        <Text style={ui.subtitle}>{STATUS_LABELS[grupo.status]}</Text><Resumo grupo={grupo} />
      </View>)}
      <Text accessibilityRole="header" style={ui.subtitle}>Jornadas · Página {resource.data.lista.pagina}</Text>
      <Text style={ui.text}>Até 50 jornadas por página. Os totais abrangem todas as páginas. Consultas podem refletir alterações realizadas entre requisições.</Text>
      {!resource.data.lista.itens.length && <Text style={ui.text}>Nenhuma jornada encontrada para estes filtros.</Text>}
      {resource.data.lista.itens.map((item) => <View style={ui.card} key={item.id}>
        <Text style={ui.subtitle}>{item.prestador_nome ?? `Prestador #${item.prestador_id}`}</Text>
        <Text style={ui.text}>#{item.id} · {formatarData(item.data_jornada)} · {STATUS_LABELS[item.status]}</Text>
        <Text style={ui.text}>Horas líquidas: {item.horas_trabalhadas ?? 'Ainda não calculadas'}</Text>
        <Text style={ui.text}>Valor/hora: {dinheiro(item.valor_hora)} · Valor: {dinheiro(item.valor_calculado)}</Text>
        <Button label="Ver jornada" secondary onPress={() => router.push({ pathname: '/jornada', params: { id: item.id } })} />
      </View>)}
      <View style={ui.row}>
        <Button label="Página anterior" secondary disabled={consulta.pagina <= 1 || carregando} onPress={() => setConsulta((c) => ({ ...c, pagina: c.pagina - 1 }))} />
        <Button label="Próxima página" secondary disabled={!resource.data.lista.tem_proxima || consulta.pagina >= 1000000 || carregando} onPress={() => setConsulta((c) => ({ ...c, pagina: c.pagina + 1 }))} />
      </View>
    </>}
  </JourneyShell>;
}
