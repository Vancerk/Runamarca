import test from 'node:test';
import assert from 'node:assert/strict';
import {isTorreAdmin} from './acesso.mjs';

const owner = '1080332488070672484';
const invited = '1058895552080777247';
const outsider = '999999999999999999';
test('preserva o administrador principal com ou sem administradores adicionais', () => {
  assert.equal(isTorreAdmin(owner, {adminId: owner, extra: ''}), true);
  assert.equal(isTorreAdmin(owner, {adminId: owner, extra: invited}), true);
});
test('autoriza apenas IDs exatos da lista adicional e aceita espaços e vários IDs', () => {
  const config = {adminId: owner, extra: ` , ${invited}, ${outsider}, ${invited} `};
  assert.equal(isTorreAdmin(invited, config), true);
  assert.equal(isTorreAdmin(outsider, config), true);
  assert.equal(isTorreAdmin(invited.slice(1), config), false);
  assert.equal(isTorreAdmin('888888888888888888', config), false);
});
test('nega identidade ausente, IDs inválidos e entradas malformadas', () => {
  const config = {adminId: undefined, extra: `prefix${invited},${invited}suffix,*,`};
  for (const id of [undefined, null, '', '*', 1058895552080777247, invited]) {
    assert.equal(isTorreAdmin(id, config), false);
  }
});
test('sem lista adicional não promove mestres nem usuários do Escudo', () => {
  assert.equal(isTorreAdmin(invited, {adminId: owner, extra: undefined}), false);
});
