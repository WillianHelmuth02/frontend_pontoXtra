const assert = require('node:assert/strict');
const configure = require('../app.config.js');
const original = { ...process.env };
function setup(profile, url, allowHttp) {
  for (const key of ['EAS_BUILD_PROFILE', 'EXPO_PUBLIC_API_URL', 'PONTOXTRA_ALLOW_HTTP']) delete process.env[key];
  if (profile) process.env.EAS_BUILD_PROFILE = profile;
  if (url) process.env.EXPO_PUBLIC_API_URL = url;
  if (allowHttp) process.env.PONTOXTRA_ALLOW_HTTP = 'true';
  return () => configure({ config: { name: 'PontoXtra', plugins: ['expo-router'] } });
}
try {
  assert.throws(setup('preview'), /Configure EXPO_PUBLIC_API_URL/);
  for (const host of ['localhost', '127.0.0.1', '0.0.0.0', '[::1]']) {
    assert.throws(setup('preview', `http://${host}:3000`, true), /não pode usar localhost/);
  }
  assert.throws(setup('preview', 'ftp://api.example.com'), /HTTP\/HTTPS/);
  assert.throws(setup('preview', 'http://192.168.0.119:3000'), /HTTP só/);
  assert.throws(setup('production', 'http://192.168.0.119:3000', true), /Produção exige HTTPS/);
  const preview = setup('preview', 'http://192.168.0.119:3000', true)();
  assert.equal(preview.plugins.at(-1)[1].allowHttp, true);
  const production = setup('production', 'https://api.example.com', true)();
  assert.equal(production.plugins.at(-1)[1].allowHttp, false);
  assert.equal(setup()().plugins.at(-1)[1].allowHttp, false);
  console.log('Configuração validada: URL ausente/loopback/inválida bloqueada, preview HTTP explícito e produção HTTPS.');
} finally {
  for (const key of ['EAS_BUILD_PROFILE', 'EXPO_PUBLIC_API_URL', 'PONTOXTRA_ALLOW_HTTP']) {
    if (original[key] === undefined) delete process.env[key]; else process.env[key] = original[key];
  }
}
