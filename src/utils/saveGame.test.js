import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  clearSaveSlot,
  loadGameFromSlot,
  peekSave,
  peekSaveSlots,
  saveGame,
  saveGameToSlot,
} from './saveGame.js';

const storage = new Map();
globalThis.window = {
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
  },
};

const gameState = {
  phase: 'playing',
  players: [
    { id: 1, name: 'Pemain 1', isAI: false, money: 125000 },
    { id: 2, name: 'BOT', isAI: true, money: 180000 },
  ],
  currentPlayerIndex: 0,
  turnCount: 5,
  startedAt: 100,
  settings: { map: 'dunia' },
  owners: {},
  houses: {},
  hotels: {},
  housesLeft: 32,
  hotelsLeft: 12,
  freeParkingPool: 0,
  chanceDeck: [],
  communityChestDeck: [],
  lastRoll: null,
  log: [],
};

afterEach(() => storage.clear());

test('manual slots save and load independently from the main-menu autosave', () => {
  assert.equal(saveGameToSlot(gameState, 2), true);

  const slots = peekSaveSlots();
  assert.equal(slots.length, 3);
  assert.equal(slots[0].savedAt, undefined);
  assert.equal(slots[1].mapName, 'Peta Dunia');
  assert.equal(slots[1].round, 3);
  assert.equal(slots[1].money, 125000);
  assert.equal(slots[1].players, 2);
  assert.deepEqual(loadGameFromSlot(2).players, gameState.players);
  assert.equal(loadGameFromSlot(1), null);
  assert.equal(peekSave(), null);

  assert.equal(saveGame(gameState), true);
  assert.ok(peekSave()?.savedAt);
  assert.ok(peekSaveSlots()[1].savedAt);
  assert.equal(clearSaveSlot(2), true);
  assert.equal(loadGameFromSlot(2), null);
  assert.ok(peekSave()?.savedAt);
});

test('manual slots reject invalid slot numbers and non-playing states', () => {
  assert.equal(saveGameToSlot(gameState, 0), false);
  assert.equal(saveGameToSlot(gameState, 4), false);
  assert.equal(saveGameToSlot({ ...gameState, phase: 'setup' }, 1), false);
  assert.equal(loadGameFromSlot(0), null);
  assert.equal(loadGameFromSlot(4), null);
  assert.equal(clearSaveSlot(0), false);
  assert.equal(peekSaveSlots()[0].savedAt, undefined);
});

test('snapshot menyimpan dan mengembalikan state giliran yang sedang berjalan', () => {
  const midTurn = {
    ...gameState,
    waitingFor: 'RAISE_FUNDS',
    canRoll: false,
    turnEnded: false,
    landResult: { type: 'rent', rentAmount: 5000, ownerId: 2 },
    pendingDebt: { amount: 5000, creditorId: 2, kind: 'rent', alreadyApplied: false },
  };
  assert.equal(saveGameToSlot(midTurn, 1), true);
  const loaded = loadGameFromSlot(1);
  assert.equal(loaded.turnState.waitingFor, 'RAISE_FUNDS');
  assert.equal(loaded.turnState.canRoll, false);
  assert.deepEqual(loaded.turnState.pendingDebt, midTurn.pendingDebt);
  assert.deepEqual(loaded.turnState.landResult, midTurn.landResult);
  assert.equal(loaded.turnState.auction, null);
});

test('state di awal giliran disimpan dengan nilai bawaan yang aman', () => {
  assert.equal(saveGameToSlot(gameState, 3), true);
  const { turnState } = loadGameFromSlot(3);
  assert.equal(turnState.waitingFor, null);
  assert.equal(turnState.canRoll, true);
  assert.equal(turnState.pendingDebt, null);
});
