import { Redirect, router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { api } from '@/services/api';
import { carregarRelatorio } from '@/services/relatorios';
import { consultasRelatorio, type FiltrosRelatorio } from '@/utils/relatorios';
import { FILTROS_VAZIOS, STATUS_LABELS, dinheiro, formatarData, type CadastroResumo, type StatusJornada } from '@/utils/jornadas';
import { Button, CadastroPicker, JourneyIcon, JourneyShell, ResourceState, ui } from './journey-ui';
import { SchedulePicker } from './journey-schedule-picker';

const inicial: FiltrosRelatorio = { ...FILTROS_VAZIOS, setor_id: '', busca: '' };
const presets = ['Hoje', 'Últimos 7 dias', 'Este mês', 'Todo o período'] as const;
function dataLocal(date: Date) {
  return [String(date.getDate()).padStart(2, '0'), String(date.getMonth() + 1).padStart(2, '0'), date.getFullYear()].join('/');
}
function periodo(preset: typeof presets[number]) {
  if (preset === 'Todo o período') return { data_inicio: '', data_fim: '' };
  const hoje = new Date();
  const inicio = new Date(hoje);
  if (preset === 'Últimos 7 dias') inicio.setDate(inicio.getDate() - 6);
  if (preset === 'Este mês') inicio.setDate(1);
  return { data_inicio: dataLocal(inicio), data_fim: dataLocal(hoje) };
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => [s.chip, selected && s.chipActive, pressed && ui.dim]}>
    <Text style={[s.chipText, selected && s.chipWhite]}>{label}</Text>
  </Pressable>;
}

