/** Testes sem escrita na API/banco: regras de habilitação, datas e integração
 * da consulta são exercitadas com respostas simuladas. node scripts/test-jornadas.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const target = { exports: {} };
  new Function('exports', 'require', source)(target.exports, (name) => {
    if (!(name in dependencies)) throw new Error(`Dependência inesperada: ${name}`);
    return dependencies[name];
  });
  return target.exports;
}

async function run() {
  const rules = load('src/utils/jornadas.ts');
  const { FILTROS_VAZIOS, queryJornadas, podeRegistrarEntrada, formatarData } = rules;
  assert.equal(queryJornadas(FILTROS_VAZIOS), '', 'A consulta inicial inclui todos os status e datas');
  const filters = { ...FILTROS_VAZIOS, prestador_id: '9007199254740993', data_inicio: '29/02/2024', status: 'EM_ANDAMENTO' };
  const params = new URLSearchParams(queryJornadas(filters).slice(1));
  assert.equal(params.get('data_inicio'), '2024-02-29');
  assert.equal(params.get('prestador_id'), '9007199254740993');
  assert.equal(params.get('status'), 'EM_ANDAMENTO');
  for (const date of ['29/02/2025', '31/04/2026', '00/01/2026', '2026-10-18']) {
    assert.throws(() => queryJornadas({ ...FILTROS_VAZIOS, data_inicio: date }));
  }
  assert.throws(() => queryJornadas({ ...FILTROS_VAZIOS, data_inicio: '19/10/2026', data_fim: '18/10/2026' }));
  assert.equal(formatarData('2026-10-18'), '18/10/2026');
  const open = { status: 'EM_ANDAMENTO', entrada_em: null, saida_em: null };
  assert.equal(podeRegistrarEntrada('OPERACIONAL', open), true);
  assert.equal(podeRegistrarEntrada('RH', open), false);
  assert.equal(podeRegistrarEntrada('ADMINISTRADOR', open), false);
  assert.equal(podeRegistrarEntrada('OPERACIONAL'), false);
  assert.equal(podeRegistrarEntrada('OPERACIONAL', { ...open, entrada_em: '2026-10-18T10:00:00Z' }), false);
  for (const status of Object.keys(rules.STATUS_LABELS).filter((status) => status !== 'EM_ANDAMENTO')) {
    assert.equal(podeRegistrarEntrada('OPERACIONAL', { ...open, status }), false);
  }
  const requests = [];
  const service = load('src/services/jornadas.ts', {
    '@/utils/jornadas': rules,
    '@/services/api': { api: async (url) => { requests.push(url); return []; } },
  });
  assert.deepEqual(await service.carregarJornadas(FILTROS_VAZIOS), { jornadas: [], prestadores: [], funcoes: [], setores: [] });
  assert.deepEqual(requests, ['/jornadas', '/prestadores', '/funcoes', '/setores']);
  console.log('Jornadas: consultas, filtros, datas, IDs grandes e permissões de entrada validados.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
