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
  // Matriz dos demais eventos: intervalo aberto bloqueia saída; fim do intervalo
  // não libera um segundo intervalo. Exclusão cabe ao criador ou RH sem marcações.
  const base = { ...open, criada_por: '9007199254740993', inicio_intervalo_em: null, fim_intervalo_em: null };
  assert.deepEqual(rules.acoesPermitidas('OPERACIONAL', base), ['entrada']);
  assert.deepEqual(rules.acoesPermitidas('RH', base), ['cancelar']);
  assert.deepEqual(rules.acoesPermitidas('OPERACIONAL', base, base.criada_por), ['entrada', 'cancelar']);
  assert.deepEqual(rules.acoesPermitidas('OPERACIONAL', base, '9007199254740992'), ['entrada']);
  assert.deepEqual(rules.acoesPermitidas('ADMINISTRADOR', base, base.criada_por), ['cancelar']);
  assert.deepEqual(rules.acoesPermitidas('ADMINISTRADOR', base, '8'), []);
  assert.deepEqual(rules.acoesPermitidas('ADMINISTRADOR', base), []);
  assert.equal(rules.ACAO_LABELS.cancelar, 'Excluir jornada');
  for (const perfil of ['OPERACIONAL', 'RH', 'ADMINISTRADOR']) {
    for (const campo of ['entrada_em', 'inicio_intervalo_em', 'fim_intervalo_em', 'saida_em']) {
      assert.equal(rules.acoesPermitidas(perfil, { ...base, [campo]: '2026-10-18T10:00:00Z' }, base.criada_por).includes('cancelar'), false);
    }
    for (const status of Object.keys(rules.STATUS_LABELS).filter((s) => s !== 'EM_ANDAMENTO')) {
      assert.equal(rules.acoesPermitidas(perfil, { ...base, status }, base.criada_por).includes('cancelar'), false);
    }
  }
  assert.deepEqual(rules.acoesPermitidas('OPERACIONAL', { ...base, entrada_em: '2026-10-18T10:00:00Z' }), ['inicio-intervalo', 'saida']);
  assert.deepEqual(rules.acoesPermitidas('OPERACIONAL', { ...base, entrada_em: '2026-10-18T10:00:00Z', inicio_intervalo_em: '2026-10-18T12:00:00Z' }), ['fim-intervalo']);
  assert.deepEqual(rules.acoesPermitidas('OPERACIONAL', { ...base, entrada_em: '2026-10-18T10:00:00Z', inicio_intervalo_em: '2026-10-18T12:00:00Z', fim_intervalo_em: '2026-10-18T13:00:00Z' }), ['saida']);
  assert.deepEqual(rules.acoesPermitidas('RH', { ...base, status: 'AGUARDANDO_CONFERENCIA' }), ['conferir', 'corrigir']);
  assert.deepEqual(rules.acoesPermitidas('ADMINISTRADOR', { ...base, status: 'AGUARDANDO_AUTORIZACAO' }), ['autorizar', 'rejeitar']);
  assert.deepEqual(rules.acoesPermitidas('RH', { ...base, status: 'AUTORIZADO' }), ['pagar']);
  assert.deepEqual(rules.acoesPermitidas('ADMINISTRADOR', { ...base, status: 'AUTORIZADO' }), []);
  for (const perfil of ['RH', 'OPERACIONAL', 'ADMINISTRADOR']) {
    for (const status of ['PAGO', 'CANCELADO']) assert.deepEqual(rules.acoesPermitidas(perfil, { ...base, status }), []);
  }
  assert.deepEqual(rules.acoesPermitidas('RH', { ...base, inicio_intervalo_em: '2026-10-18T12:00:00Z' }), []);
  assert.deepEqual(rules.acoesPermitidas('OPERACIONAL', { ...base, inicio_intervalo_em: '2026-10-18T12:00:00Z' }), []);
  const correction = { data_jornada: '18/10/2026', valor_hora: '25,50', entrada_em: '18/10/2026 23:00:00', saida_em: '19/10/2026 07:00:00', inicio_intervalo_em: '', fim_intervalo_em: '' };
  const payload = rules.payloadCorrecao(correction);
  assert.equal(payload.entrada_em, '2026-10-19T02:00:00.000Z');
  assert.equal(payload.saida_em, '2026-10-19T10:00:00.000Z');
  assert.equal(payload.valor_hora, '25.50');
  assert.equal(payload.inicio_intervalo_em, null);
  assert.equal(payload.fim_intervalo_em, null);
  assert.equal(rules.horarioFormulario(payload.entrada_em), correction.entrada_em);
  assert.equal(rules.dinheiro('9007199254740993.99'), 'R$ 9.007.199.254.740.993,99');
  assert.throws(() => rules.payloadCorrecao({ ...correction, inicio_intervalo_em: '19/10/2026 01:00:00' }));
  assert.throws(() => rules.payloadCorrecao({ ...correction, saida_em: correction.entrada_em }));
  assert.throws(() => rules.payloadCorrecao({ ...correction, valor_hora: '0' }));
  assert.throws(() => rules.payloadCorrecao({ ...correction, valor_hora: '1.000,00' }));
  assert.throws(() => rules.horarioParaApi('18/10/2026 24:00:00'));
  assert.throws(() => rules.horarioParaApi('31/02/2026 12:00:00'));
  const requests = [];
  const service = load('src/services/jornadas.ts', {
    '@/utils/jornadas': rules,
    '@/services/api': { api: async (url) => { requests.push(url); return []; } },
  });
  assert.deepEqual(await service.carregarJornadas(FILTROS_VAZIOS), { jornadas: [], prestadores: [], funcoes: [], setores: [] });
  assert.deepEqual(requests, ['/jornadas', '/prestadores', '/funcoes', '/setores']);
  console.log('Jornadas: consultas, filtros, datas, IDs grandes, correção, fuso, dinheiro e matriz de ações por perfil validados.');
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
