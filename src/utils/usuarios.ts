export const PERFIS_USUARIO = ['OPERACIONAL', 'RH', 'ADMINISTRADOR'] as const;
export type PerfilUsuario = typeof PERFIS_USUARIO[number];
export type UsuarioCadastro = { id: string; nome: string; email: string; perfil: PerfilUsuario; ativo: boolean };

/** Na edição, só envia campos alterados: email/perfil presentes revogam sessões. */
export function dadosUsuario(nome: string, email: string, perfil: PerfilUsuario, senha: string, confirmar: string, original: UsuarioCadastro | null) {
  const texto = nome.trim();
  const contato = email.trim().toLowerCase();
  if (!texto || Array.from(texto).length > 120) throw new Error('Nome deve conter entre 1 e 120 caracteres.');
  if (contato.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) throw new Error('Informe um e-mail válido com até 180 caracteres.');
  if (!PERFIS_USUARIO.includes(perfil)) throw new Error('Selecione um perfil válido.');
  const dados: { nome?: string; email?: string; perfil?: PerfilUsuario; senha?: string } = {};
  if (!original || texto !== original.nome) dados.nome = texto;
  if (!original || contato !== original.email) dados.email = contato;
  if (!original || perfil !== original.perfil) dados.perfil = perfil;
  if (!original || senha !== '' || confirmar !== '') {
    if (Array.from(senha).length < 15 || Array.from(senha).length > 128 || !senha.trim()) throw new Error('Senha deve conter entre 15 e 128 caracteres e não pode conter somente espaços.');
    if (senha !== confirmar) throw new Error('A confirmação da senha não confere.');
    dados.senha = senha;
  }
  if (!Object.keys(dados).length) throw new Error('Altere ao menos um campo para salvar.');
  return dados;
}
