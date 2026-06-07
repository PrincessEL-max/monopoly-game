// ============================================================
// useGameState.js — Central state management
// Semua aksi game dipanggil dari sini
// ============================================================

import { useReducer, useCallback } from 'react';
import {
  createInitialState, rollDice, calcNewPosition, sendToJail,
  processJailTurn, payJailFine, useJailFreeCard, processLanding,
  buyProperty, mortgageProperty, unmortgageProperty,
  buyHouse, buyHotel, sellHouse, sellHotel,
  liquidatePlayer, startAuction, refreshStats,
  transferMoney, getNextTurn, addLog,
} from '../logic/gameLogic';
import { applyCard, drawFromDeck } from '../logic/cardLogic';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '../constants/cards';
import { RULES } from '../constants/config';
import { SQUARES } from '../constants/squares';

// ─────────────────────────────────────────────────────────────
// ACTION TYPES
// ─────────────────────────────────────────────────────────────

export const ACTIONS = {
  START_GAME:          'START_GAME',
  LOAD_GAME:           'LOAD_GAME',
  ROLL_DICE:           'ROLL_DICE',
  BUY_PROPERTY:        'BUY_PROPERTY',
  DECLINE_BUY:         'DECLINE_BUY',
  PAY_RENT:            'PAY_RENT',
  PAY_TAX:             'PAY_TAX',
  DRAW_CARD:           'DRAW_CARD',
  APPLY_CARD:          'APPLY_CARD',
  DISMISS_CARD:        'DISMISS_CARD',
  PAY_JAIL_FINE:       'PAY_JAIL_FINE',
  USE_JAIL_FREE_CARD:  'USE_JAIL_FREE_CARD',
  BUY_HOUSE:           'BUY_HOUSE',
  BUY_HOTEL:           'BUY_HOTEL',
  SELL_HOUSE:          'SELL_HOUSE',
  SELL_HOTEL:          'SELL_HOTEL',
  MORTGAGE:            'MORTGAGE',
  UNMORTGAGE:          'UNMORTGAGE',
  AUCTION_BID:         'AUCTION_BID',
  AUCTION_PASS:        'AUCTION_PASS',
  SETTLE_DEBT:         'SETTLE_DEBT',
  PROPOSE_TRADE:       'PROPOSE_TRADE',
  ACCEPT_TRADE:        'ACCEPT_TRADE',
  REJECT_TRADE:        'REJECT_TRADE',
  DECLARE_BANKRUPTCY:  'DECLARE_BANKRUPTCY',
  END_TURN:            'END_TURN',
  DISMISS_MODAL:       'DISMISS_MODAL',
};

// ─────────────────────────────────────────────────────────────
// HELPER REDUCER
// ─────────────────────────────────────────────────────────────

const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';

/**
 * Selesaikan kebangkrutan: likuidasi aset ke kreditor/bank, lalu cek
 * kondisi menang atau lanjut ke pemain berikutnya. Pemain bangkrut
 * diasumsikan pemain yang sedang giliran (currentPlayerIndex).
 */
const finishBankruptcy = (state, bankruptId, creditorId, logMsg) => {
  const sub = liquidatePlayer(state, bankruptId, creditorId);
  const active = sub.players.filter((p) => !p.bankrupt);

  const base = {
    ...state, ...sub,
    pendingDebt: null, landResult: null, activeCard: null,
    auction: null, waitingFor: null,
  };

  if (active.length === 1) {
    return {
      ...base, phase: 'ended', winner: active[0].id,
      log: addLog(state.log, `${logMsg} ${active[0].name} menang!`),
    };
  }

  return {
    ...base,
    canRoll: true,
    turnEnded: true,
    currentPlayerIndex: getNextTurn(state.currentPlayerIndex, sub.players, false, false),
    log: addLog(state.log, logMsg),
  };
};

/**
 * Tutup sesi lelang: berikan properti ke pemenang (jika ada) & potong
 * uangnya. Giliran pemain yang sedang berjalan dilanjutkan (akhiri giliran).
 */
