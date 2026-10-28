import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth';
import { NotificationLink } from '@/components/notification-link';
import { api } from '@/services/api';
import { carregarJornadas, operarLixeira } from '@/services/jornadas';
import { FILTROS_VAZIOS, STATUS_LABELS, formatarData, podeRegistrarEntrada, podeEnviarLixeira, queryJornadas, type FiltrosJornadas, type Jornada } from '@/utils/jornadas';

const BLUE = '#005BCC';
const PROFILE_LABELS = { OPERACIONAL: 'Operacional', RH: 'RH', ADMINISTRADOR: 'Administrador' };
type Dados = Awaited<ReturnType<typeof carregarJornadas>>;
const DADOS_VAZIOS: Dados = { jornadas: [], prestadores: [], funcoes: [], setores: [] };

/** Ícone vetorial simples desenhado com Views, sem bibliotecas adicionais.
 * É decorativo: a função e o setor reais aparecem em texto ao lado.
 */
function WorkIcon() {
  return <View accessibilityElementsHidden style={styles.icon}>
    <View style={styles.monitor} /><View style={styles.monitorStand} />
    <View style={styles.desk} /><View style={styles.deskLegLeft} /><View style={styles.deskLegRight} />
  </View>;
}

/** Página autenticada de jornadas. A consulta inclui todos os status por padrão,
 * preservando a ordenação da API (data DESC, ID DESC). Nenhum dado demonstrativo
 * é inserido se o banco estiver vazio. Seleção é local, separada de registro.
 */
