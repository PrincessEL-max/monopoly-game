import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { reducer, ACTIONS as A, INITIAL_GAME_STATE } from './gameReducer.js';
import { CHANCE_CARDS } from '../constants/cards.js';
import { SQUARES } from '../constants/squares.js';

// ── helpers ──────────────────────────────────────────────────
const newGame = (n = 3) => reducer(INITIAL_GAME_STATE, {
  type: A.START_GAME,
  playerSetups: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, piece: '🚀' })),
  settings: { map: 'nusantara', startMoney: 200000, turnSeconds: null },
});
const setPlayer = (s, i, patch) => ({ ...s, players: s.players.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
// Paksa hasil dadu berikutnya (d1, d2) selama `fn`
const withDice = (d1, d2, fn) => {
  const seq = [(d1 - 1) / 6 + 0.01, (d2 - 1) / 6 + 0.01];
  let i = 0;
  const original = Math.random;
  Math.random = () => (i < seq.length ? seq[i++] : original());
  try { return fn(); } finally { Math.random = original; }
};
const roll = (s, d1, d2) => withDice(d1, d2, () => reducer(s, { type: A.ROLL_DICE }));
const sq = (id) => SQUARES.find((s) => s.id === id);
// Petak 3 = Malaysia A (properti), roll 1+2 mendarat di sana dari MULAI.

describe('aksi hanya sah pada waktunya', () => {
  test('tidak bisa melempar dadu dua kali dalam satu giliran', () => {
    let s = roll(newGame(), 1, 2); // mendarat di petak 3 → tawaran beli
    s = reducer(s, { type: A.BUY_PROPERTY, squareId: 3 });
    assert.equal(s.canRoll, false);
    const again = withDice(3, 6, () => reducer(s, { type: A.ROLL_DICE }));
    assert.equal(again, s);
  });

  test('DISMISS_MODAL tidak bisa menghapus sewa yang harus dibayar', () => {
    let s = { ...newGame(), owners: { 3: 1 } };
    s = roll(s, 1, 2);
    assert.equal(s.waitingFor, 'PAY_RENT');
    assert.equal(reducer(s, { type: A.DISMISS_MODAL }), s);
  });

  test('END_TURN ditolak saat ada kewajiban atau sebelum melempar', () => {
    const fresh = newGame();
    assert.equal(reducer(fresh, { type: A.END_TURN }), fresh); // belum melempar

    let rent = roll({ ...newGame(), owners: { 3: 1 } }, 1, 2);
    assert.equal(reducer(rent, { type: A.END_TURN }), rent); // sewa tertunda

    let debt = roll(setPlayer({ ...newGame(), owners: { 3: 1 } }, 0, { money: 100 }), 1, 2);
    debt = reducer(debt, { type: A.PAY_RENT });
    assert.equal(debt.waitingFor, 'RAISE_FUNDS');
    assert.equal(reducer(debt, { type: A.END_TURN }), debt); // utang tidak bisa dilewati
  });

  test('END_TURN diizinkan setelah semua kewajiban selesai', () => {
    let s = roll({ ...newGame(), owners: { 3: 1 } }, 1, 2);
    s = reducer(s, { type: A.PAY_RENT });
    assert.equal(s.waitingFor, null);
    s = reducer(s, { type: A.END_TURN });
    assert.equal(s.currentPlayerIndex, 1);
    assert.equal(s.canRoll, true);
  });

  test('DRAW_CARD hanya setelah mendarat di petak kartu', () => {
    const s = newGame();
    assert.equal(reducer(s, { type: A.DRAW_CARD }), s);
  });

  test('PAY_RENT / PAY_TAX / DECLINE_BUY / APPLY_CARD tanpa konteksnya tidak berubah dan tidak crash', () => {
    const s = newGame();
    for (const type of [A.PAY_RENT, A.PAY_TAX, A.DECLINE_BUY, A.APPLY_CARD, A.REJECT_TRADE]) {
      assert.equal(reducer(s, { type }), s, type);
    }
  });

  test('USE_JAIL_FREE_CARD / PAY_JAIL_FINE ditolak jika tidak di penjara atau tanpa kartu', () => {
    const s = newGame();
    assert.equal(reducer(s, { type: A.USE_JAIL_FREE_CARD, source: 'chance' }), s);
    assert.equal(reducer(s, { type: A.PAY_JAIL_FINE }), s);
    const jailed = setPlayer(s, 0, { inJail: true, position: 10 });
    assert.equal(reducer(jailed, { type: A.USE_JAIL_FREE_CARD, source: 'chance' }), jailed); // tanpa kartu
  });

  test('USE_JAIL_FREE_CARD sah jika di penjara dan punya kartu', () => {
    const s = setPlayer(newGame(), 0, { inJail: true, position: 10, jailFreeCards: { chance: 1, community_chest: 0 } });
    const next = reducer(s, { type: A.USE_JAIL_FREE_CARD, source: 'chance' });
    assert.equal(next.players[0].inJail, false);
    assert.equal(next.players[0].jailFreeCards.chance, 0);
  });

  test('AUCTION_BID dengan jumlah NaN ditolak', () => {
    let s = { ...newGame(), owners: { 3: 1 } };
    s = roll({ ...newGame() }, 1, 2);
    s = reducer(s, { type: A.DECLINE_BUY });
    assert.equal(s.waitingFor, 'AUCTION');
    assert.equal(reducer(s, { type: A.AUCTION_BID, amount: NaN }), s);
  });
});

describe('membeli properti', () => {
  test('sah saat mendarat di petak yang ditawarkan', () => {
    let s = roll(newGame(), 1, 2);
    s = reducer(s, { type: A.BUY_PROPERTY, squareId: 3 });
    assert.equal(s.owners[3], 0);
    assert.equal(s.players[0].money, 200000 - sq(3).price);
  });

  test('tidak bisa membeli tanpa mendarat, atau petak lain dari yang ditawarkan', () => {
    const fresh = newGame();
    assert.equal(reducer(fresh, { type: A.BUY_PROPERTY, squareId: 39 }), fresh);
    const prompt = roll(newGame(), 1, 2);
    assert.equal(reducer(prompt, { type: A.BUY_PROPERTY, squareId: 39 }), prompt);
  });

  test('tidak bisa merebut properti yang sudah dimiliki lawan', () => {
    const s = {
      ...newGame(),
      owners: { 39: 1 },
      houses: { 39: 4 },
      waitingFor: 'BUY_DECISION',
      landResult: { type: 'buy_prompt', square: sq(39) },
    };
    assert.equal(reducer(s, { type: A.BUY_PROPERTY, squareId: 39 }), s);
  });

  test('petak non-properti tidak bisa dibeli (uang tidak jadi NaN)', () => {
    for (const id of [0, 2, 4, 7, 10]) {
      const s = { ...newGame(), waitingFor: 'BUY_DECISION', landResult: { type: 'buy_prompt', square: sq(id) } };
      const next = reducer(s, { type: A.BUY_PROPERTY, squareId: id });
      assert.equal(next, s, `petak ${id}`);
      assert.ok(Number.isFinite(next.players[0].money));
    }
  });
});

describe('membangun', () => {
  const withSet = (extra = {}) => ({ ...newGame(), owners: { 1: 0, 3: 0 }, ...extra }); // set A = petak 1 & 3

  test('rumah tidak bisa dibangun tanpa memiliki satu set warna penuh', () => {
    const s = { ...newGame(), owners: { 1: 0 } };
    assert.equal(reducer(s, { type: A.BUY_HOUSE, squareId: 1 }), s);
  });

  test('rumah sah dengan set penuh, dan harus merata', () => {
    let s = withSet();
    s = reducer(s, { type: A.BUY_HOUSE, squareId: 1 });
    assert.equal(s.houses[1], 1);
    assert.equal(reducer(s, { type: A.BUY_HOUSE, squareId: 1 }), s); // belum merata
    s = reducer(s, { type: A.BUY_HOUSE, squareId: 3 });
    assert.equal(s.houses[3], 1);
  });

  test('tidak bisa membangun jika ada properti di set yang digadai', () => {
    const s = setPlayer(withSet(), 0, { mortgaged: [3] });
    assert.equal(reducer(s, { type: A.BUY_HOUSE, squareId: 1 }), s);
  });

  test('bandara/utilitas tidak bisa dibangun (uang tidak jadi NaN)', () => {
    for (const id of [5, 12]) {
      const s = { ...newGame(), owners: { [id]: 0 } };
      const next = reducer(s, { type: A.BUY_HOUSE, squareId: id });
      assert.equal(next, s);
      assert.ok(Number.isFinite(next.players[0].money));
    }
  });

  test('hotel hanya jika semua petak di set sudah 4 rumah', () => {
    let s = withSet({ houses: { 1: 4, 3: 3 } });
    assert.equal(reducer(s, { type: A.BUY_HOTEL, squareId: 1 }), s);
    s = withSet({ houses: { 1: 4, 3: 4 } });
    const next = reducer(s, { type: A.BUY_HOTEL, squareId: 1 });
    assert.equal(next.hotels[1], 1);
    assert.equal(next.houses[1], 0);
  });
});

describe('trade', () => {
  const offer = (extra = {}) => ({ from: 0, to: 1, offeredProps: [], requestedProps: [], offeredMoney: 1000, requestedMoney: 0, ...extra });

  test('tawaran sah diteruskan ke pihak lawan', () => {
    const next = reducer(newGame(), { type: A.PROPOSE_TRADE, offer: offer() });
    assert.equal(next.waitingFor, 'TRADE_RESPONSE');
    assert.deepEqual(next.pendingTrade, offer());
  });

  test('tawaran tidak sah ditolak: ke pemain bangkrut, properti bukan milik, diri sendiri', () => {
    const s = { ...newGame(), owners: { 3: 2 } };
    assert.equal(reducer(setPlayer(s, 1, { bankrupt: true }), { type: A.PROPOSE_TRADE, offer: offer() }).pendingTrade ?? null, null);
    assert.equal(reducer(s, { type: A.PROPOSE_TRADE, offer: offer({ offeredProps: [3] }) }), s); // 3 milik P2
    assert.equal(reducer(s, { type: A.PROPOSE_TRADE, offer: offer({ to: 0 }) }), s);
    assert.equal(reducer(s, { type: A.PROPOSE_TRADE, offer: offer({ offeredMoney: -5 }) }), s);
    assert.equal(reducer(s, { type: A.PROPOSE_TRADE, offer: offer({ offeredMoney: NaN }) }), s);
  });

  test('tidak bisa mengajukan trade saat ada kewajiban tertunda (tidak menimpa waitingFor)', () => {
    const s = roll({ ...newGame(), owners: { 3: 1 } }, 1, 2); // PAY_RENT
    assert.equal(reducer(s, { type: A.PROPOSE_TRADE, offer: offer() }), s);
  });
});

describe('denda penjara paksa', () => {
  const jailedBroke = (money) => setPlayer(newGame(), 0, { inJail: true, position: 10, jailTurns: 2, money });

  test('uang kurang → harus kumpulkan dana, saldo tidak minus, belum jalan', () => {
    const s = roll(jailedBroke(3000), 1, 2);
    assert.equal(s.waitingFor, 'RAISE_FUNDS');
    assert.equal(s.pendingDebt.kind, 'jail_fine');
    assert.equal(s.players[0].money, 3000);
    assert.equal(s.players[0].inJail, true);
    assert.equal(s.players[0].position, 10);
    assert.equal(reducer(s, { type: A.SETTLE_DEBT }), s); // belum cukup
  });

  test('setelah dana cukup → lunas, bebas, dan lemparan tertunda dilanjutkan', () => {
    const s = roll(jailedBroke(3000), 1, 2);
    const funded = setPlayer(s, 0, { money: 12000 });
    const done = reducer(funded, { type: A.SETTLE_DEBT });
    assert.equal(done.players[0].inJail, false);
    assert.equal(done.players[0].money, 2000);
    assert.equal(done.players[0].position, 13);
    assert.equal(done.pendingDebt, null);
    assert.equal(done.freeParkingPool, s.freeParkingPool); // denda ke bank, bukan Parkir Gratis
  });

  test('uang cukup → bayar langsung seperti biasa', () => {
    const s = roll(jailedBroke(50000), 1, 2);
    assert.equal(s.players[0].money, 40000);
    assert.equal(s.players[0].position, 13);
  });
});

describe('giliran setelah bangkrut', () => {
  test('pemain berikutnya di meja yang main', () => {
    for (const [current, expected] of [[1, 2], [2, 3], [3, 0], [0, 1]]) {
      const s = { ...newGame(4), currentPlayerIndex: current };
      assert.equal(reducer(s, { type: A.DECLARE_BANKRUPTCY }).currentPlayerIndex, expected);
    }
  });
});

describe('kartu Bebas Penjara yang dipegang tidak ikut diacak ulang', () => {
  test('tidak muncul lagi di deck saat deck habis diacak ulang', () => {
    const jailCard = CHANCE_CARDS.find((c) => c.type === 'jail_free');
    for (let i = 0; i < 80; i += 1) {
      let s = setPlayer(newGame(2), 0, { jailFreeCards: { chance: 1, community_chest: 0 } });
      s = { ...s, chanceDeck: [], waitingFor: 'DRAW_CARD', landResult: { type: 'chance', square: sq(7) } };
      const next = reducer(s, { type: A.DRAW_CARD });
      assert.notEqual(next.activeCard?.id, jailCard.id);
      assert.ok(!next.chanceDeck.some((c) => c.id === jailCard.id));
    }
  });
});

describe('memuat save di tengah giliran', () => {
  test('LOAD_GAME memulihkan kewajiban yang tertunda', () => {
    let s = roll(setPlayer({ ...newGame(), owners: { 3: 1 } }, 0, { money: 100 }), 1, 2);
    s = reducer(s, { type: A.PAY_RENT });
    const { turnState: _ignored, ...base } = s;
    const snapshot = {
      ...base,
      turnState: {
        waitingFor: s.waitingFor, canRoll: s.canRoll, turnEnded: s.turnEnded, landResult: s.landResult,
        activeCard: null, auction: null, pendingDebt: s.pendingDebt, pendingPayments: null,
        pendingTrade: null, pendingReroll: null,
      },
    };
    const loaded = reducer(INITIAL_GAME_STATE, { type: A.LOAD_GAME, snapshot });
    assert.equal(loaded.waitingFor, 'RAISE_FUNDS');
    assert.deepEqual(loaded.pendingDebt, s.pendingDebt);
    assert.equal(loaded.canRoll, false);
    assert.equal('turnState' in loaded, false);
  });

  test('save lama tanpa turnState dimuat bersih', () => {
    const { ...base } = newGame();
    const loaded = reducer(INITIAL_GAME_STATE, { type: A.LOAD_GAME, snapshot: base });
    assert.equal(loaded.waitingFor, null);
    assert.equal(loaded.canRoll, true);
  });
});
