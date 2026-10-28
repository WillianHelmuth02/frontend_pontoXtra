import { Redirect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/contexts/auth';
import { useApiResource } from '@/hooks/use-api-resource';
import { api } from '@/services/api';
import { dadosUsuario, PERFIS_USUARIO, type PerfilUsuario, type UsuarioCadastro } from '@/utils/usuarios';
import { Button, Field, JourneyShell, PERFIS, ResourceState, ui } from './journey-ui';

type Acao = { tipo: 'editar'; item: UsuarioCadastro | null } | { tipo: 'status'; item: UsuarioCadastro };

export function UsuariosScreen() {
  const { usuario } = useAuth();
  if (!usuario) return <Redirect href="/login" />;
  if (usuario.perfil !== 'ADMINISTRADOR') return <Redirect href="/session" />;
  return <ListaUsuarios key={usuario.id} autorId={usuario.id} />;
}

function ListaUsuarios({ autorId }: { autorId: string }) {
  const { logout } = useAuth();
  const loader = useCallback(() => api<UsuarioCadastro[]>('/usuarios'), []);
  const resource = useApiResource(loader, true);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('ativos');
  const [acao, setAcao] = useState<Acao | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [perfil, setPerfil] = useState<PerfilUsuario>('OPERACIONAL');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [pending, setPending] = useState(false);
  const enviando = useRef(false);
  const propria = acao?.item?.id === autorId;
  const itens = (resource.data ?? []).filter((item) =>
    [item.nome, item.email].some((texto) => texto.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')))
    && (filtro === 'todos' || item.ativo === (filtro === 'ativos')));

  function fechar() { setAcao(null); setSenha(''); setConfirmar(''); setErro(''); }
  function abrir(proxima: Acao) {
    setAcao(proxima); setNome(proxima.item?.nome ?? ''); setEmail(proxima.item?.email ?? '');
    setPerfil(proxima.item?.perfil ?? 'OPERACIONAL'); setSenha(''); setConfirmar(''); setErro(''); setAviso('');
  }
  async function salvar() {
    if (!acao || enviando.current) return;
    setErro('');
    let body: object | undefined;
    try {
      if (acao.tipo === 'editar') body = dadosUsuario(nome, email, perfil, senha, confirmar, acao.item);
      else {
        if (propria) throw new Error('Não é permitido desativar a própria conta.');
        if (!acao.item.ativo) body = { ativo: true };
      }
    } catch (cause) { setErro(cause instanceof Error ? cause.message : 'Confira os dados.'); return; }
    enviando.current = true; setPending(true);
    try {
      const item = acao.item;
      await api<UsuarioCadastro>(`/usuarios${item ? `/${item.id}` : ''}${acao.tipo === 'status' && item?.ativo ? '/desativar' : ''}`, {
        method: item ? 'PATCH' : 'POST', ...(body ? { body: JSON.stringify(body) } : {}),
      });
      fechar(); setAviso('Usuário salvo.');
      if (item?.id === autorId) {
        // Alterações próprias exigem relogin para atualizar a identidade em memória.
        try { await logout(); } catch { setAviso('Usuário salvo. Saia da conta e entre novamente para atualizar sua sessão.'); }
      } else await resource.reload();
    } catch (cause) { setErro(cause instanceof Error ? cause.message : 'Não foi possível salvar o usuário.'); }
    finally { enviando.current = false; setPending(false); }
  }
  return <JourneyShell title="Usuários" busy={pending}>
    <Text style={ui.text}>Gerencie as contas e os perfis de acesso. Desativar preserva os registros vinculados ao usuário.</Text>
    <Button label="Novo usuário" disabled={pending} onPress={() => abrir({ tipo: 'editar', item: null })} />
    <Field label="Buscar por nome ou e-mail" value={busca} onChangeText={setBusca} disabled={pending} />
    <View style={ui.row}>{(['ativos', 'inativos', 'todos'] as const).map((valor) => <Button key={valor} label={{ ativos: 'Ativos', inativos: 'Inativos', todos: 'Todos' }[valor]} secondary={filtro !== valor} disabled={pending} onPress={() => setFiltro(valor)} />)}</View>
    {!!aviso && <Text accessibilityRole="alert" style={ui.notice}>{aviso}</Text>}
    <ResourceState loading={resource.loading} error={resource.error} onRetry={() => void resource.reload()} />
    {resource.fresh && <>
      <Text style={ui.text}>{itens.length} usuário(s) encontrado(s).</Text>
      {!itens.length && <Text style={ui.text}>Nenhum usuário encontrado para estes filtros.</Text>}
      {itens.map((item) => <View key={item.id} style={ui.card}>
        <Text accessibilityRole="header" style={ui.subtitle}>{item.nome}{item.id === autorId ? ' (sua conta)' : ''}</Text>
        <Text style={ui.text}>{item.email}</Text>
        <Text style={ui.text}>#{item.id} · {PERFIS[item.perfil]} · {item.ativo ? 'Ativo' : 'Inativo'}</Text>
        <Button label="Editar usuário" secondary disabled={pending} onPress={() => abrir({ tipo: 'editar', item })} />
        {item.id === autorId ? <Text style={ui.text}>Você mantém seu próprio perfil de administrador e sua conta ativa.</Text>
          : <Button label={item.ativo ? 'Desativar' : 'Reativar'} danger={item.ativo} secondary={!item.ativo} disabled={pending} onPress={() => abrir({ tipo: 'status', item })} />}
      </View>)}
    </>}
    <Button label="Atualizar lista" secondary disabled={pending || resource.loading} onPress={() => void resource.reload()} />
    <Modal transparent visible={!!acao} animationType="fade" onRequestClose={() => { if (!enviando.current) fechar(); }}>
      <View style={{ flex: 1, backgroundColor: '#001B4266', justifyContent: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ backgroundColor: '#FFFFFF', borderRadius: 16, maxHeight: '90%', width: '100%', maxWidth: 600, alignSelf: 'center' }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, gap: 14 }}>
            <Text accessibilityRole="header" style={ui.subtitle}>{acao?.tipo === 'status' ? `${acao.item.ativo ? 'Desativar' : 'Reativar'} usuário` : acao?.item ? 'Editar usuário' : 'Novo usuário'}</Text>
            {acao?.tipo === 'editar' ? <>
              <Field label="Nome *" value={nome} onChangeText={setNome} disabled={pending} />
              <Field label="E-mail *" value={email} onChangeText={setEmail} disabled={pending} />
              <Text style={ui.label}>Perfil *</Text>
              <View style={ui.row}>{PERFIS_USUARIO.map((valor) => <Button key={valor} label={PERFIS[valor]} secondary={perfil !== valor} disabled={pending || propria} onPress={() => setPerfil(valor)} />)}</View>
              <Field label={acao.item ? 'Nova senha (opcional)' : 'Senha *'} value={senha} onChangeText={setSenha} secureTextEntry disabled={pending} />
              <Field label="Confirmar senha" value={confirmar} onChangeText={setConfirmar} secureTextEntry disabled={pending} />
              <Text style={ui.text}>Use entre 15 e 128 caracteres. Na edição, deixe os dois campos de senha vazios para manter a senha atual.</Text>
              <Text style={ui.text}>Alterar e-mail, perfil ou senha encerra as sessões anteriores desse usuário.</Text>
              {propria && <Text style={ui.text}>Após salvar sua própria conta, entre novamente. Seu perfil de administrador será mantido.</Text>}
            </> : <Text style={ui.text}>{acao?.item.nome}: {acao?.item.ativo ? 'confirma a desativação? O acesso será bloqueado e as sessões anteriores encerradas.' : 'confirma a reativação? O usuário poderá entrar novamente com suas credenciais.'}</Text>}
            {!!erro && <Text accessibilityRole="alert" style={ui.error}>{erro}</Text>}
            <Button label={pending ? 'Salvando…' : acao?.tipo === 'status' ? 'Confirmar' : 'Salvar'} danger={acao?.tipo === 'status' && acao.item.ativo} disabled={pending} onPress={() => void salvar()} />
            <Button label="Cancelar" secondary disabled={pending} onPress={fechar} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  </JourneyShell>;
}
