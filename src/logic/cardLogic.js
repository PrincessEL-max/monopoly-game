// ============================================================
// cardLogic.js — Terapkan efek kartu Kesempatan & Dana Umum
// Semua fungsi return { statePatch, logMessage }
// ============================================================

// config tidak dibutuhkan langsung — PASS_GO hardcode inline untuk hindari circular
import {
  calcNewPosition, findNearest, positionComesAfter, sendToJail, addLog,
} from './gameLogic.js';
import { calcRepairCost } from './rentLogic.js';
import { RULES } from '../constants/config.js';
import { getSquaresForMap } from '../constants/squares.js';

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY
// ─────────────────────────────────────────────────────────────

/**
 * Terapkan efek kartu ke game state
 * @param {Object} card        — kartu yang ditarik
 * @param {Object} gameState   — full game state
 * @param {number} playerIndex — index pemain yang menarik
 * @returns {Object}           — patch untuk di-merge ke state
 */
export const applyCard = (card, gameState, playerIndex) => {
  const player = gameState.players[playerIndex];

  switch (card.type) {
    case 'collect':
      return applyCollect(card, player, playerIndex, gameState);

    case 'pay':
      return applyPay(card, player, playerIndex, gameState);

    case 'collect_players':
      return applyCollectFromPlayers(card, player, gameState);

    case 'pay_players':
      return applyPayToPlayers(card, player, gameState);

    case 'move_to':
      return applyMoveTo(card, player, playerIndex, gameState);

    case 'move_by':
      return applyMoveBy(card, player, playerIndex, gameState);

    case 'move_nearest':
      return applyMoveNearest(card, player, playerIndex, gameState);

    case 'move_any_unowned':
      return applyMoveAnyUnowned(card, player, playerIndex, gameState);

    case 'jail':
      return applyGoToJail(card, player, playerIndex, gameState);

    case 'jail_free':
      return applyJailFreeCard(card, player, playerIndex, gameState);

    case 'repairs':
      return applyRepairs(card, player, playerIndex, gameState);

    case 'power_up':
      return applyPowerUp(card, player, playerIndex, gameState);

    default:
      return { log: addLog(gameState.log, `${player.name}: kartu tidak dikenal.`) };
  }
};

// ─────────────────────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────────────────────

/** Terima uang dari bank */
const applyCollect = (card, player, idx, state) => {
  const players = updatePlayer(state.players, idx, {
    money: player.money + card.amount,
  });
  return {
    players,
    log: addLog(state.log, `${player.name} menerima Rp ${fmt(card.amount)} dari bank.`),
  };
};

/** Bayar ke bank */
const applyPay = (card, player, idx, state) => {
  if (player.powerUpEffects?.insurance) {
    return {
      players: consumeInsurance(state.players, idx),
      log: addLog(state.log, `${player.name} memakai Asuransi dan membatalkan pembayaran kartu.`),
    };
  }

  const newMoney = player.money - card.amount;
  const players = updatePlayer(state.players, idx, { money: newMoney });
  const bankrupt = newMoney < 0;

  return {
    players,
    ...(bankrupt ? { bankruptPlayer: player.id } : {}),
    freeParkingPool: state.freeParkingPool + card.amount,
    log: addLog(state.log, `${player.name} membayar Rp ${fmt(card.amount)} ke bank.`),
  };
};

/** Kumpulkan uang dari setiap pemain lain */
const applyCollectFromPlayers = (card, player, state) => {
  const activePlayers = state.players.filter((p) => !p.bankrupt && p.id !== player.id);
  const total = card.amount * activePlayers.length;

  return {
    payments: activePlayers.map((payer) => ({
      payerId: payer.id,
      creditorId: player.id,
      amount: card.amount,
    })),
    log: addLog(
      state.log,
      `${player.name} menerima Rp ${fmt(card.amount)} dari setiap pemain (total Rp ${fmt(total)}).`
    ),
  };
};

/** Bayar ke setiap pemain lain */
const applyPayToPlayers = (card, player, state) => {
  const activePlayers = state.players.filter((p) => !p.bankrupt && p.id !== player.id);
  const total = card.amount * activePlayers.length;

  return {
    payments: activePlayers.map((creditor) => ({
      payerId: player.id,
      creditorId: creditor.id,
      amount: card.amount,
    })),
    log: addLog(
      state.log,
      `${player.name} membayar Rp ${fmt(card.amount)} ke setiap pemain (total Rp ${fmt(total)}).`
    ),
  };
};

/** Pindah ke posisi tertentu */
const applyMoveTo = (card, player, idx, state) => {
  const currentPos = player.position;
  const targetPos = card.target;
  const map = state.settings?.map;
  const passedGo = positionComesAfter(currentPos, targetPos, map) && card.collectGo;
  const goBonus = passedGo ? RULES.PASS_GO_REWARD : 0;

  const players = updatePlayer(state.players, idx, {
    position: targetPos,
    money: player.money + goBonus,
  });

  const logMsg = passedGo
    ? `${player.name} pindah ke petak ${targetPos}, melewati MULAI (+Rp ${fmt(goBonus)}).`
    : `${player.name} pindah ke petak ${targetPos}.`;

  return {
    players,
    log: addLog(state.log, logMsg),
    needsLanding: true, // sinyal ke useGameState untuk proses landing ulang
  };
};