export function JornadasScreen() {
  const { usuario } = useAuth();
  const params = useLocalSearchParams<{ status?: string }>();
  const [dados, setDados] = useState<Dados>(DADOS_VAZIOS);
  const [filtros, setFiltros] = useState<FiltrosJornadas>(() => ({ ...FILTROS_VAZIOS,
    status: typeof params.status === 'string' && Object.hasOwn(STATUS_LABELS, params.status) ? params.status as FiltrosJornadas['status'] : '',
  }));
  const [rascunho, setRascunho] = useState<FiltrosJornadas>(FILTROS_VAZIOS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [prestadorSearch, setPrestadorSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exclusionMode, setExclusionMode] = useState(false);
  const [exclusionIds, setExclusionIds] = useState<string[]>([]);
  const [exclusionConfirm, setExclusionConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [notice, setNotice] = useState('');
  // A geração invalida respostas antigas ao trocar filtros ou desmontar a tela.
  // A trava de escrita é síncrona, evitando dois PATCHs antes do próximo render.
  const generation = useRef(0);
  const writing = useRef(false);
  const list = useRef<FlatList<Jornada>>(null);

  const load = useCallback((next: FiltrosJornadas) => {
    const current = ++generation.current;
    return carregarJornadas(next).then((result) => {
      if (current !== generation.current) return;
      setDados(result);
      setFresh(true);
      // Preserva a seleção apenas se ela ainda pertence à consulta atual.
      setSelectedId((id) => result.jornadas.some((jornada) => jornada.id === id) ? id : null);
      setExclusionIds((ids) => ids.filter((id) => result.jornadas.some((jornada) => jornada.id === id)));
    }).catch((cause: unknown) => {
      if (current === generation.current) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as jornadas.');
    }).finally(() => {
      if (current === generation.current) setLoading(false);
    });
  }, []);

  // Atualizações disparadas por interação marcam o início da consulta aqui.
  // O efeito inicial já nasce com loading=true e só atualiza estado após a API.
  function reload() {
    if (pending) return;
    setLoading(true);
    setFresh(false);
    setError('');
    void load(filtros);
  }

  // Voltar dos detalhes também refaz a leitura: uma ação pode ter mudado o status.
  useFocusEffect(useCallback(() => {
    const requests = generation;
    setLoading(true); setFresh(false); setError('');
    if (usuario) void load(filtros);
    return () => { requests.current++; };
  }, [usuario, filtros, load]));

  const selected = dados.jornadas.find((jornada) => jornada.id === selectedId);
  const canEnter = !exclusionMode && fresh && !loading && !pending && !!usuario && podeRegistrarEntrada(usuario.perfil, selected);
  const canExclude = fresh && !loading && !pending && !!usuario && exclusionIds.length > 0 && exclusionIds.length <= 50
    && exclusionIds.every((id) => dados.jornadas.some((jornada) => jornada.id === id && podeEnviarLixeira(usuario.perfil, jornada, usuario.id)));
  const nomesPrestadores = new Map(dados.prestadores.map((item) => [item.id, item.nome]));
  const nomesFuncoes = new Map(dados.funcoes.map((item) => [item.id, item.nome]));
  const nomesSetores = new Map(dados.setores.map((item) => [item.id, item.nome]));
  const activeFilters = Object.values(filtros).filter(Boolean).length;

  /** Consulta novamente antes da escrita para reduzir ações sobre estado antigo.
   * O relógio e a validação transacional continuam exclusivamente no backend.
   * Após qualquer falha, só fazemos GET: nunca repetimos PATCH automaticamente,
   * pois a entrada pode ter sido gravada mesmo quando a resposta se perdeu.
   */
  async function registerEntry() {
    if (!canEnter || !selected || !usuario || writing.current) return;
    writing.current = true;
    setPending(true);
    setConfirmation(false);
    setError('');
    setNotice('');
    try {
      const current = await api<Jornada>(`/jornadas/${selected.id}`);
      if (!podeRegistrarEntrada(usuario.perfil, current)) throw new Error('Esta jornada não permite mais registrar entrada. A lista será atualizada.');
      await api<Jornada>(`/jornadas/${selected.id}/entrada`, { method: 'PATCH' });
      setNotice('Entrada registrada com o horário do servidor.');
    } catch (cause) {
      setNotice(`${cause instanceof Error ? cause.message : 'Não foi possível confirmar a entrada.'} Confira a lista atualizada antes de tentar novamente.`);
    } finally {
      setLoading(true);
      setFresh(false);
      setError('');
      await load(filtros);
      writing.current = false;
      setPending(false);
    }
  }

  function applyFilters(next: FiltrosJornadas) {
    try {
      queryJornadas(next); // Valida calendário e intervalo antes de fechar o formulário.
      setLoading(true);
      setFresh(false);
      setError('');
      setFiltros({ ...next });
      setSelectedId(null);
      setExclusionIds([]);
      setNotice('');
      setFilterOpen(false);
      setFilterError('');
    } catch (cause) { setFilterError(cause instanceof Error ? cause.message : 'Filtros inválidos.'); }
  }

  async function excludeSelected() {
    if (!canExclude || writing.current) return;
    writing.current = true; setPending(true); setExclusionConfirm(false); setNotice(''); setError('');
    try {
      const result = await operarLixeira(exclusionIds, 'enviar');
      setNotice(`${result.quantidade} jornada(s) enviada(s) à lixeira.`);
    } catch (cause) {
      setNotice(`${cause instanceof Error ? cause.message : 'Não foi possível excluir.'} Confira a lista e a lixeira antes de tentar novamente.`);
    } finally {
      setExclusionIds([]); setLoading(true); setFresh(false);
      await load(filtros); writing.current = false; setPending(false);
    }
  }

  if (!usuario) return <Redirect href="/login" />;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {/* A barra do sistema pertence ao aparelho: não simulamos relógio ou sinal. */}
      <SafeAreaView edges={['top']} style={styles.topSafe}>
        <View style={styles.header}><Text accessibilityRole="header" style={styles.brand}>PontoXtra</Text><NotificationLink /></View>
      </SafeAreaView>
      <View style={styles.body}>
        <FlatList
          ref={list}
          data={fresh ? dados.jornadas : []}
          keyExtractor={(item) => item.id}
          extraData={{ selectedId, exclusionMode, exclusionIds }}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={reload}
          ListHeaderComponent={<>
            <View style={styles.greeting}>
              <Text style={styles.greetingText}>Olá, {usuario.nome}</Text>
              <Text style={styles.greetingText}>Perfil: {PROFILE_LABELS[usuario.perfil]}</Text>
            </View>
            <Text accessibilityRole="header" style={styles.title}>Jornadas</Text>
            {usuario.perfil !== 'ADMINISTRADOR' && <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.push('/nova-jornada')} style={styles.newButton}><Text style={styles.primaryText}>+ Nova jornada</Text></Pressable>}
            <View style={[styles.toolbar, { flexWrap: 'wrap', gap: 8 }]}>
              <Pressable accessibilityRole="button" disabled={pending || loading} onPress={() => { setExclusionMode(!exclusionMode); setExclusionIds([]); setSelectedId(null); setNotice(''); }}><Text style={styles.filterButton}>{exclusionMode ? 'Encerrar seleção' : 'Selecionar para excluir'}</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.push('/lixeira')}><Text style={styles.filterButton}>Lixeira</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.push('/relatorios')}><Text style={styles.filterButton}>Relatórios</Text></Pressable>
            </View>
            {exclusionMode && <>
              <Text style={styles.hint}>Selecione até 50 jornadas canceladas de sua autoria. RH pode selecionar canceladas de outros usuários. O envio à lixeira preserva os dados até a exclusão definitiva.</Text>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canExclude }} disabled={!canExclude} onPress={() => setExclusionConfirm(true)} style={[styles.newButton, !canExclude && styles.disabled]}><Text style={styles.primaryText}>Excluir selecionadas ({exclusionIds.length})</Text></Pressable>
            </>}
            <View style={styles.toolbar}>
              <Text style={styles.count}>{loading ? 'Carregando…' : fresh ? `${dados.jornadas.length} jornada(s)` : 'Consulta indisponível'}</Text>
              <Pressable accessibilityRole="button" disabled={loading || pending} onPress={() => { setRascunho({ ...filtros }); setFilterError(''); setPrestadorSearch(''); setFilterOpen(true); }}>
                <Text style={styles.filterButton}>Filtros{activeFilters ? ` (${activeFilters})` : ''}</Text>
              </Pressable>
            </View>
            {!!notice && <Text accessibilityLiveRegion="polite" style={styles.message}>{notice}</Text>}
            {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={reload}><Text style={styles.filterButton}>Tentar novamente</Text></Pressable>
            </View>}
          </>}
          ListEmptyComponent={loading ? <ActivityIndicator color={BLUE} style={styles.empty} /> : !error ? <Text style={styles.empty}>Nenhuma jornada encontrada{activeFilters ? ' para os filtros informados' : ''}.</Text> : null}
          renderItem={({ item }) => {
            const checked = exclusionMode ? exclusionIds.includes(item.id) : item.id === selectedId;
            const selectionDisabled = pending || loading || (exclusionMode && (!podeEnviarLixeira(usuario.perfil, item, usuario.id) || (!checked && exclusionIds.length >= 50)));
            const nome = nomesPrestadores.get(item.prestador_id) ?? `Prestador #${item.prestador_id}`;
            return <View style={[styles.row, checked && styles.rowSelected]}>
              <Pressable accessibilityRole={exclusionMode ? 'checkbox' : 'radio'} accessibilityState={{ checked, disabled: selectionDisabled }} accessibilityLabel={`${nome}, ${formatarData(item.data_jornada)}, ${STATUS_LABELS[item.status]}`} disabled={selectionDisabled} onPress={() => {
                if (exclusionMode) setExclusionIds((ids) => checked ? ids.filter((id) => id !== item.id) : [...ids, item.id]);
                else setSelectedId(checked ? null : item.id);
                setNotice('');
              }} style={[styles.selectArea, exclusionMode && selectionDisabled && styles.disabled]}>
              <WorkIcon />
              <View style={styles.rowText}>
                <Text style={styles.person}>{nome}</Text>
                <Text style={styles.meta}>{nomesFuncoes.get(item.funcao_id) ?? `Função #${item.funcao_id}`} · {nomesSetores.get(item.setor_id) ?? `Setor #${item.setor_id}`}</Text>
                <Text style={styles.meta}>#{item.id} · {formatarData(item.data_jornada)} · {STATUS_LABELS[item.status]}</Text>
                {!!item.entrada_em && <Text style={styles.entryLabel}>Entrada registrada</Text>}
              </View>
              <View style={[styles.radio, checked && styles.radioChecked]}>{checked && <Text style={styles.check}>✓</Text>}</View>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={pending} accessibilityLabel={`Ver detalhes da jornada ${item.id} de ${nome}`} onPress={() => router.push({ pathname: '/jornada', params: { id: item.id } })}><Text style={[styles.filterButton, { textAlign: 'right' }]}>Ver detalhes →</Text></Pressable>
            </View>;
          }}
        />
        {/* Indica por que a ação está indisponível sem inventar uma mudança de status. */}
        {usuario.perfil === 'OPERACIONAL' && <Text style={styles.hint}>{pending ? 'Registrando ação…' : exclusionMode ? 'Encerre a seleção de exclusão para registrar entrada.' : canEnter ? 'Jornada selecionada. Toque em Entrada para confirmar.' : 'Selecione uma jornada autorizada pelo ADM para realização e sem entrada registrada.'}</Text>}
      </View>
      <SafeAreaView edges={['bottom']} style={styles.bottomSafe}>
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.replace('/session')} style={styles.footerButton}><Text style={styles.footerText}>INÍCIO</Text></Pressable>
          {usuario.perfil === 'OPERACIONAL' && <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canEnter }} disabled={!canEnter} onPress={() => setConfirmation(true)} style={[styles.footerButton, !canEnter && styles.disabled]}><Text style={styles.footerText}>ENTRADA</Text></Pressable>}
          <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.push('/logout')} style={styles.footerButton}><Text style={styles.footerText}>SAIR</Text></Pressable>
        </View>
      </SafeAreaView>

      {/* Modal compartilhado entre Web e mobile; Alert nativo não atende a Web. */}
      <Modal transparent visible={exclusionConfirm} animationType="fade" onRequestClose={() => setExclusionConfirm(false)}>
        <View style={styles.overlay}><View accessibilityViewIsModal style={styles.dialog}>
          <Text style={styles.dialogTitle}>Excluir {exclusionIds.length} jornada(s)?</Text>
          <Text style={styles.dialogText}>Somente as canceladas selecionadas serão enviadas à lixeira e deixarão de aparecer na lista. Você poderá consultá-las ou restaurá-las como Cancelado antes da exclusão definitiva.</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setExclusionConfirm(false)} style={styles.secondary}><Text style={styles.filterButton}>Voltar</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={!canExclude} onPress={excludeSelected} style={[styles.primary, !canExclude && styles.disabled]}><Text style={styles.primaryText}>Excluir selecionadas</Text></Pressable>
          </View>
        </View></View>
      </Modal>
      <Modal transparent visible={confirmation} animationType="fade" onRequestClose={() => setConfirmation(false)}>
        <View style={styles.overlay}><View accessibilityViewIsModal style={styles.dialog}>
          <Text accessibilityRole="header" style={styles.dialogTitle}>Registrar entrada?</Text>
          <Text style={styles.dialogText}>{selected ? nomesPrestadores.get(selected.prestador_id) : ''}</Text>
          <Text style={styles.dialogText}>O horário atual do servidor será registrado nesta jornada.</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setConfirmation(false)} style={styles.secondary}><Text style={styles.filterButton}>Cancelar</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={!canEnter} onPress={registerEntry} style={styles.primary}><Text style={styles.primaryText}>Confirmar entrada</Text></Pressable>
          </View>
        </View></View>
      </Modal>

      <Modal transparent visible={filterOpen} animationType="fade" onRequestClose={() => setFilterOpen(false)}>
        <View style={styles.overlay}><View accessibilityViewIsModal style={styles.dialog}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text accessibilityRole="header" style={styles.dialogTitle}>Filtrar jornadas</Text>
            <Text style={styles.label}>Período da jornada (inclusive)</Text>
            <View style={styles.dates}>
              <TextInput accessibilityLabel="Data inicial" placeholder="De: DD/MM/AAAA" placeholderTextColor="#64748B" value={rascunho.data_inicio} onChangeText={(data_inicio) => setRascunho({ ...rascunho, data_inicio })} maxLength={10} style={[styles.input, styles.dateInput]} />
              <TextInput accessibilityLabel="Data final" placeholder="Até: DD/MM/AAAA" placeholderTextColor="#64748B" value={rascunho.data_fim} onChangeText={(data_fim) => setRascunho({ ...rascunho, data_fim })} maxLength={10} style={[styles.input, styles.dateInput]} />
            </View>
            <Text style={styles.label}>Status</Text>
            <View style={styles.chips}>
              {([['', 'Todos'], ...Object.entries(STATUS_LABELS)] as const).map(([value, label]) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: rascunho.status === value }} onPress={() => setRascunho({ ...rascunho, status: value as FiltrosJornadas['status'] })} style={[styles.chip, rascunho.status === value && styles.chipActive]}><Text style={rascunho.status === value ? styles.primaryText : styles.filterButton}>{label}</Text></Pressable>)}
            </View>
            <Text style={styles.label}>Prestador</Text>
            <TextInput accessibilityLabel="Buscar prestador nos filtros" placeholder="Buscar por nome" placeholderTextColor="#64748B" value={prestadorSearch} onChangeText={setPrestadorSearch} style={styles.input} />
            <View style={styles.chips}>
              <Pressable accessibilityRole="radio" accessibilityState={{ checked: !rascunho.prestador_id }} onPress={() => setRascunho({ ...rascunho, prestador_id: '' })} style={[styles.chip, !rascunho.prestador_id && styles.chipActive]}><Text style={!rascunho.prestador_id ? styles.primaryText : styles.filterButton}>Todos</Text></Pressable>
              {dados.prestadores.filter((item) => item.nome.toLocaleLowerCase('pt-BR').includes(prestadorSearch.toLocaleLowerCase('pt-BR'))).map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: rascunho.prestador_id === item.id }} onPress={() => setRascunho({ ...rascunho, prestador_id: item.id })} style={[styles.chip, rascunho.prestador_id === item.id && styles.chipActive]}><Text style={rascunho.prestador_id === item.id ? styles.primaryText : styles.filterButton}>{item.nome} · #{item.id}</Text></Pressable>)}
            </View>
            {!!filterError && <Text accessibilityRole="alert" style={styles.error}>{filterError}</Text>}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={() => applyFilters(FILTROS_VAZIOS)} style={styles.secondary}><Text style={styles.filterButton}>Limpar</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => setFilterOpen(false)} style={styles.secondary}><Text style={styles.filterButton}>Cancelar</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => applyFilters(rascunho)} style={styles.primary}><Text style={styles.primaryText}>Aplicar</Text></Pressable>
            </View>
          </ScrollView>
        </View></View>
      </Modal>
    </View>
  );
}