const finalizeAuction = (state, winnerId, amount) => {
  const sq = SQUARES.find((s) => s.id === state.auction.squareId);
  if (winnerId == null) {
    return {
      ...state, auction: null, waitingFor: null, canRoll: false, landResult: null,
      log: addLog(state.log, `Lelang ${sq?.name} berakhir tanpa penawar.`),
    };
  }
  const winner = state.players.find((p) => p.id === winnerId);
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === winnerId ? { ...p, money: p.money - amount } : p
    ),
    owners: { ...state.owners, [state.auction.squareId]: winnerId },
    auction: null, waitingFor: null, canRoll: false, landResult: null,
    log: addLog(state.log, `${winner?.name} memenangkan lelang ${sq?.name} seharga $${fmt(amount)}.`),
  };
};

// ─────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────

const reducer = (state, action) => {
  switch (action.type) {

    // ── START GAME ────────────────────────────────────────────
    case ACTIONS.START_GAME: {
      return {
        ...createInitialState(action.playerSetups),
        phase: 'playing',
      };
    }

    // ── ROLL DICE ─────────────────────────────────────────────
    case ACTIONS.ROLL_DICE: {
      const { currentPlayerIndex, players } = state;
      let player = players[currentPlayerIndex];
      if (state.phase !== 'playing') return state;
      if (state.waitingFor) return state; // sedang tunggu aksi pemain

      const roll = rollDice();
      const { d1, d2, total, isDouble } = roll;

      // Cek triple double → penjara
      const newDoubles = isDouble ? player.consecutiveDoubles + 1 : 0;
      if (newDoubles >= RULES.DOUBLES_JAIL_COUNT) {
        const jailed = sendToJail({ ...player, consecutiveDoubles: 0 });
        return {
          ...state,
          players: state.players.map((p, i) => i === currentPlayerIndex ? jailed : p),
          lastRoll: roll,
          log: addLog(state.log, `${player.name} double 3x berturut! Masuk Penjara.`),
          currentPlayerIndex: getNextTurn(currentPlayerIndex, state.players, false, true),
          waitingFor: null,
          canRoll: true,
          turnEnded: true,
        };
      }

      // Pemain di penjara
      if (player.inJail) {
        const { freed, paid, patch } = processJailTurn(player, roll);

        if (!freed) {
          const updatedJailPlayer = { ...player, ...patch, consecutiveDoubles: 0 };
          const jailPlayers = state.players.map((p, i) => i === currentPlayerIndex ? updatedJailPlayer : p);
          return {
            ...state,
            players: jailPlayers,
            lastRoll: roll,
            log: addLog(state.log, `${player.name} di penjara, gagal double (${d1}+${d2}).`),
            currentPlayerIndex: getNextTurn(currentPlayerIndex, jailPlayers, false, false),
            waitingFor: null,
            canRoll: true,
            turnEnded: true,
          };
        }

        // Bebas — pakai freedPlayer sebagai base untuk gerak normal
        player = { ...player, ...patch, consecutiveDoubles: newDoubles };
      }

      // Gerak normal
      const { newPos, passedGo } = calcNewPosition(player.position, total);
      const goBonus = passedGo ? RULES.PASS_GO_REWARD : 0;

      let updatedPlayer = {
        ...player,
        position: newPos,
        money: player.money + goBonus,
        consecutiveDoubles: newDoubles,
        inJail: false,
      };

      let newPlayers = state.players.map((p, i) => i === currentPlayerIndex ? updatedPlayer : p);
      let newLog = addLog(
        state.log,
        `${player.name} lempar ${d1}+${d2}=${total}${passedGo ? `, lewat START (+$${goBonus.toLocaleString('id-ID')})` : ''}, ke petak ${newPos}.`
      );

      // Proses landing
      const square = SQUARES.find((s) => s.id === newPos);
      const landResult = processLanding(updatedPlayer, square, {
        ...state, players: newPlayers,
      });

      // go_to_jail → langsung jail, tidak perlu modal
      if (landResult.type === 'go_to_jail') {
        const jailed = sendToJail(updatedPlayer);
        const jailedPlayers = newPlayers.map((p, i) => i === currentPlayerIndex ? jailed : p);
        return {
          ...state,
          players: jailedPlayers,
          lastRoll: roll,
          log: addLog(newLog, `${player.name} masuk Penjara!`),
          landResult: null,
          waitingFor: null,
          canRoll: true,
          turnEnded: true,
          currentPlayerIndex: getNextTurn(currentPlayerIndex, jailedPlayers, false, true),
        };
      }

      return {
        ...state,
        players: newPlayers,
        lastRoll: roll,
        log: newLog,
        landResult,
        waitingFor: resolveWaitingFor(landResult),
        turnEnded: false,
        auction: landResult.type === 'auction_prompt'
          ? startAuction(newPlayers, currentPlayerIndex, landResult.square.id)
          : null,
        canRoll: false,
        // Collect Parkir Gratis pool
        ...(landResult.type === 'corner' && landResult.square?.subtype === 'free_parking' && state.freeParkingPool > 0
          ? {
              players: newPlayers.map((p, i) =>
                i === currentPlayerIndex
                  ? { ...p, money: p.money + state.freeParkingPool }
                  : p
              ),
              freeParkingPool: 0,
              log: addLog(newLog, `${player.name} dapat Parkir Gratis: $${state.freeParkingPool.toLocaleString('id-ID')}!`),
            }
          : {}),
      };
    }

    // ── BELI PROPERTI ─────────────────────────────────────────
    case ACTIONS.BUY_PROPERTY: {
      const { currentPlayerIndex, players, owners } = state;
      const player = players[currentPlayerIndex];
      const square = SQUARES.find((s) => s.id === action.squareId);
      if (!square) return state;

      const result = buyProperty(player, square, state);
      if (!result) return state;

      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p
      );

      return {
        ...state,
        players: newPlayers,
        owners: { ...owners, ...result.ownersPatch },
        landResult: null,
        waitingFor: null,
        canRoll: false,
        log: addLog(state.log, `${player.name} membeli ${square.name} seharga $${square.price.toLocaleString('id-ID')}.`),
      };
    }

    // ── TOLAK BELI / LELANG ───────────────────────────────────
    // ── TOLAK BELI → LELANG ───────────────────────────────────
    case ACTIONS.DECLINE_BUY: {
      const { currentPlayerIndex, players, landResult } = state;
      const square = landResult?.square;
      if (!square) {
        return { ...state, landResult: null, waitingFor: null, canRoll: false };
      }
      return {
        ...state,
        landResult,
        waitingFor: 'AUCTION',
        auction: startAuction(players, currentPlayerIndex, square.id),
        canRoll: false,
        log: addLog(
          state.log,
          `${players[currentPlayerIndex].name} tidak membeli ${square.name} — dilelang!`
        ),
      };
    }

    // ── BAYAR SEWA ────────────────────────────────────────────
    case ACTIONS.PAY_RENT: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const { rentAmount, ownerId } = state.landResult;
      const owner = players.find((p) => p.id === ownerId);

      // Uang tak cukup → kumpulkan dana dulu (jual/gadai) sebelum bangkrut
      if (player.money < rentAmount) {
        return {
          ...state,
          landResult: null,
          waitingFor: 'RAISE_FUNDS',
          pendingDebt: { amount: rentAmount, creditorId: ownerId, kind: 'rent', alreadyApplied: false },
          log: addLog(state.log, `${player.name} kekurangan dana untuk sewa $${fmt(rentAmount)} — harus jual/gadai aset.`),
        };
      }

      const ownerIdx = players.findIndex((p) => p.id === ownerId);
      const newPlayers = players.map((p, i) => {
        if (i === currentPlayerIndex) return { ...p, money: p.money - rentAmount };
        if (i === ownerIdx) return { ...p, money: p.money + rentAmount };
        return p;
      });

      return {
        ...state,
        players: newPlayers,
        landResult: null,
        waitingFor: null,
        canRoll: false,
        log: addLog(state.log, `${player.name} bayar sewa $${fmt(rentAmount)} ke ${owner.name}.`),
      };
    }

    // ── BAYAR PAJAK ───────────────────────────────────────────
    case ACTIONS.PAY_TAX: {
      const { currentPlayerIndex, players, landResult, freeParkingPool } = state;
      const player = players[currentPlayerIndex];
      const amount = landResult?.taxAmount ?? 0;

      // Uang tak cukup → kumpulkan dana dulu
      if (player.money < amount) {
        return {
          ...state,
          landResult: null,
          waitingFor: 'RAISE_FUNDS',
          pendingDebt: { amount, creditorId: null, kind: 'tax', alreadyApplied: false },
          log: addLog(state.log, `${player.name} kekurangan dana untuk pajak $${fmt(amount)} — harus jual/gadai aset.`),
        };
      }

      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex ? { ...p, money: p.money - amount } : p
      );

      return {
        ...state,
        players: newPlayers,
        freeParkingPool: RULES.FREE_PARKING_COLLECT ? freeParkingPool + amount : freeParkingPool,
        landResult: null,
        waitingFor: null,
        canRoll: false,
        log: addLog(state.log, `${player.name} membayar pajak $${fmt(amount)}.`),
      };
    }

    // ── TARIK KARTU ───────────────────────────────────────────
    case ACTIONS.DRAW_CARD: {
      const { currentPlayerIndex, players, landResult } = state;
      const isChance = landResult?.square?.type === 'chance';

      const deck = isChance ? state.chanceDeck : state.communityChestDeck;
      const source = isChance ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
      const { card, newDeck } = drawFromDeck(deck, source);

      return {
        ...state,
        activeCard: card,
        chanceDeck: isChance ? newDeck : state.chanceDeck,
        communityChestDeck: isChance ? state.communityChestDeck : newDeck,
        landResult: null,
        waitingFor: 'APPLY_CARD',
        log: addLog(state.log, `${players[currentPlayerIndex].name} menarik kartu: "${card.text}"`),
      };
    }

    // ── TERAPKAN KARTU ────────────────────────────────────────
    case ACTIONS.APPLY_CARD: {
      const { currentPlayerIndex, activeCard } = state;
      if (!activeCard) return state;

      const patch = applyCard(activeCard, state, currentPlayerIndex);
      let newState = { ...state, ...patch, activeCard: null, canRoll: false, turnEnded: false };

      if (patch.needsLanding) {
        const movedPlayer = newState.players[currentPlayerIndex];
        const square = SQUARES.find((s) => s.id === movedPlayer.position);
        const landResult = processLanding(movedPlayer, square, newState);

        if (landResult.type === 'go_to_jail') {
          const jailed = sendToJail(movedPlayer);
          newState = {
            ...newState,
            players: newState.players.map((p, i) => i === currentPlayerIndex ? jailed : p),
            landResult: null,
            waitingFor: null,
            canRoll: true,
            turnEnded: true,
            currentPlayerIndex: getNextTurn(currentPlayerIndex, newState.players, false, true),
          };
        } else {
          newState = {
            ...newState,
            landResult,
            waitingFor: resolveWaitingFor(landResult),
            needsLanding: false,
          };
        }
      } else {
        newState.waitingFor = null;
      }

      // Efek kartu membuat uang minus → beri kesempatan kumpulkan dana
      if (patch.bankruptPlayer !== undefined) {
        newState = {
          ...newState,
          waitingFor: 'RAISE_FUNDS',
          canRoll: false,
          landResult: null,
          activeCard: null,
          pendingDebt: { amount: 0, creditorId: null, kind: 'card', alreadyApplied: true },
        };
      }

      return newState;
    }

    // ── BAYAR DENDA PENJARA ───────────────────────────────────
    case ACTIONS.PAY_JAIL_FINE: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const updated = payJailFine(player);
      if (!updated) return state;

      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? updated : p),
        waitingFor: null,
        canRoll: true,
        log: addLog(state.log, `${player.name} membayar denda $${RULES.JAIL_FINE.toLocaleString('id-ID')} dan bebas dari penjara.`),
      };
    }

    // ── GUNAKAN KARTU BEBAS PENJARA ───────────────────────────
    case ACTIONS.USE_JAIL_FREE_CARD: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const updated = useJailFreeCard(player, action.source);

      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? updated : p),
        waitingFor: null,
        canRoll: true,
        log: addLog(state.log, `${player.name} menggunakan Kartu Bebas Penjara.`),
      };
    }

    // ── BELI RUMAH ────────────────────────────────────────────
    case ACTIONS.BUY_HOUSE: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const result = buyHouse(player, action.squareId, state);
      if (!result) return state;

      const square = SQUARES.find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p),
        houses: { ...state.houses, ...result.housesPatch },
        housesLeft: result.housesLeft,
        log: addLog(state.log, `${player.name} membangun rumah di ${square?.name}.`),
      };
    }

    // ── BELI HOTEL ────────────────────────────────────────────
    case ACTIONS.BUY_HOTEL: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const result = buyHotel(player, action.squareId, state);
      if (!result) return state;

      const square = SQUARES.find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p),
        houses: { ...state.houses, ...result.housesPatch },
        hotels: { ...state.hotels, ...result.hotelsPatch },
        housesLeft: result.housesLeft,
        hotelsLeft: result.hotelsLeft,
        log: addLog(state.log, `${player.name} membangun hotel di ${square?.name}!`),
      };
    }

    // ── JUAL RUMAH ────────────────────────────────────────────
    case ACTIONS.SELL_HOUSE: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const result = sellHouse(player, action.squareId, state);
      if (!result) return state;

      const square = SQUARES.find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p),
        houses: { ...state.houses, ...result.housesPatch },
        housesLeft: result.housesLeft,
        log: addLog(state.log, `${player.name} menjual rumah di ${square?.name} (+$${fmt(result.refund)}).`),
      };
    }

    // ── JUAL HOTEL ────────────────────────────────────────────
    case ACTIONS.SELL_HOTEL: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const result = sellHotel(player, action.squareId, state);
      if (!result) return state;

      const square = SQUARES.find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p),
        houses: { ...state.houses, ...result.housesPatch },
        hotels: { ...state.hotels, ...result.hotelsPatch },
        housesLeft: result.housesLeft,
        hotelsLeft: result.hotelsLeft,
        log: addLog(state.log, `${player.name} menjual hotel di ${square?.name} (+$${fmt(result.refund)}).`),
      };
    }

    // ── GADAI ─────────────────────────────────────────────────
    case ACTIONS.MORTGAGE: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const result = mortgageProperty(player, action.squareId, state);
      if (!result) return state;

      const square = SQUARES.find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p),
        log: addLog(state.log, `${player.name} menggadai ${square?.name}.`),
      };
    }

    // ── TEBUS GADAI ───────────────────────────────────────────
    case ACTIONS.UNMORTGAGE: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const result = unmortgageProperty(player, action.squareId);
      if (!result) return state;

      const square = SQUARES.find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p),
        log: addLog(state.log, `${player.name} menebus gadai ${square?.name}.`),
      };
    }

    // ── LELANG: TAWAR ─────────────────────────────────────────
    case ACTIONS.AUCTION_BID: {
      const a = state.auction;
      if (!a) return state;
      const bidder = state.players.find((p) => p.id === a.currentBidderId);
      const amount = Math.floor(action.amount);
      if (!bidder || amount <= a.highestBid || amount > bidder.money) return state;

      const idx = a.remaining.indexOf(a.currentBidderId);
      const next = a.remaining[(idx + 1) % a.remaining.length];

      return {
        ...state,
        auction: { ...a, highestBid: amount, highestBidderId: a.currentBidderId, currentBidderId: next },
        log: addLog(state.log, `${bidder.name} menawar $${fmt(amount)}.`),
      };
    }

    // ── LELANG: PASS ──────────────────────────────────────────
    case ACTIONS.AUCTION_PASS: {
      const a = state.auction;
      if (!a) return state;
      const passer = state.players.find((p) => p.id === a.currentBidderId);
      const idx = a.remaining.indexOf(a.currentBidderId);
      const remaining = a.remaining.filter((id) => id !== a.currentBidderId);

      // ≤1 penawar tersisa → tutup lelang.
      // Pemenang = penawar tertinggi (jika ada); jika tak ada tawaran, batal.
      if (remaining.length <= 1) {
        const stateWithLog = { ...state, log: addLog(state.log, `${passer?.name} pass.`) };
        return finalizeAuction(stateWithLog, a.highestBidderId, a.highestBid);
      }

      const next = remaining[idx % remaining.length];
      return {
        ...state,
        auction: { ...a, remaining, currentBidderId: next },
        log: addLog(state.log, `${passer?.name} pass.`),
      };
    }

    // ── LUNASI KEWAJIBAN (setelah kumpulkan dana) ─────────────
    case ACTIONS.SETTLE_DEBT: {
      const { currentPlayerIndex, players, pendingDebt, freeParkingPool } = state;
      if (!pendingDebt) return state;
      const player = players[currentPlayerIndex];

      // Kartu (sudah dipotong di muka) → cukup pastikan uang ≥ 0
      if (pendingDebt.alreadyApplied) {
        if (player.money < 0) return state;
        return {
          ...state, pendingDebt: null, waitingFor: null, canRoll: false,
          log: addLog(state.log, `${player.name} berhasil menutup kewajiban.`),
        };
      }

      // Sewa / pajak → harus punya cukup uang penuh
      if (player.money < pendingDebt.amount) return state;

      const { amount, creditorId } = pendingDebt;
      let newPlayers = players.map((p, i) =>
        i === currentPlayerIndex ? { ...p, money: p.money - amount } : p
      );
      let pool = freeParkingPool;

      if (creditorId != null) {
        const cIdx = players.findIndex((p) => p.id === creditorId);
        newPlayers = newPlayers.map((p, i) => i === cIdx ? { ...p, money: p.money + amount } : p);
      } else if (RULES.FREE_PARKING_COLLECT) {
        pool += amount; // pajak masuk Parkir Gratis
      }

      const creditor = creditorId != null ? players.find((p) => p.id === creditorId) : null;
      return {
        ...state, players: newPlayers, freeParkingPool: pool,
        pendingDebt: null, waitingFor: null, canRoll: false,
        log: addLog(state.log,
          creditor
            ? `${player.name} melunasi $${fmt(amount)} ke ${creditor.name}.`
            : `${player.name} melunasi pajak $${fmt(amount)}.`),
      };
    }

    // ── TRADE ─────────────────────────────────────────────────
    case ACTIONS.PROPOSE_TRADE: {
      return { ...state, pendingTrade: action.offer, waitingFor: 'TRADE_RESPONSE' };
    }

    case ACTIONS.ACCEPT_TRADE: {
      const { pendingTrade, players, owners } = state;
      if (!pendingTrade) return state;

      const fromPlayer = players.find((p) => p.id === pendingTrade.from);
      const toPlayer   = players.find((p) => p.id === pendingTrade.to);

      // Validasi: kedua pihak harus mampu membayar uang yang dijanjikan,
      // dan properti yang ditradekan harus benar-benar masih dimiliki &
      // tanpa bangunan (cegah trade tidak sah).
      const fromNet = pendingTrade.requestedMoney - pendingTrade.offeredMoney;
      const toNet   = pendingTrade.offeredMoney - pendingTrade.requestedMoney;
      const fromOk  = fromPlayer.money + fromNet >= 0;
      const toOk    = toPlayer.money + toNet >= 0;
      const propsValid =
        pendingTrade.offeredProps.every((id) => owners[id] === pendingTrade.from
          && !(state.houses[id] > 0) && !(state.hotels[id] > 0)) &&
        pendingTrade.requestedProps.every((id) => owners[id] === pendingTrade.to
          && !(state.houses[id] > 0) && !(state.hotels[id] > 0));

      if (!fromOk || !toOk || !propsValid) {
        return {
          ...state,
          pendingTrade: null,
          waitingFor: null,
          log: addLog(state.log, `Trade gagal: dana/aset tidak memenuhi syarat.`),
        };
      }

      // Transfer properti
      const newOwners = { ...owners };
      pendingTrade.offeredProps.forEach((id) => { newOwners[id] = pendingTrade.to; });
      pendingTrade.requestedProps.forEach((id) => { newOwners[id] = pendingTrade.from; });

      // Pindahkan status gadai mengikuti kepemilikan baru
      const movedToTo = new Set(pendingTrade.offeredProps);
      const movedToFrom = new Set(pendingTrade.requestedProps);

      const newPlayers = players.map((p) => {
        if (p.id === pendingTrade.from) {
          const mort = (p.mortgaged || [])
            .filter((id) => !movedToTo.has(id))
            .concat(pendingTrade.requestedProps.filter((id) => (toPlayer.mortgaged || []).includes(id)));
          return {
            ...p,
            money: p.money - pendingTrade.offeredMoney + pendingTrade.requestedMoney,
            mortgaged: mort,
          };
        }
        if (p.id === pendingTrade.to) {
          const mort = (p.mortgaged || [])
            .filter((id) => !movedToFrom.has(id))
            .concat(pendingTrade.offeredProps.filter((id) => (fromPlayer.mortgaged || []).includes(id)));
          return {
            ...p,
            money: p.money + pendingTrade.offeredMoney - pendingTrade.requestedMoney,
            mortgaged: mort,
          };
        }
        return p;
      });

      return {
        ...state,
        players: newPlayers,
        owners: newOwners,
        pendingTrade: null,
        waitingFor: null,
        log: addLog(state.log, `Trade antara ${fromPlayer?.name} & ${toPlayer?.name} berhasil.`),
      };
    }

    case ACTIONS.REJECT_TRADE: {
      return { ...state, pendingTrade: null, waitingFor: null };
    }

    // ── BANKRUT ───────────────────────────────────────────────
    case ACTIONS.DECLARE_BANKRUPTCY: {
      const { currentPlayerIndex, players, pendingDebt } = state;
      const player = players[currentPlayerIndex];
      const creditorId = pendingDebt?.creditorId ?? null; // ke kreditor bila ada, else bank
      return finishBankruptcy(
        state, player.id, creditorId,
        `${player.name} bangkrut dan keluar dari permainan.`
      );
    }

    // ── END TURN ──────────────────────────────────────────────
    case ACTIONS.END_TURN: {
      const { currentPlayerIndex, players, lastRoll, owners } = state;
      const rolledDouble = lastRoll?.isDouble ?? false;
      const currentPlayer = players[currentPlayerIndex];
      const wentToJail = currentPlayer.inJail;

      const nextIndex = getNextTurn(currentPlayerIndex, players, rolledDouble, wentToJail);

      return {
        ...state,
        players: refreshStats(players, owners),
        turnCount: (state.turnCount || 0) + 1,
        currentPlayerIndex: nextIndex,
        waitingFor: null,
        canRoll: true,
        turnEnded: false,
        landResult: null,
        activeCard: null,
      };
    }

    // ── MUAT GAME (dari localStorage) ─────────────────────────
    case ACTIONS.LOAD_GAME: {
      // Ganti seluruh state dengan snapshot tersimpan (sudah tervalidasi
      // di pemanggil). Bersihkan flag transien agar UI tidak nyangkut.
      return {
        ...action.snapshot,
        landResult: null,
        activeCard: null,
        auction: null,
        pendingDebt: null,
        pendingTrade: null,
        waitingFor: null,
        canRoll: true,
        turnEnded: false,
      };
    }

    // ── DISMISS MODAL ─────────────────────────────────────────
    case ACTIONS.DISMISS_MODAL: {
      return { ...state, landResult: null, activeCard: null, waitingFor: null };
    }

    default:
      return state;
  }
};

