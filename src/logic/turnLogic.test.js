import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getNextTurn } from './turnLogic.js';

const table = (bankrupt = []) =>
  [0, 1, 2, 3].map((id) => ({ id, bankrupt: bankrupt.includes(id) }));

test('giliran lanjut ke pemain berikutnya dan memutar ke awal', () => {
  const players = table();
  assert.equal(getNextTurn(0, players, false, false), 1);
  assert.equal(getNextTurn(3, players, false, false), 0);
});

test('double tanpa masuk penjara memberi giliran lagi, masuk penjara tidak', () => {
  const players = table();
  assert.equal(getNextTurn(2, players, true, false), 2);
  assert.equal(getNextTurn(2, players, true, true), 3);
});

test('pemain bangkrut dilewati', () => {
  assert.equal(getNextTurn(0, table([1]), false, false), 2);
  assert.equal(getNextTurn(0, table([1, 2]), false, false), 3);
});

test('setelah pemain tengah bangkrut, giliran ke pemain berikutnya di meja (bukan ke awal)', () => {
  // Regresi: dulu P1/P2 bangkrut selalu melempar giliran ke P0.
  assert.equal(getNextTurn(1, table([1]), false, false), 2);
  assert.equal(getNextTurn(2, table([2]), false, false), 3);
  assert.equal(getNextTurn(3, table([3]), false, false), 0);
});

test('hanya satu pemain aktif tersisa → tetap pemain itu', () => {
  assert.equal(getNextTurn(2, table([0, 1, 3]), false, false), 2);
});