/** Ajustes visuais principais: largura máxima mantém a composição legível na Web;
 * minHeight e padding dos cartões permitem nomes longos sem altura fixa/corte.
 * A lista ocupa apenas o espaço entre cabeçalho e rodapé, que ficam sempre visíveis.
 */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5FF' },
  topSafe: { backgroundColor: BLUE },
  header: { minHeight: 90, alignItems: 'center', justifyContent: 'center', padding: 12 },
  brand: { color: '#20C12D', fontSize: 42, fontWeight: '800', letterSpacing: -1.2 },
  body: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  listContent: { paddingHorizontal: 25, paddingBottom: 12, flexGrow: 1 },
  greeting: { marginTop: 17, alignSelf: 'center', backgroundColor: BLUE, borderRadius: 40, paddingHorizontal: 26, paddingVertical: 8, maxWidth: '100%' },
  greetingText: { textAlign: 'center', color: '#54EF60', fontSize: 20, lineHeight: 25 },
  title: { color: BLUE, fontSize: 32, textAlign: 'center', marginTop: 16, marginBottom: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  count: { color: '#52637C', fontSize: 13 },
  filterButton: { color: BLUE, fontWeight: '600', paddingVertical: 6 },
  row: { gap: 4, minHeight: 86, borderWidth: 2, borderColor: BLUE, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  selectArea: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  newButton: { backgroundColor: BLUE, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12 },
  rowSelected: { backgroundColor: '#E8EFFF' },
  rowText: { flex: 1, gap: 4 },
  person: { fontSize: 20, color: BLUE },
  meta: { fontSize: 12, color: '#3D5D85', lineHeight: 17 },
  entryLabel: { fontSize: 12, fontWeight: '600', color: '#17643F' },
  radio: { width: 27, height: 27, borderWidth: 2, borderColor: BLUE, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  radioChecked: { backgroundColor: BLUE }, check: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  icon: { width: 40, height: 42 },
  monitor: { position: 'absolute', left: 2, top: 3, width: 26, height: 18, borderWidth: 1.5, borderColor: BLUE },
  monitorStand: { position: 'absolute', left: 14, top: 21, height: 6, borderLeftWidth: 1.5, borderColor: BLUE },
  desk: { position: 'absolute', left: 0, top: 27, width: 39, height: 5, borderWidth: 1.5, borderColor: BLUE },
  deskLegLeft: { position: 'absolute', left: 4, top: 32, height: 9, borderLeftWidth: 1.5, borderColor: BLUE },
  deskLegRight: { position: 'absolute', right: 3, top: 32, height: 9, borderLeftWidth: 1.5, borderColor: BLUE },
  empty: { textAlign: 'center', color: '#52637C', marginVertical: 40, lineHeight: 22 },
  hint: { color: '#52637C', fontSize: 12, textAlign: 'center', paddingHorizontal: 20, paddingVertical: 8 },
  message: { color: '#173F6B', backgroundColor: '#E5EDFF', padding: 12, borderRadius: 8, marginBottom: 12, lineHeight: 20 },
  errorBox: { gap: 8, marginBottom: 16 }, error: { color: '#B42318', lineHeight: 20 },
  bottomSafe: { backgroundColor: BLUE },
  footer: { flexDirection: 'row', maxWidth: 680, alignSelf: 'center', width: '100%', minHeight: 59 },
  footerButton: { flex: 1, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  footerText: { color: '#FFFFFF', fontSize: 18 }, disabled: { opacity: 0.45 },
  overlay: { flex: 1, backgroundColor: '#001B4266', padding: 20, alignItems: 'center', justifyContent: 'center' },
  dialog: { backgroundColor: '#FFFFFF', padding: 22, borderRadius: 18, width: '100%', maxWidth: 520, maxHeight: '90%' },
  dialogTitle: { color: BLUE, fontSize: 23, fontWeight: '700', marginBottom: 16 },
  dialogText: { color: '#3D5D85', fontSize: 16, lineHeight: 24, marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  primary: { backgroundColor: BLUE, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '600' },
  secondary: { paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center' },
  label: { color: '#173F6B', fontWeight: '600', marginTop: 10, marginBottom: 8 },
  dates: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  input: { borderWidth: 1, borderColor: '#A3B9D8', borderRadius: 8, padding: 12, color: '#173F6B', fontSize: 14 },
  dateInput: { flexGrow: 1, flexBasis: 160 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  chip: { borderWidth: 1, borderColor: BLUE, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, justifyContent: 'center' },
  chipActive: { backgroundColor: BLUE },
});