/** Maju/mundur N petak */
const applyMoveBy = (card, player, idx, state) => {
  const { newPos, passedGo } = calcNewPosition(player.position, card.steps, state.settings?.map);
  const goBonus = passedGo && card.steps > 0 ? RULES.PASS_GO_REWARD : 0;

  const players = updatePlayer(state.players, idx, {
    position: newPos,
    money: player.money + goBonus,
  });

  const dir = card.steps > 0 ? `maju ${card.steps}` : `mundur ${Math.abs(card.steps)}`;
  return {
    players,
    log: addLog(state.log, `${player.name} ${dir} petak ke posisi ${newPos}.`),
    needsLanding: true,
  };
};

/** Pindah ke bandara/utilitas terdekat */
const applyMoveNearest = (card, player, idx, state) => {
  const map = state.settings?.map;
  const nearestPos = findNearest(player.position, card.nearestType, map);
  const passedGo = positionComesAfter(player.position, nearestPos, map);
  const goBonus = passedGo && card.collectGo ? RULES.PASS_GO_REWARD : 0;

  const players = updatePlayer(state.players, idx, {
    position: nearestPos,
    money: player.money + goBonus,
  });

  const typeLabel = card.nearestType === 'airport' ? 'Bandara' : 'Utilitas';
  return {
    players,
    log: addLog(state.log, `${player.name} pindah ke ${typeLabel} terdekat (petak ${nearestPos}).`),
    needsLanding: true,
    nearestRentMultiplier: card.rentMultiplier, // 2× untuk bandara, 10× untuk utilitas
  };
};

/** Pindah ke properti milik bank yang dipilih secara acak. */
const applyMoveAnyUnowned = (card, player, idx, state) => {
  const map = state.settings?.map;
  const available = getSquaresForMap(map).filter((square) =>
    square.type === 'property' && state.owners[square.id] == null
  );
  if (!available.length) {
    return {
      log: addLog(state.log, `${player.name} tidak menemukan properti kosong untuk dituju.`),
    };
  }

  const square = available[Math.floor(Math.random() * available.length)];
  const passedGo = positionComesAfter(player.position, square.id, map) && card.collectGo;
  const bonus = passedGo ? RULES.PASS_GO_REWARD : 0;
  return {
    players: updatePlayer(state.players, idx, {
      position: square.id,
      money: player.money + bonus,
    }),
    log: addLog(
      state.log,
      `${player.name} pindah ke ${square.name}${bonus ? ` dan menerima Rp ${fmt(bonus)} karena melewati MULAI` : ''}.`
    ),
    needsLanding: true,
  };
};

/** Masuk penjara */
const applyGoToJail = (card, player, idx, state) => {
  const jailed = sendToJail(player);
  const players = [...state.players];
  players[idx] = jailed;

  return {
    players,
    log: addLog(state.log, `${player.name} masuk Penjara!`),
  };
};

/** Dapat kartu bebas penjara — simpan di inventory pemain */
const applyJailFreeCard = (card, player, idx, state) => {
  const source = card.type === 'chance' || card.id?.startsWith('c') || card.id?.startsWith('kes_')
    ? 'chance'
    : 'community_chest';
  const players = updatePlayer(state.players, idx, {
    jailFreeCards: {
      ...player.jailFreeCards,
      [source]: (player.jailFreeCards[source] || 0) + 1,
    },
  });

  return {
    players,
    log: addLog(state.log, `${player.name} mendapat Kartu Bebas Penjara!`),
  };
};

/** Biaya perbaikan properti */
const applyRepairs = (card, player, idx, state) => {
  const cost = calcRepairCost(player, state, card.perHouse, card.perHotel);
  if (player.powerUpEffects?.insurance) {
    return {
      players: consumeInsurance(state.players, idx),
      log: addLog(state.log, `${player.name} memakai Asuransi dan membatalkan biaya perbaikan.`),
    };
  }

  const newMoney = player.money - cost;
  const players = updatePlayer(state.players, idx, { money: newMoney });
  const bankrupt = newMoney < 0;

  return {
    players,
    ...(bankrupt ? { bankruptPlayer: player.id } : {}),
    freeParkingPool: state.freeParkingPool + cost,
    log: addLog(
      state.log,
      `${player.name} membayar biaya perbaikan Rp ${fmt(cost)} (Rp ${fmt(card.perHouse)}/rumah, Rp ${fmt(card.perHotel)}/hotel).`
    ),
  };
};

const applyPowerUp = (card, player, idx, state) => ({
  players: updatePlayer(state.players, idx, {
    powerUps: [...(player.powerUps || []), card],
  }),
  log: addLog(state.log, `${player.name} menyimpan Power Up: ${card.name || card.action}.`),
});

const consumeInsurance = (players, idx) => {
  const player = players[idx];
  return updatePlayer(players, idx, {
    powerUpEffects: { ...(player.powerUpEffects || {}), insurance: false },
  });
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Immutable update satu pemain dalam array */
const updatePlayer = (players, idx, patch) =>
  players.map((p, i) => (i === idx ? { ...p, ...patch } : p));

/** Format angka dengan titik ribuan */
const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';

// ─────────────────────────────────────────────────────────────
// DRAW CARD HELPER
// ─────────────────────────────────────────────────────────────

/**
 * Ambil kartu teratas dari deck, return { card, newDeck }
 * Jika deck kosong, shuffle ulang dari source
 */
export const drawFromDeck = (deck, sourceCards) => {
  if (!deck || deck.length === 0) {
    const reshuffled = [...sourceCards].sort(() => Math.random() - 0.5);
    return { card: reshuffled[0], newDeck: reshuffled.slice(1) };
  }
  const [card, ...newDeck] = deck;
  return { card, newDeck };
};