// ─────────────────────────────────────────────────────────────
// HELPER — tentukan waitingFor dari landResult
// ─────────────────────────────────────────────────────────────

const resolveWaitingFor = (landResult) => {
  if (!landResult) return null;
  switch (landResult.type) {
    case 'buy_prompt':      return 'BUY_DECISION';
    case 'auction_prompt':  return 'AUCTION';
    case 'rent':            return 'PAY_RENT';
    case 'tax':             return 'PAY_TAX';
    case 'chance':
    case 'community_chest': return 'DRAW_CARD';
    case 'go_to_jail':      return null; // langsung proses
    default:                return null;
  }
};

// ─────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────

export const useGameState = () => {
  const [state, dispatch] = useReducer(reducer, {
    phase: 'setup',
    players: [],
    currentPlayerIndex: 0,
    turnCount: 0,
    startedAt: null,
    turnEnded: false,
    owners: {},
    houses: {},
    hotels: {},
    housesLeft: RULES.MAX_HOUSES,
    hotelsLeft: RULES.MAX_HOTELS,
    freeParkingPool: 0,
    chanceDeck: [],
    communityChestDeck: [],
    lastRoll: null,
    log: [],
    landResult: null,
    activeCard: null,
    auction: null,
    pendingDebt: null,
    waitingFor: null,
    canRoll: true,
    pendingTrade: null,
    winner: null,
  });

  // ── ACTION DISPATCHERS ──────────────────────────────────────
  const startGame    = useCallback((playerSetups) => dispatch({ type: ACTIONS.START_GAME, playerSetups }), []);
  const loadGame     = useCallback((snapshot) => dispatch({ type: ACTIONS.LOAD_GAME, snapshot }), []);
  const rollDiceAct  = useCallback(() => dispatch({ type: ACTIONS.ROLL_DICE }), []);
  const buyProp      = useCallback((squareId) => dispatch({ type: ACTIONS.BUY_PROPERTY, squareId }), []);
  const declineBuy   = useCallback(() => dispatch({ type: ACTIONS.DECLINE_BUY }), []);
  const payRent      = useCallback(() => dispatch({ type: ACTIONS.PAY_RENT }), []);
  const payTax       = useCallback(() => dispatch({ type: ACTIONS.PAY_TAX }), []);
  const drawCard     = useCallback(() => dispatch({ type: ACTIONS.DRAW_CARD }), []);
  const applyCardAct = useCallback(() => dispatch({ type: ACTIONS.APPLY_CARD }), []);
  const payJailFineAct     = useCallback(() => dispatch({ type: ACTIONS.PAY_JAIL_FINE }), []);
  const useJailCardAct     = useCallback((source) => dispatch({ type: ACTIONS.USE_JAIL_FREE_CARD, source }), []);
  const buyHouseAct  = useCallback((squareId) => dispatch({ type: ACTIONS.BUY_HOUSE, squareId }), []);
  const buyHotelAct  = useCallback((squareId) => dispatch({ type: ACTIONS.BUY_HOTEL, squareId }), []);
  const sellHouseAct = useCallback((squareId) => dispatch({ type: ACTIONS.SELL_HOUSE, squareId }), []);
  const sellHotelAct = useCallback((squareId) => dispatch({ type: ACTIONS.SELL_HOTEL, squareId }), []);
  const mortgageAct  = useCallback((squareId) => dispatch({ type: ACTIONS.MORTGAGE, squareId }), []);
  const unmortgageAct= useCallback((squareId) => dispatch({ type: ACTIONS.UNMORTGAGE, squareId }), []);
  const auctionBidAct  = useCallback((amount) => dispatch({ type: ACTIONS.AUCTION_BID, amount }), []);
  const auctionPassAct = useCallback(() => dispatch({ type: ACTIONS.AUCTION_PASS }), []);
  const settleDebtAct  = useCallback(() => dispatch({ type: ACTIONS.SETTLE_DEBT }), []);
  const proposeTrade = useCallback((offer)    => dispatch({ type: ACTIONS.PROPOSE_TRADE, offer }), []);
  const acceptTrade  = useCallback(() => dispatch({ type: ACTIONS.ACCEPT_TRADE }), []);
  const rejectTrade  = useCallback(() => dispatch({ type: ACTIONS.REJECT_TRADE }), []);
  const declareBankruptcy = useCallback(() => dispatch({ type: ACTIONS.DECLARE_BANKRUPTCY }), []);
  const endTurn      = useCallback(() => dispatch({ type: ACTIONS.END_TURN }), []);
  const dismissModal = useCallback(() => dispatch({ type: ACTIONS.DISMISS_MODAL }), []);

  // ── DERIVED STATE ───────────────────────────────────────────
  const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
  const activePlayers = state.players.filter((p) => !p.bankrupt);
  const isGameOver    = state.phase === 'ended';

  return {
    // state
    ...state,
    currentPlayer,
    activePlayers,
    isGameOver,

    // actions
    startGame,
    loadGame,
    rollDice: rollDiceAct,
    buyProperty: buyProp,
    declineBuy,
    payRent,
    payTax,
    drawCard,
    applyCard: applyCardAct,
    payJailFine: payJailFineAct,
    useJailFreeCard: useJailCardAct,
    buyHouse: buyHouseAct,
    buyHotel: buyHotelAct,
    sellHouse: sellHouseAct,
    sellHotel: sellHotelAct,
    mortgage: mortgageAct,
    unmortgage: unmortgageAct,
    auctionBid: auctionBidAct,
    auctionPass: auctionPassAct,
    settleDebt: settleDebtAct,
    proposeTrade,
    acceptTrade,
    rejectTrade,
    declareBankruptcy,
    endTurn,
    dismissModal,
  };
};