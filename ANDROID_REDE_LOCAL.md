# Android — API na rede local

Configuração de homologação preparada em 28/10/2026. IP observado: **192.168.0.119**, porta **3000**. O APK anterior foi gerado e instalado, segundo o usuário, mas não conectou à API.

## O que foi corrigido

- `eas.json`: development/preview recebem explicitamente `EXPO_PUBLIC_API_URL=http://192.168.0.119:3000` e `PONTOXTRA_ALLOW_HTTP=true`, inclusive no build remoto.
- `.env.local`: mesma URL para desenvolvimento local; arquivo ignorado pelo Git.
- `app.config.js`: impede build com URL ausente ou loopback e exige HTTPS no perfil production. Não usar localhost no aparelho.
- `plugins/with-api-network.js`: permite HTTP no Android somente quando explicitamente habilitado para homologação; produção mantém HTTP desativado. A permissão vale para tráfego HTTP do aplicativo, não apenas para um host; usar somente em rede de teste confiável.
- Backend: bind explícito `HOST`, padrão `0.0.0.0`, porta `PORT`, padrão 3000. Não é necessário expor o MySQL ao Android.
- Erro do cliente HTTP identifica o endereço tentado para facilitar diagnóstico.

Nenhuma regra de jornada, dado de negócio, senha ou credencial Firebase é alterada por essa preparação. O registro de pagamento continua administrativo, após conferência RH e segunda aprovação ADM.

## Etapas 1 a 4

1. **IP:** executar `ipconfig`; conferir o IPv4 Wi-Fi. Se mudar, atualizar `eas.json` (development/preview) e `.env.local` antes do próximo build.
2. **Backend/banco:** no diretório `back`, executar `npm.cmd run db:check` (SELECT 1) e `npm.cmd run start:dev`. Banco existente deve ser preservado; não executar o SQL que recria o banco. Para homologação desta conexão, manter worker push desabilitado.
3. **Android:** no navegador do tablet e do smartphone, abrir **http://192.168.0.119:3000/**. A rota pública atual responde `Hello World!`. Isso testa rede/API, não login ou gravação. Ambos devem usar o mesmo Wi-Fi, sem isolamento entre clientes.
4. **URL:** development/preview já estão configurados para o IP acima. Gerar e instalar NOVO APK: mudar os arquivos no PC não atualiza o APK anterior.

Se a rota abrir no PC e falhar nos aparelhos: conferir firewall do Windows, endereço e isolamento Wi-Fi. Uma eventual regra de entrada deve limitar-se a TCP 3000, rede privada e sub-rede local. Não desativar o firewall nem liberar MySQL para os aparelhos. Rede pública deve ser tratada como tal; não alterar a classificação automaticamente.

## Gerar a versão corrigida

Na pasta `front`:

```powershell
node scripts/test-build-config.cjs
npx.cmd eas-cli@latest build --platform android --profile preview
```

Reutilizar a assinatura existente; não recriar a Keystore para cada versão. Após o sucesso, instalar a nova versão nos dois Androids e testar login/listagem. O APK preview executa sem Metro, mas depende do PC/backend/MySQL ativos e acessíveis nesta rede.

Para produção, configurar `EXPO_PUBLIC_API_URL` HTTPS no ambiente EAS production. A ausência de URL bloqueia o build de forma intencional. Não incluir senhas nas variáveis públicas.

## Web e testes finais

O script `npm.cmd run web` atende no próprio PC (`localhost:8081`), origem já prevista no CORS. Não é necessário abrir web em outros dispositivos para este cenário. CORS não controla acesso do aplicativo Android nativo.

1. Operacional no PC cria jornada; ADM no tablet autoriza realização.
2. Operacional registra execução/encerramento.
3. RH no smartphone confere; ADM decide pagamento separadamente.
4. RH registra quitação autorizada.
5. Conferir avisos internos e persistência nos três ambientes.

Push remoto é uma homologação separada: Firebase/FCM, token, permissões e worker precisam ser verificados antes de habilitar envios. Correção da URL não comprova push.

## Evidências e limites

Consultar o registro mais recente em `../Memoria_Projeto/08_ANDROID_REDE_LOCAL.md`. Acesso a partir do próprio computador não substitui teste em dispositivo físico; a instalação do novo APK e a jornada precisam de confirmação real.

Fontes técnicas: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [configuração dinâmica](https://docs.expo.dev/workflow/configuration/), [config plugins](https://docs.expo.dev/config-plugins/plugins/) e [variáveis EAS](https://docs.expo.dev/eas/environment-variables/).
