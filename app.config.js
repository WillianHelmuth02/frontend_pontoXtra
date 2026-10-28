// app.json continua sendo a base. Somente o endereço público da API é lido aqui.
module.exports = ({ config }) => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const rawUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const allowHttp = process.env.PONTOXTRA_ALLOW_HTTP === 'true';
  if (profile && !rawUrl) {
    throw new Error('Configure EXPO_PUBLIC_API_URL antes de gerar o aplicativo.');
  }
  if (rawUrl) {
    let url;
    try { url = new URL(rawUrl); } catch {
      throw new Error('EXPO_PUBLIC_API_URL deve ser uma URL HTTP ou HTTPS válida.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error('A URL da API deve usar HTTP/HTTPS, sem credenciais, query ou fragmento.');
    }
    if (profile && ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '[::]'].includes(url.hostname)) {
      throw new Error('O APK não pode usar localhost. Informe o IP da API na rede ou seu domínio HTTPS.');
    }
    if (url.protocol === 'http:' && profile && (!allowHttp || profile === 'production')) {
      throw new Error('HTTP só é permitido em homologação com PONTOXTRA_ALLOW_HTTP=true. Produção exige HTTPS.');
    }
  }
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      ['./plugins/with-api-network', {
        allowHttp: allowHttp && profile !== 'production' && rawUrl?.startsWith('http://') === true,
      }],
    ],
  };
};