function Indicador({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return <View style={[s.kpi, destaque && s.dark]}>
    <Text style={[s.label, destaque && s.light]}>{label}</Text>
    <Text selectable style={[s.number, destaque && s.chipWhite]}>{value}</Text>
  </View>;
}

type Barra = { id: string; nome: string; quantidade: string };
type Visualizacao = 'Barras' | 'Pizza';
const paleta = ['#007C78', '#3973CC', '#7558A6', '#B84F22', '#21648D', '#A73770', '#68798B'];

function ponto(angulo: number) {
  return `${80 + 76 * Math.cos(angulo)} ${80 + 76 * Math.sin(angulo)}`;
}

function Pizza({ linhas, selecionar }: { linhas: Barra[]; selecionar: (id: string) => void }) {
  const total = linhas.reduce((soma, linha) => soma + BigInt(linha.quantidade), 0n);
  const fatias = linhas.slice(0, 6);
  if (linhas.length > 6) {
    const restantes = linhas.slice(6).reduce((soma, linha) => soma + BigInt(linha.quantidade), 0n);
    fatias.push({ id: '', nome: `Outros (${linhas.length - 6})`, quantidade: String(restantes) });
  }
  let acumulado = 0n;
  return <>
    <View style={s.pie} aria-hidden>
      <Svg width={156} height={156} viewBox="0 0 160 160">
        {fatias.map((fatia, index) => {
          const inicio = 2 * Math.PI * Number(acumulado) / Number(total) - Math.PI / 2;
          acumulado += BigInt(fatia.quantidade);
          const fim = 2 * Math.PI * Number(acumulado) / Number(total) - Math.PI / 2;
          const onPress = fatia.id ? () => selecionar(fatia.id) : undefined;
          if (fatias.length === 1) {
            return <Circle key={fatia.id} cx={80} cy={80} r={76} fill={paleta[index]} onPress={onPress} />;
          }
          const arco = fim - inicio > Math.PI ? 1 : 0;
          return <Path key={fatia.id} fill={paleta[index]} onPress={onPress}
            d={`M 80 80 L ${ponto(inicio)} A 76 76 0 ${arco} 1 ${ponto(fim)} Z`} />;
        })}
      </Svg>
    </View>
    {fatias.map((fatia, index) => {
      const percentual = (Number(fatia.quantidade) / Number(total)).toLocaleString('pt-BR', {
        style: 'percent', maximumFractionDigits: 1,
      });
      const conteudo = <>
        <View style={[s.swatch, { backgroundColor: paleta[index] }]} />
        <Text style={[s.barLabel, s.legendName]}>{fatia.nome}</Text>
        <Text style={s.count}>{fatia.quantidade} · {percentual}</Text>
      </>;
      return fatia.id
        ? <Pressable key={fatia.id} accessibilityRole="button" accessibilityLabel={`Filtrar por ${fatia.nome}, ${fatia.quantidade} jornadas`}
            onPress={() => selecionar(fatia.id)} style={({ pressed }) => [s.legend, pressed && ui.dim]}>{conteudo}</Pressable>
        : <View key={fatia.id} style={s.legend}>{conteudo}</View>;
    })}
  </>;
}

function Grafico({ titulo, linhas, cor, visualizacao, selecionar }: {
  titulo: string; linhas: Barra[]; cor: string; visualizacao: Visualizacao; selecionar: (id: string) => void;
}) {
  const [expandido, setExpandido] = useState(false);
  const maximo = linhas.reduce((max, l) => Math.max(max, Number(l.quantidade)), 1);
  return <View style={[s.panel, s.column]}>
    <Text accessibilityRole="header" style={s.heading}>{titulo}</Text>
    {linhas.length === 0 && <Text style={s.muted}>Sem jornadas no período.</Text>}
    {visualizacao === 'Pizza' && linhas.length > 0 && <Pizza linhas={linhas} selecionar={selecionar} />}
    {visualizacao === 'Barras' && (expandido ? linhas : linhas.slice(0, 6)).map(l => <Pressable key={l.id} accessibilityRole="button"
      accessibilityLabel={'Filtrar por ' + l.nome + ', ' + l.quantidade + ' jornadas'} onPress={() => selecionar(l.id)}
      style={({ pressed }) => [s.barRow, pressed && ui.dim]}>
      <View style={s.line}><Text style={s.barLabel}>{l.nome}</Text><Text style={s.count}>{l.quantidade}</Text></View>
      <View style={s.track}><View style={{ height: 7, borderRadius: 4, backgroundColor: cor, width: `${100 * Number(l.quantidade) / maximo}%` }} /></View>
    </Pressable>)}
    {visualizacao === 'Barras' && linhas.length > 6 && <Chip label={expandido ? 'Ver menos' : 'Ver todos (' + linhas.length + ')'} onPress={() => setExpandido(!expandido)} />}
  </View>;
}

export function RelatoriosScreen() {
  const { usuario } = useAuth();
  if (!usuario) return <Redirect href="/login" />;
  return <Painel key={usuario.id + usuario.perfil} adm={usuario.perfil === 'ADMINISTRADOR'} />;
}

function Painel({ adm }: { adm: boolean }) {
  const [consulta, setConsulta] = useState({ filtros: inicial, pagina: 1 });
  const [form, setForm] = useState(inicial);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [visualizacao, setVisualizacao] = useState<Visualizacao>('Barras');
  const { filtros, pagina } = consulta;
  const loader = useCallback(() => carregarRelatorio(filtros, pagina, adm), [filtros, pagina, adm]);
  const resource = useApiResource(loader, true);
  const setores = useApiResource(useCallback(() => api<CadastroResumo[]>('/setores'), []), true);
  const dados = resource.fresh && resource.data?.chave === JSON.stringify([filtros, pagina]) ? resource.data : null;
  function aplicar(next: FiltrosRelatorio) {
    try {
      consultasRelatorio(next, 1);
      setConsulta({ filtros: next, pagina: 1 });
      setForm(next);
      setErro('');
      setAberto(false);
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Confira os filtros.');
    }
  }
  function isolarMes(mes: string) {
    const [ano, numero] = mes.split('-').map(Number);
    const inicio = formatarData(mes + '-01');
    const fim = dataLocal(new Date(ano, numero, 0));
    const noMes = (data: string) => data.slice(3) === inicio.slice(3);
    aplicar({ ...filtros, data_inicio: noMes(filtros.data_inicio) ? filtros.data_inicio : inicio,
      data_fim: noMes(filtros.data_fim) ? filtros.data_fim : fim });
  }
  const campo = (key: keyof FiltrosRelatorio, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const intervalo = filtros.data_inicio === filtros.data_fim ? filtros.data_inicio || 'Todo o período'
    : [filtros.data_inicio || 'Início', filtros.data_fim || 'Em aberto'].join(' – ');
  const recorte = [intervalo, setores.data?.find(item => item.id === filtros.setor_id)?.nome || (filtros.setor_id && '#' + filtros.setor_id),
    filtros.status && STATUS_LABELS[filtros.status], filtros.busca?.trim()].filter(Boolean).join('  ·  ');
  const temFiltro = Object.values(filtros).some(Boolean);
  const totais = dados?.totais;
  return <JourneyShell title="Relatórios" titleIcon="reports" wide>
    <View style={s.hero}>
      <Text style={s.kicker}>{adm ? 'ADMINISTRAÇÃO' : 'ACOMPANHAMENTO'}</Text>
      <Text accessibilityRole="header" style={s.heroTitle}>{adm ? 'Panorama de jornadas' : 'Minhas jornadas'}</Text>
      <Text style={s.light}>{adm ? 'Volume, horas e valores por data da jornada.' : 'Consulte as jornadas que você criou.'}</Text>
    </View>
    <View style={s.panel}>
      <View style={s.controls}>
        <View style={s.search}><JourneyIcon icon="search" /><TextInput accessibilityLabel="Buscar pelo nome do prestador"
          placeholder="Nome do prestador" placeholderTextColor="#54677A" maxLength={120} value={form.busca}
          style={s.input} onChangeText={v => campo('busca', v)} onSubmitEditing={() => aplicar(form)} returnKeyType="search" /></View>
        <Chip label={aberto ? 'Fechar filtros' : 'Filtros detalhados'} selected={aberto} onPress={() => setAberto(!aberto)} />
        <Chip label="Pesquisar" selected onPress={() => aplicar(form)} />
      </View>
      <View style={s.controls}>{presets.map(label => {
        const datas = periodo(label);
        return <Chip key={label} label={label} selected={filtros.data_inicio === datas.data_inicio && filtros.data_fim === datas.data_fim}
          onPress={() => aplicar({ ...form, ...datas })} />;
      })}</View>
      {aberto && <>
        <View style={s.controls}>
          <View style={s.filter}><SchedulePicker mode="date" label="De" value={form.data_inicio} onChange={v => campo('data_inicio', v)} /></View>
          <View style={s.filter}><SchedulePicker mode="date" label="Até" value={form.data_fim} onChange={v => campo('data_fim', v)} /></View>
          <View style={s.filter}><CadastroPicker label="Setor" value={form.setor_id || ''} disabled={!setores.fresh}
            items={[{ id: '', nome: 'Todos os setores' }, ...(setores.data ?? [])]} onChange={v => campo('setor_id', v)} /></View>
          <View style={s.filter}><CadastroPicker label="Status" value={form.status} disabled={false} onChange={v => campo('status', v)}
            items={[{ id: '', nome: 'Todos os status' }, ...Object.entries(STATUS_LABELS).map(([id, nome]) => ({ id, nome }))]} /></View>
        </View>
        <ResourceState loading={setores.loading} error={setores.error} onRetry={() => void setores.reload()} />
        <Button label="Aplicar filtros" onPress={() => aplicar(form)} />
      </>}
      {!!erro && <Text accessibilityRole="alert" style={ui.error}>{erro}</Text>}
      <View style={s.line}><Text style={s.summary}>{recorte}</Text>{temFiltro && <Chip label="Limpar filtros" onPress={() => aplicar(inicial)} />}</View>
    </View>
    <ResourceState loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()} />
    {totais && dados?.distribuicoes && <>
      <View style={s.controls}>
        <Indicador label="Jornadas" value={totais.geral.quantidade} />
        <Indicador label="Horas líquidas" value={totais.geral.horas_trabalhadas} />
        <Indicador label="Sem cálculo" value={totais.geral.sem_calculo} />
        <Indicador label="Valor calculado" value={dinheiro(totais.geral.valor_calculado)} destaque />
      </View>
      <Text style={s.muted}>O valor calculado inclui todos os status do recorte. Selecione “Pago” para ver o valor das jornadas quitadas.</Text>
      <View style={s.line}>
        <Text accessibilityRole="header" style={s.heading}>Distribuição das jornadas</Text>
        <View style={s.controls}>{(['Barras', 'Pizza'] as const).map(tipo =>
          <Chip key={tipo} label={tipo} selected={visualizacao === tipo} onPress={() => setVisualizacao(tipo)} />
        )}</View>
      </View>
      <View style={s.controls}>
        <Grafico visualizacao={visualizacao} titulo="Jornadas por setor" linhas={dados.distribuicoes.por_setor} cor="#007C78" selecionar={id => aplicar({ ...filtros, setor_id: id })} />
        <Grafico visualizacao={visualizacao} titulo="Volume por mês" cor="#3973CC" linhas={dados.distribuicoes.por_mes.map(l => ({
          id: l.mes, nome: l.mes.split('-').reverse().join('/'), quantidade: l.quantidade,
        }))} selecionar={isolarMes} />
        <Grafico visualizacao={visualizacao} titulo="Jornadas por status" cor="#7558A6" linhas={totais.por_status.filter(l => l.quantidade !== '0').map(l => ({
          id: l.status, nome: STATUS_LABELS[l.status], quantidade: l.quantidade,
        }))} selecionar={id => aplicar({ ...filtros, status: id as StatusJornada })} />
      </View>
    </>}
    {dados && <View style={s.panel}>
      <View style={s.line}><Text accessibilityRole="header" style={s.heading}>Detalhamento das jornadas</Text><Text style={s.muted}>Página {pagina}</Text></View>
      {!dados.lista.itens.length && <Text style={s.muted}>Nenhuma jornada encontrada neste recorte.</Text>}
      {dados.lista.itens.map(item => <View key={item.id} style={s.record}>
        <View style={s.identity}><Text style={s.name}>{item.prestador_nome || 'Prestador #' + item.prestador_id}</Text>
          <Text style={s.muted}>{formatarData(item.data_jornada)} · {item.setor_nome || 'Setor sem nome'} · #{item.id}</Text></View>
        <View style={s.identity}><Text style={s.status}>{STATUS_LABELS[item.status]}</Text>
          <Text style={s.muted}>{item.horas_trabalhadas ? item.horas_trabalhadas + ' líquidas' : 'Horas a calcular'}</Text></View>
        {adm && <View style={s.identity}><Text style={s.name}>{dinheiro(item.valor_calculado ?? null)}</Text>
          {item.valor_hora && <Text style={s.muted}>{dinheiro(item.valor_hora)} / hora</Text>}</View>}
        {adm && <Chip label="Ver jornada" onPress={() => router.push({ pathname: '/jornada', params: { id: item.id } })} />}
      </View>)}
      {(pagina > 1 || dados.lista.tem_proxima) && <View style={s.controls}>
        {pagina > 1 && <Chip label="Anterior" onPress={() => setConsulta({ filtros, pagina: pagina - 1 })} />}
        {dados.lista.tem_proxima && pagina < 1000000 && <Chip label="Próxima" onPress={() => setConsulta({ filtros, pagina: pagina + 1 })} />}
      </View>}
    </View>}
  </JourneyShell>;
}

const s = StyleSheet.create({
  panel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9E2EB', borderRadius: 16, padding: 16, gap: 14 },
  hero: { backgroundColor: '#103453', borderLeftWidth: 6, borderLeftColor: '#35D5AB', borderRadius: 16, padding: 22, gap: 7 },
  kicker: { fontSize: 12, letterSpacing: 1.6, color: '#8DE7CD', fontWeight: '700' },
  heroTitle: { color: 'white', fontSize: 30, fontWeight: '700' },
  light: { color: '#D5E5EE' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'stretch' },
  search: { flexGrow: 2, flexBasis: 200, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F7FA', borderRadius: 10, paddingHorizontal: 12 },
  input: { flex: 1, minHeight: 44, color: '#18334D', fontSize: 16 },
  chip: { minHeight: 42, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#EDF3FA' },
  chipActive: { backgroundColor: '#164B77' }, chipWhite: { color: '#FFFFFF' },
  chipText: { color: '#23496A', fontWeight: '600' },
  filter: { flexGrow: 1, flexBasis: 190 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summary: { flex: 1, fontWeight: '600', color: '#3F5367' },
  kpi: { flexGrow: 1, flexBasis: 180, borderRadius: 14, borderWidth: 1, borderColor: '#D9E2EB', padding: 18, gap: 12, backgroundColor: '#FFF' },
  dark: { backgroundColor: '#0B5557', borderColor: '#0B5557' },
  label: { color: '#455B70', fontWeight: '600' }, number: { color: '#123D60', fontSize: 27, fontWeight: '700' },
  column: { flexGrow: 1, flexBasis: 265 }, heading: { fontWeight: '700', fontSize: 19, color: '#163A54', flexShrink: 1 },
  muted: { color: '#4E6274', fontSize: 14 }, barRow: { gap: 6, minHeight: 42, justifyContent: 'center' },
  barLabel: { color: '#273D50', flexShrink: 1 }, count: { fontWeight: '700', color: '#193B55' },
  track: { height: 7, borderRadius: 4, backgroundColor: '#ECF1F5' },
  pie: { alignSelf: 'center', marginVertical: 4 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  legendName: { flex: 1 },
  record: { borderTopWidth: 1, borderTopColor: '#DCE4EA', paddingVertical: 12, flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  identity: { flexGrow: 1, flexBasis: 148, gap: 4 },
  name: { fontWeight: '700', color: '#193A54', fontSize: 16 }, status: { fontWeight: '600', color: '#245E72' },
});
