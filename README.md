# PontoXtra — frontend

Revisão: 28/10/2026. Expo SDK 58, React Native, React e TypeScript com Expo Router. A aplicação usa Stack em src/app; componentes de negócio ficam fora das rotas. Alvo mobile, com web para desenvolvimento.

## Executar

Instalar dependências conforme package-lock.json com npm.cmd ci em ambiente preparado. Configurar EXPO_PUBLIC_API_URL em .env.local a partir de .env.example; nunca inserir segredos nessa variável pública. API padrão http://localhost:3000, web na porta 8081.

```powershell
npm.cmd run web
# ou, para desenvolvimento mobile:
npm.cmd start
```

Backend deve estar ativo e preparado com as migrações adequadas. No aparelho, localhost aponta ao próprio aparelho; usar endereço alcançável. Para web, configurar CORS da origem. Ver [desenvolvimento](DESENVOLVIMENTO.md).

## Fluxos e telas

Login/logout e sessão por perfil; jornadas (consulta/criação/detalhes/correção), duas aprovações, eventos, conferência/pagamento; cancelamento/lixeira; avisos internos/push. Cadastros RH: /funcoes, /setores e /prestadores. Contas ADM: /usuarios. Relatórios dos três perfis: /relatorios, com período, prestador, status, paginação e totais completos. A lista de jornadas também possui acesso a Relatórios para o Operacional.

Quatro cadastros usam desativação, não exclusão física. Jornada possui purga limitada às canceladas sem marcações. [Fluxo completo e cinco CRUDs](../Documentos/VISAO_GERAL_ATUAL.md), [especificação](../Documentos/ESPECIFICACAO_ATUAL.md).

## Organização

- src/app: rotas.
- src/components: telas e componentes compartilhados.
- src/services: cliente HTTP, jornadas/relatórios e push.
- src/utils: contratos, filtros, formatação, validações e matriz de ações.
- src/contexts: sessão/notificações; src/hooks: carregamento/tema.
- docs: [cadastros RH](docs/cadastros-rh.md), [usuários ADM](docs/usuarios-adm.md), [relatórios](docs/relatorios.md).

Token e usuário ficam em memória. Recarregar exige login; 401/expiração encerra sessão. Servidor é a autoridade das permissões. Nenhuma credencial MySQL vai ao aplicativo. Cliente inclui timeout e não repete gravações automaticamente após falha.

## Verificar

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
node scripts/test-api.cjs
node scripts/test-jornadas.cjs
node scripts/test-push.cjs
node scripts/test-cadastros.cjs
node scripts/test-usuarios.cjs
node scripts/test-relatorios.cjs
npx.cmd expo export --platform web
```

Ao adicionar rotas, iniciar Expo para regenerar tipos locais antes de tsc. Nesta revisão, scripts e exportação web aprovados; tipos globais falham em app-tabs.tsx, app-tabs.web.tsx, jornadas-screen.tsx e use-theme.ts. Lint falha na incompatibilidade ESLint 10/plugin React (contextOrFilename.getFilename). Não apresentar essas verificações como aprovadas. [Roteiro manual/Android](../Documentos/ROTEIRO_HOMOLOGACAO.md).

Push remoto requer build/configuração apropriados; web e mocks não comprovam recebimento. Nenhum build EAS/publicação foi iniciado nesta entrega. Consultar [guia](../back/docs/notificacoes.md).

Este módulo é Git independente. Compartilhar também ../Memoria_Projeto; ler AGENTS.md antes de alterar regras.
