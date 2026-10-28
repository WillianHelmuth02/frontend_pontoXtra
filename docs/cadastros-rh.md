# Funções e setores

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
