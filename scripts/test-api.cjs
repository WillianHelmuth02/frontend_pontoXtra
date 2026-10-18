/** Valida o cliente HTTP com respostas simuladas, sem acessar banco ou API real.
 * Execute: node scripts/test-api.cjs. TypeScript já é dependência do projeto.
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const target = { exports: {} };
new Function('exports', 'require', 'module', source)(target.exports, require, target);
const { api, configureSession, ApiError } = target.exports;

async function run() {
  let expired = 0;
  configureSession('test-token', () => expired++);
  global.fetch = async (_url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer test-token');
    return new Response(null, { status: 204 });
  };
  assert.equal(await api('/auth/logout', { method: 'POST' }), undefined);

  global.fetch = async () => new Response(JSON.stringify({ message: 'Expirada' }), { status: 401 });
  await assert.rejects(api('/auth/me'), ApiError);
  assert.equal(expired, 1);
  await assert.rejects(api('/auth/login', { method: 'POST' }, false), ApiError);
  assert.equal(expired, 1, 'Login público não deve disparar expiração');

  // Simula resposta antiga chegando depois de um novo login.
  global.fetch = async () => {
    configureSession('new-token', () => expired++);
    return new Response(null, { status: 401 });
  };
  await assert.rejects(api('/auth/me'), ApiError);
  assert.equal(expired, 1, 'Resposta antiga não deve encerrar nova sessão');

  global.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(api('/auth/me'), /Não foi possível acessar a API/);
  console.log('Cliente HTTP: Bearer, 204, 401, login público, sessão concorrente e falha de rede validados.');
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
