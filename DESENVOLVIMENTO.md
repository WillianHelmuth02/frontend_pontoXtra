# Desenvolvimento local Web

## Iniciar

Em um terminal na pasta `back`, execute `npm.cmd run start:dev`.
Em outro terminal na pasta `front`, execute `npm.cmd run web`.
Abra http://localhost:8081. A API deve responder em http://localhost:3000.
Se a porta 8081 estiver ocupada, encerre o processo anterior do Expo em seu terminal;
não escolha outra porta sem atualizar também as origens CORS da API.

O backend permite, por padrão, as origens http://localhost:8081 e
http://127.0.0.1:8081. Para personalizar, configure `CORS_ORIGINS` no `back/.env`,
separando origens por vírgula, e reinicie o backend. O `.env` existente não foi alterado.

## URL da API

O cliente usa localhost:3000 por padrão. Para mudar, copie `.env.example` para
`.env.local` dentro de `front` e altere `EXPO_PUBLIC_API_URL`. Reinicie o Expo
e recarregue a página. Essa variável é pública: nunca inclua senha ou segredo.
Na nuvem, use a URL HTTPS da API e autorize a origem HTTPS do frontend no CORS.
No dispositivo físico, localhost aponta para o aparelho; use o endereço da API na nuvem.

## Autenticação e teste manual

1. Entre com e-mail e senha de um usuário ativo já existente no banco.
2. A rota `/session` abre a lista de jornadas com nome e perfil do usuário real.
3. A lista consulta `GET /jornadas`, `/prestadores`, `/funcoes` e `/setores` com token.
4. Clique em Sair e confirme: `POST /auth/logout` revoga o token no backend.
5. Tente acessar `/session` sem login: você será encaminhado ao login.

O token fica somente em memória: atualizar a página ou fechar o app exige novo login.
A senha não é persistida. A expiração local e respostas 401 nas chamadas protegidas
limpam a sessão; o backend continua sendo a autoridade sobre validade e permissões.
Uma falha de rede ao sair mantém a sessão local para permitir repetir a revogação.
O backend guarda sessões em memória e reiniciá-lo também invalida tokens anteriores.
Não há recuperação automática de senha no backend: o usuário é orientado a procurar
o administrador. A tela de jornadas lista registros existentes; o cadastro de novas
jornadas e as demais ações do fluxo ainda terão suas próprias interfaces.

## Tela de jornadas

A composição usa azul e verde da referência, saudação real, cartões selecionáveis
e rodapé fixo. O relógio, Wi-Fi e sinal da imagem pertencem ao sistema do aparelho
e não são simulados na página. A tela tem largura máxima de 680 para leitura na Web.

Sem filtros, são consultadas todas as jornadas, em qualquer data e status. A ordem
vem da API: data de referência decrescente e ID decrescente. Não há paginação nessa
API; a FlatList virtualiza os cartões. Os cadastros são consultados sem restringir
a registros ativos, pois jornadas históricas podem referenciar cadastros inativados.
Nenhuma linha fictícia é exibida quando não há dados. Se uma referência não for
encontrada, o cartão mostra o ID em vez de inventar um nome.

O botão Filtros abre período (DD/MM/AAAA), status e prestador com busca por nome.
Aplicar consulta novamente o backend; Limpar volta à consulta completa.
Datas impossíveis ou período invertido apresentam erro antes da chamada.
Início retorna ao topo e atualiza a consulta com os filtros atuais. Em caso de erro,
Tentar novamente refaz a consulta. Dados de uma consulta falha não habilitam entrada.

Selecionar uma linha marca somente o círculo. Entrada é exibida apenas ao Operacional
e habilitada para a seleção EM_ANDAMENTO sem entrada ou saída. RH e Administrador
continuam podendo consultar as jornadas, mas não recebem essa ação operacional.
O modal de confirmação informa o prestador e explica o uso do horário do servidor.
A confirmação consulta primeiro o estado atual e envia `PATCH /jornadas/:id/entrada`
sem horário nem outros campos. A decisão final e o bloqueio de concorrência são da API.

Durante a gravação há trava contra repetição, filtros e navegação de saída ficam
indisponíveis. Após sucesso ou falha a tela consulta novamente os dados. Não existe
repetição automática de PATCH: uma falha de rede pode acontecer após o servidor
gravar a entrada. Confira o cartão antes de uma nova tentativa explícita.
O botão de entrada não cria uma jornada nem registra intervalo ou saída.

Arquivos principais: `src/components/jornadas-screen.tsx` (interface e interação),
`src/services/jornadas.ts` (consultas), `src/utils/jornadas.ts` (contratos, filtros
e habilitação). `src/app/session.tsx` mantém a rota existente após o login.

## Novas telas

Use `api<T>('/caminho')` de `src/services/api.ts` para consultar endpoints protegidos.
O cliente inclui Bearer Token, limita a espera a 15 segundos e trata erros HTTP.
Os dados do banco devem sempre passar pela API; o frontend não recebe credenciais MySQL.
Use `useAuth()` para acessar usuário/login/logout e proteja telas contra ausência de sessão.

## Validação

Frontend: `npx.cmd tsc --noEmit` e `npm.cmd run lint`.
Cliente HTTP com respostas simuladas: `node scripts/test-api.cjs`.
Regras e consultas da tela de jornadas: `node scripts/test-jornadas.cjs`.
Backend: `npm.cmd run build`, `npm.cmd run lint` e `npm.cmd test`.
O login real precisa de uma conta existente; não crie contas ou recrie o banco para
validar a interface. Confira no DevTools > Network respostas, preflight OPTIONS e
erros de conexão. Não compartilhe capturas contendo Authorization ou senha.
