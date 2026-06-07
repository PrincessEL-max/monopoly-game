// ============================================================
// cardLogic.js — Terapkan efek kartu Kesempatan & Dana Umum
// Semua fungsi return { statePatch, logMessage }
// ============================================================

// config tidak dibutuhkan langsung — PASS_GO hardcode inline untuk hindari circular
import { calcNewPosition, findNearest, sendToJail, addLog } from './gameLogic';
import { calcRepairCost } from './rentLogic';

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
      return applyCollectFromPlayers(card, player, playerIndex, gameState);

    case 'pay_players':
      return applyPayToPlayers(card, player, playerIndex, gameState);

    case 'move_to':
      return applyMoveTo(card, player, playerIndex, gameState);

    case 'move_by':
      return applyMoveBy(card, player, playerIndex, gameState);

    case 'move_nearest':
      return applyMoveNearest(card, player, playerIndex, gameState);

    case 'jail':
      return applyGoToJail(card, player, playerIndex, gameState);

    case 'jail_free':
      return applyJailFreeCard(card, player, playerIndex, gameState);

    case 'repairs':
      return applyRepairs(card, player, playerIndex, gameState);

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
    log: addLog(state.log, `${player.name} menerima $${fmt(card.amount)} dari bank.`),
  };
};

/** Bayar ke bank */
const applyPay = (card, player, idx, state) => {
  const newMoney = player.money - card.amount;
  const players = updatePlayer(state.players, idx, { money: newMoney });
  const bankrupt = newMoney < 0;

  return {
    players,
    ...(bankrupt ? { bankruptPlayer: player.id } : {}),
    freeParkingPool: state.freeParkingPool + card.amount,
    log: addLog(state.log, `${player.name} membayar $${fmt(card.amount)} ke bank.`),
  };
};

/** Kumpulkan uang dari setiap pemain lain */
const applyCollectFromPlayers = (card, player, idx, state) => {
  const activePlayers = state.players.filter((p) => !p.bankrupt && p.id !== player.id);
  const total = card.amount * activePlayers.length;

  const players = state.players.map((p) => {
    if (p.id === player.id) return { ...p, money: p.money + total };
    if (p.bankrupt) return p;
    return { ...p, money: p.money - card.amount };
  });

  return {
    players,
    log: addLog(
      state.log,
      `${player.name} menerima $${fmt(card.amount)} dari setiap pemain (total $${fmt(total)}).`
    ),
  };
};

/** Bayar ke setiap pemain lain */
const applyPayToPlayers = (card, player, idx, state) => {
  const activePlayers = state.players.filter((p) => !p.bankrupt && p.id !== player.id);
  const total = card.amount * activePlayers.length;

  const players = state.players.map((p) => {
    if (p.id === player.id) return { ...p, money: p.money - total };
    if (p.bankrupt) return p;
    return { ...p, money: p.money + card.amount };
  });

  const bankrupt = player.money - total < 0;
  return {
    players,
    ...(bankrupt ? { bankruptPlayer: player.id } : {}),
    log: addLog(
      state.log,
      `${player.name} membayar $${fmt(card.amount)} ke setiap pemain (total $${fmt(total)}).`
    ),
  };
};

/** Pindah ke posisi tertentu */
const applyMoveTo = (card, player, idx, state) => {
  const currentPos = player.position;
  const targetPos = card.target;
  const passedGo = targetPos < currentPos && card.collectGo;

  // Import RULES.PASS_GO_REWARD secara inline untuk menghindari circular
  const PASS_GO = 25000;
  const goBonus = passedGo ? PASS_GO : 0;

  const players = updatePlayer(state.players, idx, {
    position: targetPos,
    money: player.money + goBonus,
  });

  const logMsg = passedGo
    ? `${player.name} pindah ke petak ${targetPos}, melewati START (+$${fmt(PASS_GO)}).`
    : `${player.name} pindah ke petak ${targetPos}.`;

  return {
    players,
    log: addLog(state.log, logMsg),
    needsLanding: true, // sinyal ke useGameState untuk proses landing ulang
  };
};

/** Maju/mundur N petak */
const applyMoveBy = (card, player, idx, state) => {
  const PASS_GO = 25000;
  const { newPos, passedGo } = calcNewPosition(player.position, card.steps);
  const goBonus = passedGo && card.steps > 0 ? PASS_GO : 0;

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
  const PASS_GO = 25000;
  const nearestPos = findNearest(player.position, card.nearestType);
  const passedGo = nearestPos < player.position;
  const goBonus = passedGo ? PASS_GO : 0;

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
  const source = card.id.startsWith('c') ? 'chance' : 'community_chest';
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
  const newMoney = player.money - cost;
  const players = updatePlayer(state.players, idx, { money: newMoney });
  const bankrupt = newMoney < 0;

  return {
    players,
    ...(bankrupt ? { bankruptPlayer: player.id } : {}),
    freeParkingPool: state.freeParkingPool + cost,
    log: addLog(
      state.log,
      `${player.name} membayar biaya perbaikan $${fmt(cost)} ($${fmt(card.perHouse)}/rumah, $${fmt(card.perHotel)}/hotel).`
    ),
  };
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