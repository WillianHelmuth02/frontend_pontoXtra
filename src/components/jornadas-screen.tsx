import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Keyboard, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/auth';
import { AppHeader, BLUE, JourneyIcon } from '@/components/journey-ui';
import { AvisoEntrada } from '@/components/aviso-entrada';
import { JornadasFiltros, JornadasOrdem } from '@/components/jornadas-filtros';
import { api } from '@/services/api';
import { carregarJornadas, operarLixeira } from '@/services/jornadas';
import { avisoPontualidade } from '@/utils/jornadas';
import { FILTROS_VAZIOS, ORDENS_JORNADAS, STATUS_LABELS, exibirJornadas, formatarData, formatarDuracao, nomePrestador, podeRegistrarEntrada, podeEnviarLixeira, type FiltrosJornadas, type Jornada, type OrdemJornadas } from '@/utils/jornadas';

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
  const [filterOpen, setFilterOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<OrdemJornadas>('recentes');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exclusionMode, setExclusionMode] = useState(false);
  const [exclusionIds, setExclusionIds] = useState<string[]>([]);
  const [exclusionConfirm, setExclusionConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // A geração invalida respostas antigas ao trocar filtros ou desmontar a tela.
  // A trava de escrita é síncrona, evitando dois PATCHs antes do próximo render.
  const generation = useRef(0);
  const writing = useRef(false);

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

  const nomesPrestadores = useMemo(() => new Map(dados.prestadores.map((item) => [item.id, item.nome])), [dados.prestadores]);
  const visible = useMemo(() => exibirJornadas(dados.jornadas, nomesPrestadores, search, order),
    [dados.jornadas, nomesPrestadores, search, order]);
  const selected = visible.find((jornada) => jornada.id === selectedId);
  const canEnter = !exclusionMode && fresh && !loading && !pending && !!usuario && podeRegistrarEntrada(usuario.perfil, selected);
  const canExclude = fresh && !loading && !pending && !!usuario && exclusionIds.length > 0 && exclusionIds.length <= 50
    && exclusionIds.every((id) => visible.some((jornada) => jornada.id === id && podeEnviarLixeira(usuario.perfil, jornada, usuario.id)));
  const nomesFuncoes = new Map(dados.funcoes.map((item) => [item.id, item.nome]));
  const nomesSetores = new Map(dados.setores.map((item) => [item.id, item.nome]));
  const activeFilters = Object.values(filtros).filter(Boolean).length;

  function updateSearch(value: string) {
    setSearch(value);
    setSelectedId(null);
    setExclusionIds([]);
  }

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
      const registrada = await api<Jornada>(`/jornadas/${selected.id}/entrada`, { method: 'PATCH' });
      const aviso = avisoPontualidade(registrada, Date.parse(registrada.entrada_em ?? ''));
      setNotice(['Entrada registrada com o horário do servidor.', aviso].filter(Boolean).join(' '));
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
    setLoading(true);
    setFresh(false);
    setError('');
    setFiltros({ ...next });
    setSelectedId(null);
    setExclusionIds([]);
    setNotice('');
    setFilterOpen(false);
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
      <AppHeader nome={usuario.nome} perfil={usuario.perfil} />
      <View style={styles.body}>
        <FlatList
          data={fresh ? visible : []}
          keyExtractor={(item) => item.id}
          extraData={{ selectedId, exclusionMode, exclusionIds }}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={reload}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<>
            <Text accessibilityRole="header" style={styles.title}>Jornadas</Text>
            {usuario.perfil !== 'ADMINISTRADOR' && <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.push('/nova-jornada')} style={styles.newButton}><Text style={styles.primaryText}>+ Nova jornada</Text></Pressable>}
            <View style={[styles.toolbar, styles.shortcuts]}>
              <Pressable accessibilityRole="button" disabled={pending || loading} onPress={() => { setExclusionMode(!exclusionMode); setExclusionIds([]); setSelectedId(null); setNotice(''); }}><Text style={styles.filterButton}>{exclusionMode ? 'Encerrar seleção' : 'Selecionar para excluir'}</Text></Pressable>
              <View style={styles.quickLinks}>
                <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.push('/lixeira')}
                  style={({ pressed }) => [styles.filterTrigger, (pressed || pending) && styles.disabled]}>
                  <JourneyIcon icon="trash" /><Text style={styles.filterButton}>Lixeira</Text>
                </Pressable>
                <Pressable accessibilityRole="button" disabled={pending} onPress={() => router.push('/relatorios')}
                  style={({ pressed }) => [styles.filterTrigger, (pressed || pending) && styles.disabled]}>
                  <JourneyIcon icon="reports" /><Text style={styles.filterButton}>Relatórios</Text>
                </Pressable>
              </View>
            </View>
            {exclusionMode && <>
              <Text style={styles.hint}>Selecione até 50 jornadas canceladas de sua autoria. RH pode selecionar canceladas de outros usuários. O envio à lixeira preserva os dados até a exclusão definitiva.</Text>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canExclude }} disabled={!canExclude} onPress={() => setExclusionConfirm(true)} style={[styles.newButton, !canExclude && styles.disabled]}><Text style={styles.primaryText}>Excluir selecionadas ({exclusionIds.length})</Text></Pressable>
            </>}
            <View style={styles.searchField}>
              <JourneyIcon icon="search" />
              <TextInput accessibilityLabel="Buscar pelo nome do prestador" placeholder="Buscar pelo nome do prestador"
                placeholderTextColor="#52637C" autoCorrect={false} returnKeyType="search" editable={!pending}
                value={search} onChangeText={updateSearch} style={styles.searchInput} />
              {!!search && <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" disabled={pending}
                onPress={() => updateSearch('')} style={styles.clearSearch}><JourneyIcon icon="clear" /></Pressable>}
            </View>
            <View style={[styles.toolbar, styles.shortcuts]}>
              <Text accessibilityLiveRegion="polite" style={styles.count}>{loading ? 'Carregando…' : fresh ? `${visible.length} jornada(s)` : 'Consulta indisponível'}</Text>
              <View style={styles.quickLinks}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Ordenar: ${ORDENS_JORNADAS[order]}`}
                  disabled={pending} onPress={() => { Keyboard.dismiss(); setOrderOpen(true); }}
                  style={({ pressed }) => [styles.filterTrigger, order !== 'recentes' && styles.filterTriggerActive, (pressed || pending) && styles.disabled]}>
                  <JourneyIcon icon="sort" /><Text style={styles.filterButton}>{ORDENS_JORNADAS[order]}</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: loading || pending }}
                  disabled={loading || pending} onPress={() => { Keyboard.dismiss(); setFilterOpen(true); }}
                  style={({ pressed }) => [styles.filterTrigger, activeFilters > 0 && styles.filterTriggerActive, (pressed || loading || pending) && styles.disabled]}>
                  <JourneyIcon icon="filters" />
                  <Text style={styles.filterButton}>Filtros{activeFilters ? ` (${activeFilters})` : ''}</Text>
                </Pressable>
              </View>
            </View>
            {!!notice && <Text accessibilityLiveRegion="polite" style={styles.message}>{notice}</Text>}
            {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>
              <Pressable accessibilityRole="button" onPress={reload}><Text style={styles.filterButton}>Tentar novamente</Text></Pressable>
            </View>}
          </>}
          ListEmptyComponent={loading ? <ActivityIndicator color={BLUE} style={styles.empty} /> : !error ? <Text style={styles.empty}>Nenhuma jornada encontrada{search.trim() || activeFilters ? ' com a busca e os filtros atuais' : ''}.</Text> : undefined}
          renderItem={({ item }) => {
            const checked = exclusionMode ? exclusionIds.includes(item.id) : item.id === selectedId;
            const selectionDisabled = pending || loading || (exclusionMode && (!podeEnviarLixeira(usuario.perfil, item, usuario.id) || (!checked && exclusionIds.length >= 50)));
            const nome = nomePrestador(item.prestador_id, nomesPrestadores);
            const duracao = item.minutos_trabalhados == null ? '' : formatarDuracao(item.minutos_trabalhados);
            return <View style={[styles.row, checked && styles.rowSelected]}>
              <Pressable accessibilityRole={exclusionMode ? 'checkbox' : 'radio'} accessibilityState={{ checked, disabled: selectionDisabled }} accessibilityLabel={`${nome}, ${formatarData(item.data_jornada)}, ${STATUS_LABELS[item.status]}${duracao ? `, tempo trabalhado: ${duracao}` : ''}`} disabled={selectionDisabled} onPress={() => {
                if (exclusionMode) setExclusionIds((ids) => checked ? ids.filter((id) => id !== item.id) : [...ids, item.id]);
                else setSelectedId(checked ? null : item.id);
                setNotice('');
              }} style={[styles.selectArea, exclusionMode && selectionDisabled && styles.disabled]}>
              <WorkIcon />
              <View style={styles.rowText}>
                <Text style={styles.person}>{nome}</Text>
                <Text style={styles.meta}>{nomesFuncoes.get(item.funcao_id) ?? `Função #${item.funcao_id}`} · {nomesSetores.get(item.setor_id) ?? `Setor #${item.setor_id}`}</Text>
                <Text style={styles.meta}>#{item.id} · {formatarData(item.data_jornada)}</Text>
                {!!duracao && <Text style={styles.meta}>Tempo trabalhado · {duracao}</Text>}
                <Text style={styles.rowStatus}>{STATUS_LABELS[item.status]}</Text>
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
          {confirmation && selected && <AvisoEntrada jornada={selected} />}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => setConfirmation(false)} style={styles.secondary}><Text style={styles.filterButton}>Cancelar</Text></Pressable>
            <Pressable accessibilityRole="button" disabled={!canEnter} onPress={registerEntry} style={styles.primary}><Text style={styles.primaryText}>Confirmar entrada</Text></Pressable>
          </View>
        </View></View>
      </Modal>

      {filterOpen && <JornadasFiltros applied={filtros}
        onApply={applyFilters} onClose={() => setFilterOpen(false)} />}
      {orderOpen && <JornadasOrdem value={order} onClose={() => setOrderOpen(false)}
        onSelect={(value) => { setOrder(value); setOrderOpen(false); }} />}
    </View>
  );
}

