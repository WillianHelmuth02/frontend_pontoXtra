/** SDK e API simulados: não envia notificações reais. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/push.native.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function setup() {
  const calls = [];
  const constants = { executionEnvironment: 'standalone', easConfig: { projectId: 'uuid' } };
  let status = 'undetermined';
  let listener;
  let response;
  let last = null;
  let permissionRequests = 0;
  let removed = 0;
  let register;
  let getToken = async () => ({ data: 'ExpoPushToken[fixture]' });
  const notifications = {
    AndroidImportance: { HIGH: 4 }, setNotificationHandler() {},
    async setNotificationChannelAsync(id, channel) { calls.push(['channel', id, channel]); },
    async getPermissionsAsync() { return { status }; },
    async requestPermissionsAsync() { permissionRequests++; status = 'granted'; return { status }; },
    getExpoPushTokenAsync: () => getToken(),
    async dismissAllNotificationsAsync() { calls.push(['dismiss']); },
    clearLastNotificationResponse() { last = null; },
    getLastNotificationResponse() { return last; },
    addNotificationReceivedListener(fn) { listener = fn; return { remove() { removed++; } }; },
    addNotificationResponseReceivedListener(fn) { response = fn; return { remove() { removed++; } }; },
  };
  const deps = {
    'expo-constants': { __esModule: true, default: constants },
    'react-native': { Platform: { OS: 'android' } },
    'expo-notifications': notifications,
    '@/services/api': { api: async (url, options) => { calls.push([url, options]); if (options.method === 'POST' && register) await register; } },
  };
  const module = { exports: {} };
  new Function('exports', 'require', 'module', source)(module.exports, (name) => deps[name] ?? require(name), module);
  return { api: module.exports, calls, constants,
    granted() { status = 'granted'; },
    pendingRegistration(p) { register = p; },
    pendingToken(fn) { getToken = fn; },
    last(value) { last = value; },
    receive() { listener(); }, respond(data) { response({ notification: { request: { content: { data } } } }); },
    get requests() { return permissionRequests; }, get removed() { return removed; }, get lastValue() { return last; },
  };
}

async function run() {
  let s = setup(); s.constants.executionEnvironment = 'storeClient';
  assert.match(await s.api.ativarPush(), /Instale/); assert.equal(s.calls.length, 0);
  s = setup(); await s.api.ativarPush(false); assert.equal(s.requests, 0); assert.equal(s.calls.filter((c) => c[0] === '/notificacoes/dispositivo').length, 0);
  await s.api.ativarPush(true); assert.equal(s.requests, 1);
  const registration = s.calls.find((c) => c[0] === '/notificacoes/dispositivo');
  assert.deepEqual(JSON.parse(registration[1].body), { token: 'ExpoPushToken[fixture]', plataforma: 'android' });
  assert.equal(s.calls.find((c) => c[0] === 'channel')[1], 'aprovacoes');
  await s.api.removerPush(); assert.equal(s.calls.filter((c) => c[0] === '/notificacoes/dispositivo').at(-1)[1].method, 'DELETE');
  // Logout também remove registro que sobreviveu a reinício do processo.
  s = setup(); s.granted(); await s.api.removerPush(); assert.equal(s.calls[0][1].method, 'DELETE');
  // Logout aguarda cadastro em trânsito e só depois desativa o token.
  s = setup(); s.granted(); let release;
  s.pendingRegistration(new Promise((r) => release = r));
  const activate = s.api.ativarPush(false);
  await new Promise((r) => setImmediate(r));
  const logout = s.api.removerPush(); release(); await Promise.all([activate, logout]);
  assert.deepEqual(s.calls.filter((c) => c[0] === '/notificacoes/dispositivo').map((c) => c[1].method), ['POST', 'DELETE']);
  // Cleanup impede cadastro tardio depois de trocar a sessão.
  s = setup(); s.granted(); let resolveToken;
  s.pendingToken(() => new Promise((r) => resolveToken = r));
  const pending = s.api.ativarPush(false); await new Promise((r) => setImmediate(r));
  s.api.cancelarRegistroPush(); resolveToken({ data: 'ExpoPushToken[fixture]' }); await pending;
  assert.equal(s.calls.filter((c) => c[0] === '/notificacoes/dispositivo').length, 0);
  // Resposta que abriu o app é consumida uma vez e listeners são removidos.
  s = setup(); const data = { usuarioId: '1', jornadaId: '2', notificacaoId: '3' }; let received = 0; const opened = [];
  s.last({ notification: { request: { content: { data } } } });
  const stop = s.api.observarPush(() => received++, (d) => opened.push(d));
  assert.deepEqual(opened, [data]); assert.equal(s.lastValue, null);
  s.receive(); s.respond(data); stop(); assert.equal(received, 1); assert.equal(opened.length, 2); assert.equal(s.removed, 2);
  console.log('Push nativo: permissão, canal, cadastro, logout, reinício, corrida entre sessões e listeners validados com SDK simulado.');
}
run().catch((e) => { console.error(e); process.exitCode = 1; });
