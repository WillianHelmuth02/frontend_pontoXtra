# Desenvolvimento local Web

> Regra de produto revisada em 22/10/2026: a criação deve aguardar aprovação do ADM para realização; após a execução e a conferência do RH, uma segunda aprovação autoriza o pagamento. A [DEC-001](../Memoria_Projeto/decisoes/DEC-001-DUPLA-APROVACAO.md) é a referência vigente. Implementação pendente: as telas e o roteiro abaixo ainda descrevem o fluxo atual com apenas a decisão posterior.

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
2. A rota `/session` abre o início conforme o perfil: lista para Operacional e
   painel de pendências para RH/Administrador, com contagens reais da API.
3. A lista consulta `GET /jornadas`, `/prestadores`, `/funcoes` e `/setores` com token.
4. Clique em Sair e confirme: `POST /auth/logout` revoga o token no backend.
5. Tente acessar `/session` sem login: você será encaminhado ao login.

O token fica somente em memória: atualizar a página ou fechar o app exige novo login.
A senha não é persistida. A expiração local e respostas 401 nas chamadas protegidas
limpam a sessão; o backend continua sendo a autoridade sobre validade e permissões.
Uma falha de rede ao sair mantém a sessão local para permitir repetir a revogação.
O backend guarda sessões em memória e reiniciá-lo também invalida tokens anteriores.
Não há recuperação automática de senha no backend: o usuário é orientado a procurar
o administrador. As jornadas agora têm criação, consulta, correção e cancelamento
auditável, além dos eventos e das ações de conferência/decisão/pagamento.

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
Início retorna à página do perfil (Operacional volta à consulta completa). Em caso de erro,
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

Os cartões oferecem Ver detalhes; + Nova jornada aparece para Operacional e RH.
Ao retornar à lista, a consulta é atualizada para refletir os eventos registrados.

## CRUD e fluxo completo das jornadas

Novas páginas usam o mesmo azul/verde e saudação do protótipo. Os acessos de
prestadores, funções e setores do protótipo não foram transformados em CRUDs
adicionais: o escopo desta entrega é o ciclo completo das jornadas. Na criação,
esses cadastros são consultados pela API e precisam existir e estar ativos.

| Rota | Finalidade |
| --- | --- |
| `/session` | Início por perfil, com pendências agregadas da API |
| `/jornadas` | Todas as jornadas, seleção e filtros |
| `/nova-jornada` | Criação por Operacional ou RH |
| `/jornada?id=...` | Dados completos, ações disponíveis e histórico |
| `/corrigir-jornada?id=...` | Correção por RH |

Nos detalhes, o Operacional registra entrada, início/fim de intervalo e saída.
Um intervalo iniciado precisa terminar antes da saída; pular o intervalo é
permitido. Os horários são capturados pelo servidor. A saída calcula tempo
líquido e valor, passando a jornada a Aguardando conferência.

RH confere e corrige somente nos status permitidos. A correção permite data,
valor/hora histórico e horários completos com segundos, apresentados em Brasília
(UTC-03). O formulário converte para UTC explícito ao enviar e permite remover
o intervalo deixando seus dois campos vazios. O backend recalcula os valores.
Uma correção volta a jornada para Aguardando conferência e invalida as decisões
anteriores, preservadas no histórico. Não troca prestador, função ou setor.

Administrador autoriza ou rejeita jornadas Aguardando autorização. A rejeição
exige justificativa e devolve ao RH para correção e nova conferência. RH registra
pagamento apenas de jornada Autorizada, informando data. Isso registra quitação,
sem executar transferência financeira. Jornadas Pagas não oferecem alterações.

A exclusão do CRUD é lógica: o criador pode excluir sua própria jornada EM_ANDAMENTO
sem qualquer marcação, e RH mantém o cancelamento administrativo de jornadas alheias.
Nos detalhes, Excluir jornada exige motivo e confirmação. A API revalida o ID do
usuário e a autoria dentro da transação. CANCELADO preserva a linha e auditoria e libera uma nova
jornada para o prestador. Não existe exclusão física ou restauração. Essa extensão
exige o ENUM atualizado conforme `back/docs/jornadas-cancelamento.md`.

Todos os comandos de escrita pedem confirmação, exceto a criação, que usa o botão
Salvar jornada após o preenchimento. Existem travas contra toque duplicado e
nenhuma escrita é repetida automaticamente. Se a criação/correção tiver resposta
inconclusiva, volte à consulta para verificar o resultado antes de reenviar.
O histórico mostra autor por ID (a API de usuários é restrita ao Administrador),
instante e alterações de cada campo; não oferece edição nem exclusão de auditoria.

## Roteiro manual por perfil

1. Com cadastros ativos existentes, entre como Operacional ou RH e crie uma jornada.
   Confira a data, prestador/função/setor e valor/hora histórico nos detalhes.
2. Como Operacional, registre entrada, aguarde ao menos um segundo, inicie intervalo,
   aguarde, finalize intervalo, aguarde e registre saída. O servidor rejeita eventos
   em sequência temporal inválida, inclusive no mesmo segundo.
3. Entre como RH, abra Aguardando conferência, confira o histórico e confira a jornada.
4. Entre como Administrador e rejeite com motivo. RH pode então corrigir os dados;
   confira recálculo e retorno a Aguardando conferência e faça nova conferência.
5. Administrador autoriza. RH registra pagamento com data e verifica o estado Pago.
6. Crie outra jornada como Operacional ou RH e, antes de qualquer marcação, use
   Excluir jornada nos detalhes com motivo. Como outro Operacional, a ação não deve
   aparecer e a chamada direta deve falhar. RH mantém cancelamento administrativo.
   Confira o histórico, o status Cancelado e a criação de nova jornada para o mesmo
   prestador. Uma jornada com entrada não deve oferecer nem aceitar exclusão.
7. Verifique filtros por data, prestador, status e os estados de lista vazia/erro.
   Operacional não deve receber ações de RH/Administrador e vice-versa.

Cada passo manual acima grava dados reais via API; use registros de teste escolhidos
por você. O teste automático MySQL descrito no backend usa rollback para não deixar
fixtures. Não existem contas/senhas padrão criadas automaticamente pelo frontend.

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
