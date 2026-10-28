const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/usuarios.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const target = { exports: {} };
new Function('exports', source)(target.exports);
const { dadosUsuario } = target.exports;
const senha = '  senha de teste longa  ';
const original = { id: '18446744073709551615', nome: 'Teste', email: 'teste@example.com', perfil: 'ADMINISTRADOR', ativo: true };
assert.deepEqual(dadosUsuario(' Teste ', ' TESTE@example.com ', 'RH', senha, senha, null), {
  nome: 'Teste', email: 'teste@example.com', perfil: 'RH', senha,
});
assert.deepEqual(dadosUsuario('Novo nome', original.email, original.perfil, '', '', original), { nome: 'Novo nome' });
assert.deepEqual(dadosUsuario(original.nome, original.email, original.perfil, senha, senha, original), { senha });
assert.throws(() => dadosUsuario(original.nome, original.email, original.perfil, '', '', original), /Altere/);
for (const campos of [
  ['', original.email, 'RH', senha, senha],
  ['a'.repeat(121), original.email, 'RH', senha, senha],
  ['Teste', 'invalido', 'RH', senha, senha],
  ['Teste', original.email, 'INVALIDO', senha, senha],
  ['Teste', original.email, 'RH', 'curta', 'curta'],
  ['Teste', original.email, 'RH', ' '.repeat(15), ' '.repeat(15)],
  ['Teste', original.email, 'RH', 'a'.repeat(129), 'a'.repeat(129)],
  ['Teste', original.email, 'RH', senha, 'diferente'],
]) assert.throws(() => dadosUsuario(...campos, null));
assert.throws(() => dadosUsuario(original.nome, original.email, original.perfil, '', senha, original));
assert.equal(dadosUsuario('😀'.repeat(120), original.email, 'RH', '😀'.repeat(15), '😀'.repeat(15), null).senha.length, 30);
console.log('Usuários: criação, edição parcial, normalização, confirmação e limites de senha validados.');
