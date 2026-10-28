const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
function carregar(arquivo, imports = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, arquivo), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const target = { exports: {} };
  new Function('exports', 'require', source)(target.exports, (id) => imports[id] ?? require(id));
  return target.exports;
}
const jornadas = carregar('../src/utils/jornadas.ts');
const relatorios = carregar('../src/utils/relatorios.ts', { './jornadas': jornadas });
const { consultasRelatorio } = relatorios;
const filtros = { ...jornadas.FILTROS_VAZIOS, data_inicio: '01/10/2026', data_fim: '31/10/2026', status: 'AGUARDANDO_AUTORIZACAO_REALIZACAO', prestador_id: '18446744073709551615' };
const urls = consultasRelatorio(filtros, 2);
const lista = new URL(urls.jornadas, 'http://teste');
const totais = new URL(urls.totais, 'http://teste');
assert.equal(lista.searchParams.get('pagina'), '2');
assert.equal(lista.searchParams.get('limite'), '50');
assert.equal(totais.searchParams.has('pagina'), false);
assert.equal(totais.searchParams.has('limite'), false);
for (const campo of ['data_inicio', 'data_fim', 'status', 'prestador_id']) assert.equal(lista.searchParams.get(campo), totais.searchParams.get(campo));
assert.equal(totais.searchParams.get('data_inicio'), '2026-10-01');
assert.equal(totais.searchParams.get('prestador_id'), filtros.prestador_id);
assert.throws(() => consultasRelatorio({ ...filtros, data_inicio: '31/02/2026' }, 1));
assert.throws(() => consultasRelatorio({ ...filtros, data_fim: '01/01/2026' }, 1));
for (const pagina of [0, -1, 1.5, 1000001]) assert.throws(() => consultasRelatorio(filtros, pagina));
assert.equal(consultasRelatorio(jornadas.FILTROS_VAZIOS, 1).totais, '/relatorios/totais');
assert.equal(jornadas.dinheiro('9007199254740993.01'), 'R$ 9.007.199.254.740.993,01');
assert.equal(jornadas.dinheiro(null), 'Ainda não calculado');
async function run() {
  const chamadas = [];
  const mockApi = async (url) => { chamadas.push(url); return url.includes('/totais') ? { geral: { quantidade: '9007199254740993' } } : { itens: [], pagina: 2 }; };
  const service = carregar('../src/services/relatorios.ts', { '@/services/api': { api: mockApi }, '@/utils/relatorios': relatorios });
  const resultado = await service.carregarRelatorio(filtros, 2);
  assert.equal(resultado.chave, JSON.stringify([filtros, 2]));
  assert.equal(resultado.totais.geral.quantidade, '9007199254740993');
  assert.deepEqual(chamadas.sort(), [urls.jornadas, urls.totais].sort());
  const falha = carregar('../src/services/relatorios.ts', { '@/services/api': { api: async (url) => { if (url.includes('/totais')) throw new Error('falha'); return {}; } }, '@/utils/relatorios': relatorios });
  await assert.rejects(falha.carregarRelatorio(filtros, 2), /falha/);
  console.log('Relatórios: filtros idênticos, datas, paginação isolada, precisão, nulos e falha sem resultado parcial validados.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
