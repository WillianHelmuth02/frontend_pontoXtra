import { Redirect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { api } from '@/services/api';
import { dadosCadastro } from '@/utils/cadastros';
import { dinheiro } from '@/utils/jornadas';
import { Button, Field, JourneyShell, ResourceState, ui } from './journey-ui';

type Cadastro = { id: string; nome: string; ativo: boolean; valor_hora?: string };
type Tipo = 'funcoes' | 'setores';
type Filtro = 'todos' | 'ativos' | 'inativos';
type Acao = { tipo: 'editar'; item: Cadastro | null } | { tipo: 'status'; item: Cadastro };

/** Apenas RH monta a tela e inicia consultas. O servidor também valida cada escrita. */
export function CadastrosScreen({ tipo }: { tipo: Tipo }) {
  const { usuario } = useAuth();
  if (!usuario) return <Redirect href="/login" />;
  if (usuario.perfil !== 'RH') return <Redirect href="/session" />;
  return <ListaCadastros key={`${usuario.id}:${tipo}`} tipo={tipo} />;
}

function ListaCadastros({ tipo }: { tipo: Tipo }) {
  const funcao = tipo === 'funcoes';
  const singular = funcao ? 'função' : 'setor';
  const loader = useCallback(() => api<Cadastro[]>(`/${tipo}`), [tipo]);
  const resource = useApiResource(loader, true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('ativos');
  const [acao, setAcao] = useState<Acao | null>(null);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [pending, setPending] = useState(false);
  const enviando = useRef(false);
  const itens = (resource.data ?? []).filter((item) =>
    item.nome.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'))
    && (filtro === 'todos' || item.ativo === (filtro === 'ativos')));

  function abrir(proxima: Acao) {
    setErro(''); setAviso(''); setAcao(proxima);
    setNome(proxima.item?.nome ?? '');
    setValor(proxima.item?.valor_hora?.replace('.', ',') ?? '');
  }

  async function salvar() {
    if (!acao || enviando.current) return;
    setErro('');
    let body: object | undefined;
    try {
      if (acao.tipo === 'editar') body = dadosCadastro(nome, funcao ? valor : undefined);
      else if (!acao.item.ativo) body = { ativo: true };
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Confira os dados.');
      return;
    }
    enviando.current = true; setPending(true);
    try {
      const item = acao.item;
      const path = `/${tipo}${item ? `/${item.id}` : ''}${acao.tipo === 'status' && item?.ativo ? '/desativar' : ''}`;
      await api<Cadastro>(path, { method: item ? 'PATCH' : 'POST', ...(body ? { body: JSON.stringify(body) } : {}) });
      setAcao(null);
      setAviso(acao.tipo === 'status' ? (acao.item.ativo ? 'Cadastro desativado.' : 'Cadastro reativado.') : 'Cadastro salvo.');
      // A escrita já terminou: uma falha na releitura não deve incentivar nova criação.
      await resource.reload();
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível salvar o cadastro.');
    } finally {
      enviando.current = false; setPending(false);
    }
  }

  return <JourneyShell title={funcao ? 'Funções' : 'Setores'} busy={pending}>
    <Text style={ui.text}>Gerencie os cadastros usados nas jornadas. A desativação preserva os vínculos existentes.</Text>
    {funcao && <Text style={ui.text}>Alterar o valor por hora vale para novas jornadas; as existentes mantêm o valor registrado.</Text>}
    <Button label={funcao ? 'Nova função' : 'Novo setor'} disabled={pending} onPress={() => abrir({ tipo: 'editar', item: null })} />
    <Field label="Buscar por nome" value={busca} onChangeText={setBusca} disabled={pending} />
    <View style={ui.row}>{(['ativos', 'inativos', 'todos'] as const).map((opcao) =>
      <Button key={opcao} label={{ ativos: 'Ativos', inativos: 'Inativos', todos: 'Todos' }[opcao]}
        secondary={filtro !== opcao} disabled={pending} onPress={() => setFiltro(opcao)} />)}</View>
    {!!aviso && <Text accessibilityRole="alert" style={ui.notice}>{aviso}</Text>}
    <ResourceState loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()} />
    {resource.fresh && <>
      <Text style={ui.text}>{itens.length} cadastro(s) encontrado(s).</Text>
      {!itens.length && <Text style={ui.text}>Nenhum cadastro encontrado para estes filtros.</Text>}
      {itens.map((item) => <View key={item.id} style={ui.card}>
        <Text accessibilityRole="header" style={ui.subtitle}>{item.nome}</Text>
        <Text style={ui.text}>#{item.id} · {item.ativo ? 'Ativo' : 'Inativo'}</Text>
        {funcao && <Text style={ui.text}>Valor por hora: {dinheiro(item.valor_hora ?? '0.00')}</Text>}
        <Button label={`Editar ${singular}`} secondary disabled={pending} onPress={() => abrir({ tipo: 'editar', item })} />
        <Button label={item.ativo ? 'Desativar' : 'Reativar'} danger={item.ativo} secondary={!item.ativo} disabled={pending} onPress={() => abrir({ tipo: 'status', item })} />
      </View>)}
    </>}
    <Button label="Atualizar lista" secondary disabled={pending || resource.loading} onPress={() => void resource.reload()} />
    <Modal transparent visible={!!acao} animationType="fade" onRequestClose={() => { if (!enviando.current) setAcao(null); }}>
      <View style={{ flex: 1, backgroundColor: '#001B4266', justifyContent: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ backgroundColor: '#FFFFFF', borderRadius: 16, maxHeight: '90%', width: '100%', maxWidth: 600, alignSelf: 'center' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 14 }}>
            <Text accessibilityRole="header" style={ui.subtitle}>{acao?.tipo === 'status'
              ? `${acao.item.ativo ? 'Desativar' : 'Reativar'} ${singular}`
              : `${acao?.item ? 'Editar' : funcao ? 'Nova' : 'Novo'} ${singular}`}</Text>
            {acao?.tipo === 'editar' ? <>
              <Field label="Nome *" value={nome} onChangeText={setNome} disabled={pending} />
              {funcao && <Field label="Valor por hora (R$) *" value={valor} onChangeText={setValor} placeholder="Ex.: 25,50" disabled={pending} />}
            </> : <Text style={ui.text}>{acao?.item.nome}: {acao?.item.ativo
              ? 'ao desativar, este cadastro deixa de estar disponível para novas jornadas. As jornadas existentes serão preservadas.'
              : 'ao reativar, este cadastro volta a estar disponível para novas jornadas.'}</Text>}
            {!!erro && <Text accessibilityRole="alert" style={ui.error}>{erro}</Text>}
            <Button label={pending ? 'Salvando…' : acao?.tipo === 'status' ? 'Confirmar' : 'Salvar'} danger={acao?.tipo === 'status' && acao.item.ativo} disabled={pending} onPress={() => void salvar()} />
            <Button label="Cancelar" secondary disabled={pending} onPress={() => setAcao(null)} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </JourneyShell>;
}
