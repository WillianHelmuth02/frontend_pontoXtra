# Funções e setores

Revisão consolidada de 28/10/2026: os três cadastros RH estão implementados; usuários ADM e relatórios também foram entregues. [Estado vigente](../../Memoria_Projeto/02_ESTADO_ATUAL.md), [visão detalhada](../../Documentos/VISAO_GERAL_ATUAL.md). Os registros de testes abaixo distinguem a entrega de cada etapa; homologação manual/Android continua pendente.

## Prestadores — entrega de 28/10/2026

No painel RH, **Gerenciar prestadores** abre `/prestadores`. Usa o mesmo componente de funções/setores com busca por nome ou documento, filtros ativos/inativos/todos, cadastro, edição, desativação e reativação com confirmação.

Nome aceita até 150 caracteres e documento até 30, ambos obrigatórios. Documento mantém zeros e pontuação, sem presumir CPF/CNPJ. Telefone (até 25 caracteres) e e-mail (até 180, com formato válido) são opcionais; ao apagar o conteúdo na edição, envia null para limpar o contato. Duplicidade de documento, inclusive entre inativos, é validada pela API e exibida no formulário.

Homologação adicional: criar prestador com documento iniciado por zero; editar os contatos e depois limpar ambos; testar documento duplicado e campos inválidos; buscar por documento; desativar e reativar, conferindo disponibilidade na criação de jornada e preservação das jornadas antigas. Repetir com perfil sem permissão e no Android.

Verificações: 121 testes HTTP de prestadores/funções/setores, scripts test-cadastros/test-api e exportação web aprovados. As limitações globais de tipos/lint descritas abaixo continuam. Sem escrita em banco real ou homologação visual nesta entrega.

No painel do RH (`/session`), abrir **Gerenciar funções** ou **Gerenciar setores**. As rotas são `/funcoes` e `/setores`; outros perfis retornam ao início. As APIs continuam impondo permissão de RH para escrita.

Cada tela oferece busca por nome, filtros Ativos/Inativos/Todos, criação, edição, desativação e reativação. Os cadastros novos são ativos. Desativar preserva os vínculos existentes e impede seleção para novas jornadas. Não há exclusão física. Editar valor/hora de uma função não altera as jornadas existentes.

Nome: 1 a 100 caracteres após remover espaços externos. Valor/hora: de 0,01 a 99999999,99 com até duas casas, vírgula ou ponto, sem separador de milhar. Erros da API, incluindo nome duplicado entre inativos, são exibidos no formulário.

## Roteiro de homologação

1. Entrar como RH e abrir as duas telas pelo painel.
2. Criar setor e função com nomes de teste; usar 25,50 na função e conferir R$ 25,50 na lista.
3. Buscar por parte do nome, editar nome e valor e atualizar a lista para confirmar persistência.
4. Tentar nome vazio, duplicado e valores zero, negativos ou com três casas; conferir rejeição e preservação do formulário.
5. Cancelar a confirmação de desativação; depois confirmar. Conferir filtros Ativos, Inativos e Todos.
6. Reativar e confirmar que volta à seleção na criação de jornada. Jornadas antigas devem manter seus dados e valores.
7. Conferir acesso direto sem login e com Operacional/ADM; manutenção deve ficar restrita ao RH.
8. Repetir no Android e com API indisponível, conferindo mensagens, tentativa novamente e bloqueio de duplo envio.

## Verificações de 28/10/2026

- 63 testes backend de funções/setores aprovados.
- `node scripts/test-cadastros.cjs` e `node scripts/test-api.cjs` aprovados.
- Exportação web aprovada com as duas rotas.
- Typecheck global falha em arquivos existentes: app-tabs.tsx, app-tabs.web.tsx, jornadas-screen.tsx e use-theme.ts; nenhum erro nos arquivos desta entrega após regenerar tipos de rotas com Expo.
- Lint global bloqueado pela incompatibilidade entre ESLint 10 e eslint-plugin-react (`contextOrFilename.getFilename`).
- Roteiro manual acima ainda não executado; sem escrita no banco real nesta entrega.
