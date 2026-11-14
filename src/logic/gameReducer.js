// Pure game reducer shared by the browser and Supabase Edge Functions.

import {
  createInitialState, rollDice, calcNewPosition, sendToJail,
  processJailTurn, payJailFine, useJailFreeCard, processLanding,
  buyProperty, mortgageProperty, unmortgageProperty,
  buyHouse, buyHotel, sellHouse, sellHotel,
  liquidatePlayer, startAuction, refreshStats,
  transferMoney, getNextTurn, addLog,
} from './gameLogic.js';
import { applyCard, drawFromDeck } from './cardLogic.js';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '../constants/cards.js';
import { RULES } from '../constants/config.js';
import { getSquaresForMap } from '../constants/squares.js';

export const ACTIONS = {
  START_GAME:          'START_GAME',
  LOAD_GAME:           'LOAD_GAME',
  SYNC_STATE:          'SYNC_STATE',
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
  USE_POWER_UP:        'USE_POWER_UP',
  ACCEPT_REROLL:       'ACCEPT_REROLL',
  KEEP_REROLL:         'KEEP_REROLL',
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
const EMPTY_POWER_UP_EFFECTS = {
  discountNextBuy: false,
  freeHouse: false,
  doubleRentNext: false,
  insurance: false,
  goldenDie: null,
  rerollReady: false,
  bonusTurns: 0,
};

/**
 * Selesaikan kebangkrutan: likuidasi aset ke kreditor/bank, lalu cek
 * kondisi menang atau lanjut ke pemain berikutnya. Pemain bangkrut
 * diasumsikan pemain yang sedang giliran (currentPlayerIndex).
 */
const finishBankruptcy = (state, bankruptId, creditorId, logMsg) => {
  const paymentContinuation = state.pendingPayments;
  const sub = liquidatePlayer(state, bankruptId, creditorId);
  const active = sub.players.filter((p) => !p.bankrupt);

  const base = {
    ...state, ...sub,
    pendingDebt: null, landResult: null, activeCard: null,
    auction: null, waitingFor: null, pendingPayments: null,
  };

  if (active.length === 1) {
    return {
      ...base, phase: 'ended', winner: active[0].id,
      log: addLog(state.log, `${logMsg} ${active[0].name} menang!`),
    };
  }

  if (paymentContinuation) {
    return continueCardPayments({
      ...base,
      log: addLog(state.log, logMsg),
    }, paymentContinuation.remaining, paymentContinuation.returnPlayerId);
  }

  return {
    ...base,
    canRoll: true,
    turnEnded: true,
    currentPlayerIndex: getNextTurn(state.currentPlayerIndex, sub.players, false, false),
    log: addLog(state.log, logMsg),
  };
};

const continueCardPayments = (state, payments, returnPlayerId) => {
  let nextState = state;
  const remaining = [...payments];

  while (remaining.length > 0) {
    const payment = remaining.shift();
    const payer = nextState.players.find((p) => p.id === payment.payerId);
    const creditor = nextState.players.find((p) => p.id === payment.creditorId);
    if (!payer || payer.bankrupt || !creditor || creditor.bankrupt) continue;

    if (payer.money < payment.amount) {
      return {
        ...nextState,
        currentPlayerIndex: nextState.players.findIndex((p) => p.id === payer.id),
        pendingDebt: {
          amount: payment.amount,
          creditorId: creditor.id,
          kind: 'card_transfer',
          alreadyApplied: false,
        },
        pendingPayments: { returnPlayerId, remaining },
        waitingFor: 'RAISE_FUNDS',
        canRoll: false,
        turnEnded: false,
        landResult: null,
        activeCard: null,
      };
    }

    nextState = {
      ...nextState,
      players: nextState.players.map((p) => {
        if (p.id === payer.id) return { ...p, money: p.money - payment.amount };
        if (p.id === creditor.id) return { ...p, money: p.money + payment.amount };
        return p;
      }),
      log: addLog(
        nextState.log,
        `${payer.name} membayar Rp ${fmt(payment.amount)} ke ${creditor.name}.`
      ),
    };
  }

  const returnPlayerIndex = nextState.players.findIndex((p) => p.id === returnPlayerId);
  const returnPlayer = nextState.players[returnPlayerIndex];
  if (returnPlayer && !returnPlayer.bankrupt) {
    return {
      ...nextState,
      currentPlayerIndex: returnPlayerIndex,
      pendingDebt: null,
      pendingPayments: null,
      waitingFor: null,
      canRoll: false,
      turnEnded: false,
    };
  }

  const startIndex = Math.max(0, returnPlayerIndex);
  let nextIndex = -1;
  for (let offset = 1; offset <= nextState.players.length; offset++) {
    const index = (startIndex + offset) % nextState.players.length;
    if (!nextState.players[index].bankrupt) {
      nextIndex = index;
      break;
    }
  }
  return {
    ...nextState,
    currentPlayerIndex: nextIndex >= 0 ? nextIndex : 0,
    pendingDebt: null,
    pendingPayments: null,
    waitingFor: null,
    canRoll: true,
    turnEnded: false,
    turnCount: (nextState.turnCount || 0) + 1,
  };
};

/**
 * Tutup sesi lelang: berikan properti ke pemenang (jika ada) & potong
 * uangnya. Giliran pemain yang sedang berjalan dilanjutkan (akhiri giliran).
 */
const finalizeAuction = (state, winnerId, amount) => {
  const sq = getSquaresForMap(state.settings?.map).find((s) => s.id === state.auction.squareId);
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
    log: addLog(state.log, `${winner?.name} memenangkan lelang ${sq?.name} seharga Rp ${fmt(amount)}.`),
  };
};

