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
2. A página provisória de sessão mostra nome, e-mail e perfil reais retornados pelo login.
3. A mensagem de validação confirma uma chamada autenticada a `GET /auth/me`.
4. Clique em Sair e confirme: `POST /auth/logout` revoga o token no backend.
5. Tente acessar a página de sessão sem login: você será encaminhado ao login.

O token fica somente em memória: atualizar a página ou fechar o app exige novo login.
A senha não é persistida. A expiração local e respostas 401 nas chamadas protegidas
limpam a sessão; o backend continua sendo a autoridade sobre validade e permissões.
Uma falha de rede ao sair mantém a sessão local para permitir repetir a revogação.
O backend guarda sessões em memória e reiniciá-lo também invalida tokens anteriores.
Não há recuperação automática de senha no backend: o usuário é orientado a procurar
o administrador. A tela de sessão é provisória, ainda não é um CRUD.

## Novas telas

Use `api<T>('/caminho')` de `src/services/api.ts` para consultar endpoints protegidos.
O cliente inclui Bearer Token, limita a espera a 15 segundos e trata erros HTTP.
Os dados do banco devem sempre passar pela API; o frontend não recebe credenciais MySQL.
Use `useAuth()` para acessar usuário/login/logout e proteja telas contra ausência de sessão.

## Validação

Frontend: `npx.cmd tsc --noEmit` e `npm.cmd run lint`.
Cliente HTTP com respostas simuladas: `node scripts/test-api.cjs`.
Backend: `npm.cmd run build`, `npm.cmd run lint` e `npm.cmd test`.
O login real precisa de uma conta existente; não crie contas ou recrie o banco para
validar a interface. Confira no DevTools > Network respostas, preflight OPTIONS e
erros de conexão. Não compartilhe capturas contendo Authorization ou senha.
