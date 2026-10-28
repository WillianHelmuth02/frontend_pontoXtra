/** Validação dos limites monetários do formulário, sem escrever dados reais. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/utils/cadastros.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const target = { exports: {} };
new Function('exports', source)(target.exports);
const { dadosCadastro, dadosPrestador } = target.exports;
assert.deepEqual(dadosCadastro('  Cozinha  '), { nome: 'Cozinha' });
assert.deepEqual(dadosCadastro('Garçom', '25,5'), { nome: 'Garçom', valor_hora: '25.50' });
assert.deepEqual(dadosCadastro('Garçom', '0.01'), { nome: 'Garçom', valor_hora: '0.01' });
assert.deepEqual(dadosCadastro('Garçom', '99999999,99'), { nome: 'Garçom', valor_hora: '99999999.99' });
assert.equal(dadosCadastro('😀'.repeat(100)).nome.length, 200);
for (const nome of ['', '   ', 'a'.repeat(101)]) assert.throws(() => dadosCadastro(nome));
for (const valor of ['', '0', '-1', '0,001', '100000000', '1.000,00', '1e2', 'NaN', 'Infinity']) {
  assert.throws(() => dadosCadastro('Função', valor), undefined, `Deve recusar ${valor}`);
}
console.log('Cadastros: nomes, decimais BR/API, limites e rejeição de arredondamento validados.');
assert.deepEqual(dadosPrestador('  Nome teste  ', '001.002', '  ', ''), {
  nome: 'Nome teste', documento: '001.002', telefone: null, email: null,
});
assert.deepEqual(dadosPrestador('Nome', '001', '  (11) 99999-0000 ', ' teste@example.com '), {
  nome: 'Nome', documento: '001', telefone: '(11) 99999-0000', email: 'teste@example.com',
});
assert.equal(dadosPrestador('😀'.repeat(150), 'd'.repeat(30), '1'.repeat(25), 'a'.repeat(168) + '@example.com').documento.length, 30);
for (const campos of [
  ['', '001', '', ''], ['a'.repeat(151), '001', '', ''],
  ['Nome', ' ', '', ''], ['Nome', '1'.repeat(31), '', ''],
  ['Nome', '001', '1'.repeat(26), ''], ['Nome', '001', '', 'invalido'],
  ['Nome', '001', '', 'a'.repeat(169) + '@example.com'],
]) assert.throws(() => dadosPrestador(...campos));
console.log('Prestadores: limites, documento com zeros, contatos opcionais e limpeza com null validados.');