// ─────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────

const reduceGame = (state, action) => {
  switch (action.type) {

    // ── START GAME ────────────────────────────────────────────
    case ACTIONS.START_GAME: {
      return {
        ...createInitialState(action.playerSetups, action.settings),
        phase: 'playing',
      };
    }

    // ── ROLL DICE ─────────────────────────────────────────────
    case ACTIONS.ROLL_DICE: {
      const { currentPlayerIndex, players } = state;
      let player = players[currentPlayerIndex];
      if (state.phase !== 'playing') return state;
      if (state.waitingFor) return state; // sedang tunggu aksi pemain

      const effects = { ...EMPTY_POWER_UP_EFFECTS, ...player.powerUpEffects };
      const hasReroll = effects.rerollReady;
      const roll = action.rollOverride || rollDice(effects.goldenDie);
      if (effects.goldenDie != null || hasReroll) {
        player = {
          ...player,
          powerUpEffects: { ...effects, goldenDie: null, rerollReady: false },
        };
        state = {
          ...state,
          players: players.map((p, i) => i === currentPlayerIndex ? player : p),
        };
      }

      if (hasReroll) {
        return {
          ...state,
          lastRoll: roll,
          pendingReroll: roll,
          waitingFor: 'REROLL_DECISION',
          canRoll: false,
          log: addLog(state.log, `${player.name} dapat memilih untuk melempar ulang dadu.`),
        };
      }

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
      const { newPos, passedGo } = calcNewPosition(player.position, total, state.settings?.map);
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
        `${player.name} lempar ${d1}+${d2}=${total}${passedGo ? `, lewat MULAI (+Rp ${fmt(goBonus)})` : ''}, ke petak ${newPos}.`
      );

      // Proses landing
      const square = getSquaresForMap(state.settings?.map).find((s) => s.id === newPos);
      if (!square) return state;
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
              log: addLog(newLog, `${player.name} dapat Parkir Gratis: Rp ${fmt(state.freeParkingPool)}!`),
            }
          : {}),
      };
    }

    case ACTIONS.ACCEPT_REROLL: {
      if (state.waitingFor !== 'REROLL_DECISION' || !state.pendingReroll) return state;
      return reduceGame({
        ...state,
        pendingReroll: null,
        waitingFor: null,
      }, { type: ACTIONS.ROLL_DICE, rollOverride: rollDice() });
    }

    case ACTIONS.KEEP_REROLL: {
      if (state.waitingFor !== 'REROLL_DECISION' || !state.pendingReroll) return state;
      return reduceGame({
        ...state,
        pendingReroll: null,
        waitingFor: null,
      }, { type: ACTIONS.ROLL_DICE, rollOverride: state.pendingReroll });
    }

    // ── BELI PROPERTI ─────────────────────────────────────────
    case ACTIONS.BUY_PROPERTY: {
      const { currentPlayerIndex, players, owners } = state;
      const player = players[currentPlayerIndex];
      const square = getSquaresForMap(state.settings?.map).find((s) => s.id === action.squareId);
      if (!square) return state;

      const effects = { ...EMPTY_POWER_UP_EFFECTS, ...player.powerUpEffects };
      const price = effects.discountNextBuy ? Math.floor(square.price / 2) : square.price;
      const result = buyProperty(player, { ...square, price }, state);
      if (!result) return state;

      const newPlayers = players.map((p, i) =>
        i === currentPlayerIndex
          ? {
            ...p,
            ...result.playerPatch,
            powerUpEffects: { ...effects, discountNextBuy: false },
          }
          : p
      );

      return {
        ...state,
        players: newPlayers,
        owners: { ...owners, ...result.ownersPatch },
        landResult: null,
        waitingFor: null,
        canRoll: false,
        log: addLog(state.log, `${player.name} membeli ${square.name} seharga Rp ${fmt(price)}.`),
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
      const amount = rentAmount * (owner?.powerUpEffects?.doubleRentNext ? 2 : 1);
      const clearDoubleRent = (list) => list.map((p) =>
        p.id === ownerId && p.powerUpEffects?.doubleRentNext
          ? { ...p, powerUpEffects: { ...p.powerUpEffects, doubleRentNext: false } }
          : p
      );

      // Uang tak cukup → kumpulkan dana dulu (jual/gadai) sebelum bangkrut
      if (player.money < amount) {
        return {
          ...state,
          players: clearDoubleRent(players),
          landResult: null,
          waitingFor: 'RAISE_FUNDS',
          pendingDebt: { amount, creditorId: ownerId, kind: 'rent', alreadyApplied: false },
          log: addLog(state.log, `${player.name} kekurangan dana untuk sewa Rp ${fmt(amount)} — harus jual/gadai aset.`),
        };
      }

      const ownerIdx = players.findIndex((p) => p.id === ownerId);
      const newPlayers = clearDoubleRent(players).map((p, i) => {
        if (i === currentPlayerIndex) return { ...p, money: p.money - amount };
        if (i === ownerIdx) return { ...p, money: p.money + amount };
        return p;
      });

      return {
        ...state,
        players: newPlayers,
        landResult: null,
        waitingFor: null,
        canRoll: false,
        log: addLog(state.log, `${player.name} bayar sewa Rp ${fmt(amount)} ke ${owner.name}.`),
      };
    }

    // ── BAYAR PAJAK ───────────────────────────────────────────
    case ACTIONS.PAY_TAX: {
      const { currentPlayerIndex, players, landResult, freeParkingPool } = state;
      const player = players[currentPlayerIndex];
      const amount = landResult?.taxAmount ?? 0;
      if (player.powerUpEffects?.insurance) {
        return {
          ...state,
          players: players.map((p, i) => i === currentPlayerIndex
            ? { ...p, powerUpEffects: { ...p.powerUpEffects, insurance: false } }
            : p),
          landResult: null,
          waitingFor: null,
          canRoll: false,
          log: addLog(state.log, `${player.name} memakai Asuransi dan membatalkan pajak.`),
        };
      }

      // Uang tak cukup → kumpulkan dana dulu
      if (player.money < amount) {
        return {
          ...state,
          landResult: null,
          waitingFor: 'RAISE_FUNDS',
          pendingDebt: { amount, creditorId: null, kind: 'tax', alreadyApplied: false },
          log: addLog(state.log, `${player.name} kekurangan dana untuk pajak Rp ${fmt(amount)} — harus jual/gadai aset.`),
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
        log: addLog(state.log, `${player.name} membayar pajak Rp ${fmt(amount)}.`),
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
        const square = getSquaresForMap(state.settings?.map).find((s) => s.id === movedPlayer.position);
        if (!square) return state;
        let landResult = processLanding(movedPlayer, square, newState);

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
          if (patch.nearestRentMultiplier && landResult.type === 'rent') {
            landResult = {
              ...landResult,
              rentAmount: landResult.square.type === 'utility'
                ? (newState.lastRoll?.total ?? 0) * patch.nearestRentMultiplier
                : landResult.rentAmount * patch.nearestRentMultiplier,
            };
          }
          newState = {
            ...newState,
            landResult,
            waitingFor: resolveWaitingFor(landResult),
            needsLanding: false,
            nearestRentMultiplier: undefined,
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

      if (patch.payments) {
        newState = continueCardPayments(
          newState,
          patch.payments,
          state.players[currentPlayerIndex].id
        );
      }

      return newState;
    }

    case ACTIONS.USE_POWER_UP: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const powerUpIndex = (player.powerUps || []).findIndex((card) => card.id === action.cardId);
      if (powerUpIndex < 0 || state.phase !== 'playing') return state;

      const card = player.powerUps[powerUpIndex];
      const canUse = {
        power_discount_next_buy: state.waitingFor === 'BUY_DECISION',
        power_free_house: !state.waitingFor,
        power_double_rent: !state.waitingFor,
        power_insurance: !state.waitingFor ||
          state.waitingFor === 'PAY_TAX' ||
          (state.waitingFor === 'APPLY_CARD' && ['pay', 'repairs'].includes(state.activeCard?.type)),
        power_golden_die: state.canRoll && !state.waitingFor,
        power_reroll: state.canRoll && !state.waitingFor,
        power_extra_turn: !state.waitingFor,
        power_ticket_station: !state.waitingFor,
      };
      if (!canUse[card.action]) return state;

      const powerUps = player.powerUps.filter((_, index) => index !== powerUpIndex);
      const effects = { ...EMPTY_POWER_UP_EFFECTS, ...player.powerUpEffects };
      let updatedEffects = effects;

      switch (card.action) {
        case 'power_discount_next_buy':
          updatedEffects = { ...effects, discountNextBuy: true };
          break;
        case 'power_free_house':
          updatedEffects = { ...effects, freeHouse: true };
          break;
        case 'power_double_rent':
          updatedEffects = { ...effects, doubleRentNext: true };
          break;
        case 'power_insurance':
          updatedEffects = { ...effects, insurance: true };
          break;
        case 'power_golden_die':
          if (!Number.isInteger(action.choice) || action.choice < 1 || action.choice > 6) return state;
          updatedEffects = { ...effects, goldenDie: action.choice };
          break;
        case 'power_reroll':
          updatedEffects = { ...effects, rerollReady: true };
          break;
        case 'power_extra_turn':
          updatedEffects = { ...effects, bonusTurns: effects.bonusTurns + 1 };
          break;
        case 'power_ticket_station': {
          const square = getSquaresForMap(state.settings?.map).find((candidate) =>
            candidate.id === action.squareId &&
            (candidate.type === 'airport' || candidate.type === 'utility')
          );
          if (!square) return state;

          const movedPlayer = { ...player, powerUps, position: square.id };
          const movedPlayers = players.map((p, index) =>
            index === currentPlayerIndex ? movedPlayer : p
          );
          const landResult = processLanding(movedPlayer, square, { ...state, players: movedPlayers });
          return {
            ...state,
            players: movedPlayers,
            landResult,
            waitingFor: resolveWaitingFor(landResult),
            canRoll: false,
            log: addLog(state.log, `${player.name} memakai Tiket Pesawat ke ${square.name}.`),
          };
        }
        default:
          return state;
      }

      return {
        ...state,
        players: players.map((p, index) => index === currentPlayerIndex
          ? { ...p, powerUps, powerUpEffects: updatedEffects }
          : p),
        log: addLog(state.log, `${player.name} memakai Power Up: ${card.name || card.action}.`),
      };
    }

    // ── BAYAR DENDA PENJARA ───────────────────────────────────
    case ACTIONS.PAY_JAIL_FINE: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      if (player.powerUpEffects?.insurance) {
        return {
          ...state,
          players: players.map((p, i) => i === currentPlayerIndex
            ? {
              ...p,
              inJail: false,
              jailTurns: 0,
              powerUpEffects: { ...p.powerUpEffects, insurance: false },
            }
            : p),
          waitingFor: null,
          canRoll: true,
          log: addLog(state.log, `${player.name} memakai Asuransi untuk membatalkan denda penjara.`),
        };
      }
      const updated = payJailFine(player);
      if (!updated) return state;

      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? updated : p),
        waitingFor: null,
        canRoll: true,
        log: addLog(state.log, `${player.name} membayar denda Rp ${fmt(RULES.JAIL_FINE)} dan bebas dari penjara.`),
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
      const freeHouse = player.powerUpEffects?.freeHouse === true;
      const result = buyHouse(player, action.squareId, state, { free: freeHouse });
      if (!result) return state;

      const square = getSquaresForMap(state.settings?.map).find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex
          ? {
            ...p,
            ...result.playerPatch,
            powerUpEffects: {
              ...(p.powerUpEffects || {}),
              ...(freeHouse ? { freeHouse: false } : {}),
            },
          }
          : p),
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

      const square = getSquaresForMap(state.settings?.map).find((s) => s.id === action.squareId);
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

      const square = getSquaresForMap(state.settings?.map).find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p),
        houses: { ...state.houses, ...result.housesPatch },
        housesLeft: result.housesLeft,
        log: addLog(state.log, `${player.name} menjual rumah di ${square?.name} (+Rp ${fmt(result.refund)}).`),
      };
    }

    // ── JUAL HOTEL ────────────────────────────────────────────
    case ACTIONS.SELL_HOTEL: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const result = sellHotel(player, action.squareId, state);
      if (!result) return state;

      const square = getSquaresForMap(state.settings?.map).find((s) => s.id === action.squareId);
      return {
        ...state,
        players: players.map((p, i) => i === currentPlayerIndex ? { ...p, ...result.playerPatch } : p),
        houses: { ...state.houses, ...result.housesPatch },
        hotels: { ...state.hotels, ...result.hotelsPatch },
        housesLeft: result.housesLeft,
        hotelsLeft: result.hotelsLeft,
        log: addLog(state.log, `${player.name} menjual hotel di ${square?.name} (+Rp ${fmt(result.refund)}).`),
      };
    }

    // ── GADAI ─────────────────────────────────────────────────
    case ACTIONS.MORTGAGE: {
      const { currentPlayerIndex, players } = state;
      const player = players[currentPlayerIndex];
      const result = mortgageProperty(player, action.squareId, state);
      if (!result) return state;

      const square = getSquaresForMap(state.settings?.map).find((s) => s.id === action.squareId);
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
      const result = unmortgageProperty(player, action.squareId, state);
      if (!result) return state;

      const square = getSquaresForMap(state.settings?.map).find((s) => s.id === action.squareId);
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
        log: addLog(state.log, `${bidder.name} menawar Rp ${fmt(amount)}.`),
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
      const settledState = {
        ...state, players: newPlayers, freeParkingPool: pool,
        pendingDebt: null, waitingFor: null, canRoll: false,
        log: addLog(state.log,
          creditor
            ? `${player.name} melunasi Rp ${fmt(amount)} ke ${creditor.name}.`
            : `${player.name} melunasi pajak Rp ${fmt(amount)}.`),
      };
      if (state.pendingPayments) {
        return continueCardPayments(
          settledState,
          state.pendingPayments.remaining,
          state.pendingPayments.returnPlayerId
        );
      }
      return settledState;
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
      const bonusTurns = currentPlayer.powerUpEffects?.bonusTurns || 0;
      const hasBonusTurn = bonusTurns > 0;
      const nextIndex = hasBonusTurn
        ? currentPlayerIndex
        : getNextTurn(currentPlayerIndex, players, rolledDouble, wentToJail);
      const nextPlayers = refreshStats(players, owners, state.settings?.map).map((player, index) =>
        index === currentPlayerIndex && hasBonusTurn
          ? {
            ...player,
            powerUpEffects: {
              ...(player.powerUpEffects || {}),
              bonusTurns: bonusTurns - 1,
            },
          }
          : player
      );

      return {
        ...state,
        players: nextPlayers,
        turnCount: (state.turnCount || 0) + (hasBonusTurn ? 0 : 1),
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
        settings: action.snapshot.settings || {
          map: 'nusantara',
          startMoney: RULES.STARTING_MONEY,
          speed: 'normal',
          turnSeconds: null,
        },
        turnStartedAt: action.snapshot.turnStartedAt ?? null,
        landResult: null,
        activeCard: null,
        auction: null,
        pendingDebt: null,
        pendingPayments: null,
        pendingTrade: null,
        pendingReroll: null,
        waitingFor: null,
        canRoll: true,
        turnEnded: false,
      };
    }

    case ACTIONS.SYNC_STATE:
      return action.snapshot;

    // ── DISMISS MODAL ─────────────────────────────────────────
    case ACTIONS.DISMISS_MODAL: {
      return { ...state, landResult: null, activeCard: null, waitingFor: null };
    }

    default:
      return state;
  }
};

export const reducer = (state, action) => {
  const nextState = reduceGame(state, action);
  if (nextState === state || nextState.phase !== 'playing') return nextState;
  if (action.type === ACTIONS.START_GAME) {
    return { ...nextState, turnStartedAt: Date.now() };
  }
  if (
    state.phase === 'playing' &&
    action.type !== ACTIONS.SYNC_STATE &&
    action.type !== ACTIONS.LOAD_GAME &&
    (nextState.currentPlayerIndex !== state.currentPlayerIndex || action.type === ACTIONS.END_TURN)
  ) {
    return { ...nextState, turnStartedAt: Date.now() };
  }
  return nextState;
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

export const INITIAL_GAME_STATE = {
    phase: 'setup',
    players: [],
    settings: {
      map: 'nusantara',
      startMoney: RULES.STARTING_MONEY,
      speed: 'normal',
      turnSeconds: null,
    },
    currentPlayerIndex: 0,
    turnCount: 0,
    startedAt: null,
    turnStartedAt: null,
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
    pendingPayments: null,
    pendingReroll: null,
    waitingFor: null,
    canRoll: true,
    pendingTrade: null,
    winner: null,
  };
