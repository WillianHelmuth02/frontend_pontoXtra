export const PERFIS_USUARIO = ['OPERACIONAL', 'RH', 'ADMINISTRADOR'] as const;
export const SENHA_MIN = 8;
export const SENHA_MAX = 128;
export type PerfilUsuario = typeof PERFIS_USUARIO[number];
export type UsuarioCadastro = { id: string; nome: string; email: string; perfil: PerfilUsuario; ativo: boolean };

export type AlteracoesConta = { nome?: string; email?: string; senha?: string; senhaAtual?: string };

export function dadosPessoais(nome: string, email: string, senha: string, confirmar: string, original: Pick<UsuarioCadastro, 'nome' | 'email'> | null) {
  const texto = nome.trim();
  const contato = email.trim().toLowerCase();
  if (!texto || Array.from(texto).length > 120) throw new Error('Nome deve conter entre 1 e 120 caracteres.');
  if (contato.length > 180 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contato)) throw new Error('Informe um e-mail válido com até 180 caracteres.');
  const dados: Omit<AlteracoesConta, 'senhaAtual'> = {};
  if (!original || texto !== original.nome) dados.nome = texto;
  if (!original || contato !== original.email) dados.email = contato;
  if (!original || senha !== '' || confirmar !== '') {
    const tamanho = Array.from(senha).length;
    if (tamanho < SENHA_MIN || tamanho > SENHA_MAX || !senha.trim()) {
      throw new Error(`Senha deve conter entre ${SENHA_MIN} e ${SENHA_MAX} caracteres e não pode conter somente espaços.`);
    }
    if (senha !== confirmar) throw new Error('A confirmação da senha não confere.');
    dados.senha = senha;
  }
  return dados;
}

/** Na edição, só envia campos alterados: email/perfil presentes revogam sessões. */
export function dadosUsuario(nome: string, email: string, perfil: PerfilUsuario, senha: string, confirmar: string, original: UsuarioCadastro | null) {
  const dados = dadosPessoais(nome, email, senha, confirmar, original);
  if (!PERFIS_USUARIO.includes(perfil)) throw new Error('Selecione um perfil válido.');
  const alteracoes = { ...dados, ...(!original || perfil !== original.perfil ? { perfil } : {}) };
  if (!Object.keys(alteracoes).length) throw new Error('Altere ao menos um campo para salvar.');
  return alteracoes;
}
