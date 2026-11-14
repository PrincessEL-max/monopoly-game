import assert from 'node:assert/strict';
import test from 'node:test';
import { getSquaresForMap, SQUARES } from '../constants/squares.js';
import { calcNetWorth, calculateRent } from './rentLogic.js';
import { calcNewPosition, findNearest, positionComesAfter } from './routeLogic.js';

const COMPACT_MAP = 'nusantara-compact';

test('compact map excludes the four removed tiles and preserves the original route', () => {
  const compact = getSquaresForMap(COMPACT_MAP);
  const removedIds = [14, 17, 36, 38];

  assert.equal(compact.length, 36);
  assert.deepEqual(
    compact.filter((square) => removedIds.includes(square.id)).map((square) => square.id),
    []
  );
  assert.equal(getSquaresForMap('nusantara').length, 40);
});

test('movement advances across removed tile IDs and awards Go only on a forward wrap', () => {
  assert.deepEqual(calcNewPosition(13, 1, COMPACT_MAP), { newPos: 15, passedGo: false });
  assert.deepEqual(calcNewPosition(16, 1, COMPACT_MAP), { newPos: 18, passedGo: false });
  assert.deepEqual(calcNewPosition(35, 1, COMPACT_MAP), { newPos: 37, passedGo: false });
  assert.deepEqual(calcNewPosition(37, 1, COMPACT_MAP), { newPos: 39, passedGo: false });
  assert.deepEqual(calcNewPosition(39, 1, COMPACT_MAP), { newPos: 0, passedGo: true });
  assert.deepEqual(calcNewPosition(0, -1, COMPACT_MAP), { newPos: 39, passedGo: false });
});

test('nearest destinations and Go crossing follow the active route order', () => {
  assert.equal(findNearest(37, 'airport', COMPACT_MAP), 5);
  assert.equal(positionComesAfter(39, 0, COMPACT_MAP), true);
  assert.equal(positionComesAfter(0, 39, COMPACT_MAP), false);
});

test('movement rejects positions removed from the selected route', () => {
  assert.throws(() => calcNewPosition(14, 1, COMPACT_MAP), RangeError);
});

test('rent groups and net worth ignore removed tiles', () => {
  const owners = { 11: 0, 13: 0, 14: 0 };
  const gameState = {
    settings: { map: COMPACT_MAP },
    owners,
    houses: {},
    hotels: {},
    players: [],
    lastRoll: null,
  };
  const removedTileState = { ...gameState, owners: { 14: 0 } };
  const thailand = SQUARES.find((square) => square.id === 13);

  assert.equal(calculateRent(thailand, gameState, { id: 1 }), 2000);
  assert.equal(calcNetWorth({ id: 0, money: 1000 }, removedTileState), 1000);
  assert.equal(
    calcNetWorth({ id: 0, money: 1000 }, { ...removedTileState, settings: { map: 'nusantara' } }),
    17000
  );
});
