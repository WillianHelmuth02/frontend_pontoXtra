# Gestão de usuários pelo ADM

Revisão consolidada de 28/10/2026: esta tela e relatórios estão implementados. [Visão detalhada e fluxo](../../Documentos/VISAO_GERAL_ATUAL.md), [API e cobertura](../../back/docs/api-cobertura.md), [roteiro integrado](../../Documentos/ROTEIRO_HOMOLOGACAO.md). As limitações globais de tipos/lint frontend permanecem registradas no estado atual.

No painel ADM, **Gerenciar usuários** abre `/usuarios`. Demais perfis retornam ao início sem carregar a lista. A API também exige ADMINISTRADOR em todas as rotas de usuários.

Consulta com busca por nome/e-mail e filtros ativos/inativos/todos. Criação com nome (até 120 caracteres), e-mail (até 180), perfil e senha confirmada (15 a 128 caracteres). Senha é mascarada, não é consultada da API nem exibida na lista. Na edição, deixar ambos os campos de senha vazios mantém a senha atual; fechar o formulário limpa esses campos da tela.

Edição envia somente campos alterados. E-mail, perfil, senha e ativação revogam sessões do usuário conforme o backend. Ao editar a própria conta, a interface solicita novo login após salvar para atualizar os dados da sessão. O próprio ADM não pode desativar sua conta nem remover seu perfil de administrador. A API continua sendo a autoridade dessas proteções. Desativação/reativação exigem confirmação; vínculos com registros anteriores são preservados.

## Homologação pendente

1. Entrar como ADM e abrir a tela; repetir acesso direto como RH/Operacional e sem login.
2. Criar uma conta de cada perfil e conferir listagem, busca, filtros e login.
3. Testar nome/e-mail inválidos, e-mail duplicado inclusive entre inativos, senha curta e confirmação diferente.
4. Editar somente nome e conferir que a senha atual continua válida. Alterar perfil/e-mail/senha e verificar revogação da sessão anterior e novo login.
5. Cancelar e depois confirmar desativação; conferir bloqueio do login, filtro Inativos e reativação.
6. Conferir que a própria conta não oferece desativação nem mudança de perfil; editar dados próprios e entrar novamente.
7. Repetir em Android, testar API indisponível e duplo toque em Salvar.

## Verificação de 28/10/2026

44 testes backend de autenticação/contas, scripts frontend test-usuarios/test-cadastros/test-api e exportação web aprovados. Sem escrita em contas reais. Homologação visual e Android pendentes. Tipos/lint globais continuam com os problemas existentes registrados na memória do projeto.
