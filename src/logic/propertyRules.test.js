import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { canBuyProperty, canBuildHouse, canBuildHotel, canMortgage } from './propertyRules.js';
import { aiDecideMortgage, aiDecideBuild } from './aiLogic.js';
import { SQUARES } from '../constants/squares.js';

const sq = (id) => SQUARES.find((s) => s.id === id);
const player = (extra = {}) => ({ id: 0, money: 500000, mortgaged: [], ...extra });
const game = (extra = {}) => ({
  settings: { map: 'nusantara' },
  owners: {}, houses: {}, hotels: {}, housesLeft: 32, hotelsLeft: 12, ...extra,
});
// Set C = petak 11, 13, 14 (Filipina, Thailand, Vietnam)

describe('canBuyProperty', () => {
  test('hanya petak yang bisa dibeli, belum dimiliki, dan uang cukup', () => {
    assert.equal(canBuyProperty(player(), sq(3), game()), true);
    assert.equal(canBuyProperty(player(), sq(3), game({ owners: { 3: 1 } })), false); // milik lawan
    assert.equal(canBuyProperty(player({ money: 10 }), sq(3), game()), false);        // uang kurang
    assert.equal(canBuyProperty(player(), sq(0), game()), false);                     // MULAI
    assert.equal(canBuyProperty(player(), sq(4), game()), false);                     // pajak
  });
});

describe('canMortgage', () => {
  test('tidak bisa menggadai jika ada bangunan di set warna yang sama', () => {
    const g = game({ owners: { 11: 0, 13: 0, 14: 0 }, houses: { 13: 1 } });
    assert.equal(canMortgage(player(), 11, g), false); // petak 11 kosong, tapi 13 punya rumah
    assert.equal(canMortgage(player(), 13, g), false);
  });
  test('bisa menggadai jika tidak ada bangunan, dan tidak dua kali', () => {
    const g = game({ owners: { 11: 0, 13: 0 } });
    assert.equal(canMortgage(player(), 11, g), true);
    assert.equal(canMortgage(player({ mortgaged: [11] }), 11, g), false);
    assert.equal(canMortgage(player(), 14, g), false); // bukan miliknya
  });
});

describe('aturan membangun', () => {
  const full = { owners: { 11: 0, 13: 0, 14: 0 } };
  test('rumah: set penuh, merata, tanpa gadai', () => {
    assert.equal(canBuildHouse(player(), 11, game(full)), true);
    assert.equal(canBuildHouse(player(), 11, game({ owners: { 11: 0, 13: 0 } })), false);        // set belum penuh
    assert.equal(canBuildHouse(player(), 11, game({ ...full, houses: { 11: 1 } })), false);       // tidak merata
    assert.equal(canBuildHouse(player(), 13, game({ ...full, houses: { 11: 1 } })), true);
    assert.equal(canBuildHouse(player({ mortgaged: [14] }), 11, game(full)), false);              // ada gadai
    assert.equal(canBuildHouse(player({ money: 1 }), 11, game(full)), false);
    assert.equal(canBuildHouse(player({ money: 1 }), 11, game(full), { ignoreMoney: true }), true);
  });
  test('hotel: semua petak sudah 4 rumah', () => {
    assert.equal(canBuildHotel(player(), 11, game({ ...full, houses: { 11: 4, 13: 4, 14: 3 } })), false);
    assert.equal(canBuildHotel(player(), 11, game({ ...full, houses: { 11: 4, 13: 4, 14: 4 } })), true);
  });
});

describe('AI mengikuti aturan yang sama (regresi: AI macet)', () => {
  test('aiDecideMortgage tidak memilih properti yang ditolak karena set-nya punya bangunan', () => {
    // Kasus nyata dari simulasi: 11 tanpa bangunan, tapi 13 & 14 punya rumah.
    const g = game({ owners: { 11: 0, 13: 0, 14: 0 }, houses: { 13: 1, 14: 1 } });
    assert.deepEqual(aiDecideMortgage(player(), 100000, g), []);
  });
  test('aiDecideMortgage tetap memilih properti yang boleh digadai', () => {
    const g = game({ owners: { 1: 0, 11: 0, 13: 0 }, houses: {} });
    assert.ok(aiDecideMortgage(player(), 1, g).length > 0);
  });
  test('aiDecideBuild hanya mengusulkan bangunan sah (merata & tanpa gadai)', () => {
    const g = game({ owners: { 11: 0, 13: 0, 14: 0 }, houses: { 11: 1 } });
    for (const difficulty of ['easy', 'medium', 'hard']) {
      for (const build of aiDecideBuild(player(), g, difficulty)) {
        const ok = build.type === 'house'
          ? canBuildHouse(player(), build.squareId, g, { ignoreMoney: true })
          : canBuildHotel(player(), build.squareId, g, { ignoreMoney: true });
        assert.equal(ok, true, `${difficulty}: ${JSON.stringify(build)}`);
      }
    }
    const mortgaged = aiDecideBuild(player({ mortgaged: [14] }), game({ owners: { 11: 0, 13: 0, 14: 0 } }), 'hard');
    assert.deepEqual(mortgaged, []);
  });
});