/** Ajustes visuais principais: largura máxima mantém a composição legível na Web;
 * minHeight e padding dos cartões permitem nomes longos sem altura fixa/corte.
 * A lista ocupa apenas o espaço entre cabeçalho e rodapé, que ficam sempre visíveis.
 */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5FF' },
  body: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  listContent: { paddingHorizontal: 25, paddingBottom: 12, flexGrow: 1 },
  title: { color: BLUE, fontSize: 32, textAlign: 'center', marginTop: 16, marginBottom: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  shortcuts: { flexWrap: 'wrap', gap: 8 },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  count: { color: '#52637C', fontSize: 13 },
  filterButton: { color: BLUE, fontWeight: '600', paddingVertical: 6 },
  filterTrigger: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: '#A3B9D8', borderRadius: 8, backgroundColor: '#FFFFFF' },
  filterTriggerActive: { borderColor: BLUE, backgroundColor: '#E5EDFF' },
  searchField: { minHeight: 48, alignItems: 'center', flexDirection: 'row', gap: 8, paddingLeft: 12, paddingRight: 4, borderRadius: 10, borderWidth: 1, borderColor: '#A3B9D8', backgroundColor: '#FFFFFF', marginBottom: 12 },
  searchInput: { flex: 1, minWidth: 0, alignSelf: 'stretch', color: '#173F6B', fontSize: 16, paddingVertical: 8 },
  clearSearch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { gap: 4, minHeight: 86, borderWidth: 2, borderColor: BLUE, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  selectArea: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  newButton: { backgroundColor: BLUE, borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 12 },
  rowSelected: { backgroundColor: '#E8EFFF' },
  rowText: { flex: 1, gap: 4 },
  person: { fontSize: 20, color: BLUE },
  meta: { fontSize: 12, color: '#3D5D85', lineHeight: 17 },
  entryLabel: { fontSize: 12, fontWeight: '600', color: '#17643F' },
  rowStatus: { alignSelf: 'flex-start', maxWidth: '100%', color: '#173F6B', fontWeight: '700', fontSize: 14, lineHeight: 20, backgroundColor: '#E5EDFF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
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
});
