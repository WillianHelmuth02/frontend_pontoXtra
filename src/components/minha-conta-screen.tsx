import { Redirect } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/app-text';
import { useAuth } from '@/contexts/auth';
import { dadosPessoais, SENHA_MIN, SENHA_MAX, type UsuarioCadastro } from '@/utils/usuarios';
import { Button, Field, JourneyShell, PERFIS, ui } from './journey-ui';

export function MinhaContaScreen() {
  const { usuario } = useAuth();
  if (!usuario) return <Redirect href="/login" />;
  return <FormularioConta key={usuario.id} usuario={usuario} />;
}

function FormularioConta({ usuario }: { usuario: UsuarioCadastro }) {
  const { atualizarConta } = useAuth();
  const [nome, setNome] = useState(usuario.nome);
  const [email, setEmail] = useState(usuario.email);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [salvando, setSalvando] = useState(false);
  const enviando = useRef(false);
  const exigeSenhaAtual = email.trim().toLowerCase() !== usuario.email || senha !== '' || confirmar !== '';

  async function salvar() {
    if (enviando.current) return;
    setErro('');
    setAviso('');
    try {
      const dados = dadosPessoais(nome, email, senha, confirmar, usuario);
      if (!Object.keys(dados).length) throw new Error('Altere ao menos um campo para salvar.');
      if (exigeSenhaAtual && !senhaAtual) throw new Error('Informe a senha atual.');
      enviando.current = true;
      setSalvando(true);
      await atualizarConta({ ...dados, ...(exigeSenhaAtual ? { senhaAtual } : {}) });
      setNome(nome.trim());
      setEmail(email.trim().toLowerCase());
      setSenhaAtual('');
      setSenha('');
      setConfirmar('');
      setAviso('Dados salvos.');
    } catch (cause) {
      setErro(cause instanceof Error ? cause.message : 'Não foi possível salvar seus dados.');
    } finally {
      enviando.current = false;
      setSalvando(false);
    }
  }

  return <JourneyShell title="Minha conta" busy={salvando}>
    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.subtitle}>Dados da conta</Text>
      <Field label="Nome" value={nome} onChangeText={setNome} autoComplete="name" disabled={salvando} />
      <Field label="E-mail" value={email} onChangeText={setEmail} autoComplete="email" keyboardType="email-address" disabled={salvando} />
      <Text style={ui.text}>Perfil de acesso: {PERFIS[usuario.perfil]}</Text>
    </View>
    <View style={ui.card}>
      <Text accessibilityRole="header" style={ui.subtitle}>Alterar senha</Text>
      <Text style={ui.text}>Use de {SENHA_MIN} a {SENHA_MAX} caracteres.</Text>
      <Field label="Nova senha (opcional)" value={senha} onChangeText={setSenha} autoComplete="new-password" secureTextEntry disabled={salvando} />
      <Field label="Confirmar nova senha" value={confirmar} onChangeText={setConfirmar} autoComplete="new-password" secureTextEntry disabled={salvando} />
      {exigeSenhaAtual && <>
        <Field label="Senha atual" value={senhaAtual} onChangeText={setSenhaAtual} autoComplete="current-password" secureTextEntry disabled={salvando} />
        <Text style={ui.text}>Ao mudar o e-mail ou a senha, você precisará entrar novamente.</Text>
      </>}
    </View>
    {!!erro && <Text accessibilityRole="alert" style={ui.error}>{erro}</Text>}
    {!!aviso && <Text accessibilityLiveRegion="polite" style={ui.notice}>{aviso}</Text>}
    <Button label={salvando ? 'Salvando…' : 'Salvar alterações'} onPress={salvar} disabled={salvando} />
  </JourneyShell>;
}
