// ============================================================
// aiLogic.js — Strategi AI pemain komputer
//
// Tingkat kesulitan:
//   'easy'   → random, sering melewatkan peluang bagus
//   'medium' → keputusan dasar berdasarkan uang & nilai properti
//   'hard'   → kalkulasi ROI, monopoli, blokir lawan
// ============================================================

import { SQUARES, getKomplexSquares, ownsFullKomplex } from '../constants/squares';
import { RULES } from '../constants/config';
import { calcNetWorth } from './rentLogic';

// ─────────────────────────────────────────────────────────────
// KONSTANTA STRATEGI
// ─────────────────────────────────────────────────────────────

const SAFETY_BUFFER = {
  easy: 5000,
  medium: 20000,
  hard: 35000,
};

const BUY_THRESHOLD = {
  easy: 0.5,    // 50% — sering skip
  medium: 0.75, // 75% chance beli jika mampu
  hard: 1.0,    // selalu beli jika strategis
};

// ─────────────────────────────────────────────────────────────
// KEPUTUSAN BELI PROPERTI
// ─────────────────────────────────────────────────────────────

/**
 * Putuskan apakah AI mau beli properti yang dilanda
 * @returns {boolean}
 */
export const aiDecideBuy = (aiPlayer, square, gameState, difficulty = 'medium') => {
  const { money } = aiPlayer;
  const buffer = SAFETY_BUFFER[difficulty];

  // Tidak mampu
  if (money - square.price < buffer) return false;

  // Easy: random dengan threshold
  if (difficulty === 'easy') {
    return Math.random() < BUY_THRESHOLD.easy;
  }

  // Medium & Hard: evaluasi nilai strategis
  const score = evaluatePurchase(aiPlayer, square, gameState, difficulty);

  if (difficulty === 'medium') return score > 0.4;
  if (difficulty === 'hard')   return score > 0.2; // hard lebih agresif
  return false;
};

/**
 * Skor strategis pembelian (0–1)
 * Faktor: komplex progress, posisi board, harga vs kekayaan
 */
const evaluatePurchase = (player, square, gameState, difficulty) => {
  const { owners } = gameState;
  let score = 0.5; // base

  if (square.type === 'property') {
    const komplexProps = getKomplexSquares(square.komplex);
    const owned = komplexProps.filter((s) => owners[s.id] === player.id).length;
    const total = komplexProps.length;

    // Sudah punya sebagian komplex → sangat berharga
    if (owned === total - 1) score += 0.4; // tinggal 1 lagi = monopoli
    else if (owned > 0)      score += 0.2;

    // Blokir lawan yang hampir monopoli (hard only)
    if (difficulty === 'hard') {
      const enemyAlmostOwns = komplexProps.some((s) => {
        const eid = owners[s.id];
        if (!eid || eid === player.id) return false;
        const enemyOwned = komplexProps.filter((sp) => owners[sp.id] === eid).length;
        return enemyOwned === total - 1;
      });
      if (enemyAlmostOwns) score += 0.35; // blokir lawan
    }

    // Properti mahal relatif terhadap kekayaan → lebih hati-hati
    const netWorth = calcNetWorth(player, gameState);
    if (square.price > netWorth * 0.4) score -= 0.2;
  }

  if (square.type === 'airport') {
    const myAirports = SQUARES.filter(
      (s) => s.type === 'airport' && owners[s.id] === player.id
    ).length;
    score += myAirports * 0.15; // makin banyak bandara makin bagus
  }

  if (square.type === 'utility') {
    const myUtils = SQUARES.filter(
      (s) => s.type === 'utility' && owners[s.id] === player.id
    ).length;
    score += myUtils * 0.25; // dua utilitas = 10× dadu, sangat berharga
  }

  return Math.min(1, Math.max(0, score));
};

// ─────────────────────────────────────────────────────────────
// KEPUTUSAN BANGUN RUMAH / HOTEL
// ─────────────────────────────────────────────────────────────

/**
 * Tentukan properti mana yang harus dibangun rumah/hotel
 * Return array of squareId yang akan dibangun (urutan prioritas)
 */
export const aiDecideBuild = (aiPlayer, gameState, difficulty = 'medium') => {
  const { owners, houses, hotels, housesLeft, hotelsLeft } = gameState;
  const buffer = SAFETY_BUFFER[difficulty];
  let budget = aiPlayer.money - buffer;
  if (budget <= 0) return [];

  // Kumpulkan semua komplex yang sudah dimonopoli
  const monopolies = getMyMonopolies(aiPlayer.id, owners);
  if (monopolies.length === 0) return [];

  const buildQueue = [];

  for (const komplex of monopolies) {
    const props = getKomplexSquares(komplex);

    // Strategi: bangun merata dulu (monopoly rule: even building)
    // Cari properti dengan rumah paling sedikit
    const sorted = [...props].sort(
      (a, b) => (houses[a.id] || 0) - (houses[b.id] || 0)
    );

    for (const sq of sorted) {
      if (hotels[sq.id] >= 1) continue; // sudah hotel
      const houseCount = houses[sq.id] || 0;

      if (houseCount < 4 && housesLeft > 0 && budget >= sq.houseCost) {
        buildQueue.push({ squareId: sq.id, type: 'house', cost: sq.houseCost });
        budget -= sq.houseCost;
      } else if (houseCount === 4 && hotelsLeft > 0 && budget >= sq.hotelCost) {
        buildQueue.push({ squareId: sq.id, type: 'hotel', cost: sq.hotelCost });
        budget -= sq.hotelCost;
      }
    }
  }

  // Hard: prioritaskan komplex dengan sewa tinggi (orange, red, green)
  if (difficulty === 'hard') {
    buildQueue.sort((a, b) => {
      const sqA = SQUARES.find((s) => s.id === a.squareId);
      const sqB = SQUARES.find((s) => s.id === b.squareId);
      return (sqB?.rent?.[5] ?? 0) - (sqA?.rent?.[5] ?? 0);
    });
  }

  return buildQueue;
};

// ─────────────────────────────────────────────────────────────
// GADAI DARURAT
// ─────────────────────────────────────────────────────────────

/**
 * Pilih properti yang akan digadai untuk menutupi hutang
 * Return array squareId yang akan digadai (prioritas: paling murah dulu)
 */
export const aiDecideMortgage = (aiPlayer, amountNeeded, gameState) => {
  const { owners, houses, hotels } = gameState;
  const myProps = SQUARES.filter(
    (s) => owners[s.id] === aiPlayer.id &&
           !(aiPlayer.mortgaged || []).includes(s.id) &&
           (houses[s.id] || 0) === 0 &&
           (hotels[s.id] || 0) === 0
  );

  // Gadai properti murah dulu, simpan yang berharga
  const sorted = [...myProps].sort((a, b) => a.price - b.price);
  const toMortgage = [];
  let collected = 0;

  for (const sq of sorted) {
    if (collected >= amountNeeded) break;
    toMortgage.push(sq.id);
    collected += Math.floor(sq.price * RULES.MORTGAGE_RATE);
  }

  return toMortgage;
};

// ─────────────────────────────────────────────────────────────
// KEPUTUSAN LELANG
// ─────────────────────────────────────────────────────────────

/**
 * Tentukan tawaran lelang AI berikutnya.
 * @returns {number} nominal bid (kelipatan increment) atau 0 untuk PASS
 *
 * AI menetapkan "nilai maksimum" dari harga properti × faktor kesulitan
 * (plus bonus bila mendekati monopoli), dibatasi uang − buffer keamanan.
 */
export const aiDecideBid = (aiPlayer, square, highestBid, gameState, difficulty = 'medium') => {
  const buffer = SAFETY_BUFFER[difficulty];
  const inc = RULES.AUCTION_INCREMENT;

  // Faktor kemauan bayar relatif terhadap harga normal
  const factor = difficulty === 'hard' ? 1.15 : difficulty === 'medium' ? 0.9 : 0.65;

  // Skor strategis menaikkan plafon (mis. melengkapi komplex / blokir lawan)
  const score = evaluatePurchase(aiPlayer, square, gameState, difficulty); // 0..1
  let cap = square.price * factor * (0.7 + 0.6 * score);

  // Jangan lampaui uang aman
  cap = Math.min(cap, aiPlayer.money - buffer);

  const next = highestBid + inc;
  if (next > cap) return 0; // tidak sanggup / tidak berharga → pass

  // Easy kadang berhenti lebih awal
  if (difficulty === 'easy' && Math.random() < 0.25) return 0;

  return next;
};

// ─────────────────────────────────────────────────────────────
// NEGOSIASI / TRADE
// ─────────────────────────────────────────────────────────────

/**
 * Evaluasi apakah AI menerima tawaran trade
 * @param {Object} offer { offeredProps, offeredMoney, requestedProps, requestedMoney }
 * @returns {boolean}
 */
export const aiEvaluateTrade = (aiPlayer, offer, gameState, difficulty = 'medium') => {
  const gainValue  = calcTradeValue(offer.offeredProps, offer.offeredMoney, aiPlayer, gameState);
  const loseValue  = calcTradeValue(offer.requestedProps, offer.requestedMoney, aiPlayer, gameState);

  // Hard: tolak trade yang tidak menguntungkan sedikit pun
  if (difficulty === 'hard')   return gainValue > loseValue * 1.1;
  if (difficulty === 'medium') return gainValue > loseValue * 0.9;
  if (difficulty === 'easy')   return Math.random() > 0.4; // random
  return false;
};

/**
 * Buat tawaran trade ke pemain target (hard AI)
 * Return offer object atau null jika tidak ada yang menarik
 */
export const aiGenerateTrade = (aiPlayer, targetPlayer, gameState, difficulty = 'hard') => {
  if (difficulty !== 'hard') return null;

  const { owners } = gameState;
  const myMonopolies = getMyMonopolies(aiPlayer.id, owners);

  // Cari properti target yang dibutuhkan AI untuk monopoli
  for (const komplex of getPendingMonopolies(aiPlayer.id, owners)) {
    const props = getKomplexSquares(komplex);
    const needed = props.filter((s) => owners[s.id] === targetPlayer.id);

    if (needed.length === 0) continue;

    // Tawarkan uang atau properti senilai ~1.5× nilai properti yang diminta
    const totalNeededValue = needed.reduce((sum, s) => sum + s.price, 0);
    const offerMoney = Math.floor(totalNeededValue * 1.5);

    if (aiPlayer.money - offerMoney < SAFETY_BUFFER.hard) continue;

    return {
      from: aiPlayer.id,
      to: targetPlayer.id,
      offeredProps: [],
      offeredMoney: offerMoney,
      requestedProps: needed.map((s) => s.id),
      requestedMoney: 0,
    };
  }

  return null;
};

// ─────────────────────────────────────────────────────────────
// KEPUTUSAN PENJARA
// ─────────────────────────────────────────────────────────────

/**
 * Putuskan apakah AI mau bayar denda penjara atau tunggu double
 * Hard: tetap di penjara jika sudah punya banyak properti (aman dari sewa)
 */
export const aiDecideJail = (aiPlayer, gameState, difficulty = 'medium') => {
  if (difficulty === 'easy') return Math.random() > 0.5;

  const { owners } = gameState;
  const monopolies = getMyMonopolies(aiPlayer.id, owners);

  if (difficulty === 'hard' && monopolies.length >= 2) {
    // Tetap di penjara — lawan bayar sewa, AI aman
    return false;
  }

  // Bayar jika punya cukup uang
  return aiPlayer.money > SAFETY_BUFFER[difficulty] + RULES.JAIL_FINE;
};

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

/** Daftar komplex yang sudah dimonopoli AI */
const getMyMonopolies = (playerId, owners) => {
  const komplexList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return komplexList.filter((k) => ownsFullKomplex(k, playerId, owners));
};

/** Komplex yang hampir dimonopoli (kurang 1 properti) */
const getPendingMonopolies = (playerId, owners) => {
  const komplexList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return komplexList.filter((k) => {
    const props = getKomplexSquares(k);
    const owned = props.filter((s) => owners[s.id] === playerId).length;
    return owned === props.length - 1;
  });
};

/** Hitung total nilai properti + uang dalam trade */
const calcTradeValue = (propIds, money, player, gameState) => {
  const { owners, houses, hotels } = gameState;
  let value = money || 0;

  for (const id of (propIds || [])) {
    const sq = SQUARES.find((s) => s.id === id);
    if (!sq) continue;
    value += sq.price;
    value += (houses[id] || 0) * (sq.houseCost || 0);
    value += (hotels[id] || 0) * (sq.hotelCost || 0);

    // Bonus jika melengkapi monopoli
    const komplexProps = getKomplexSquares(sq.komplex);
    const owned = komplexProps.filter((s) => owners[s.id] === player.id).length;
    if (owned === komplexProps.length - 1) {
      value += sq.price * 1.5; // bonus monopoli
    }
  }

  return value;
};

// ─────────────────────────────────────────────────────────────
// AUTO-PLAY TURN (dipakai di useAI.js)
// ─────────────────────────────────────────────────────────────

/**
 * Kumpulkan semua keputusan AI dalam satu giliran
 * Return array of actions yang akan dieksekusi useAI
 */
export const buildAITurnActions = (aiPlayer, gameState, difficulty = 'medium') => {
  const actions = [];

  // 1. Keluar penjara?
  if (aiPlayer.inJail) {
    const shouldPay = aiDecideJail(aiPlayer, gameState, difficulty);
    if (shouldPay && aiPlayer.jailFreeCards.chance > 0) {
      actions.push({ type: 'USE_JAIL_FREE_CARD', source: 'chance' });
    } else if (shouldPay && aiPlayer.jailFreeCards.community_chest > 0) {
      actions.push({ type: 'USE_JAIL_FREE_CARD', source: 'community_chest' });
    } else if (shouldPay) {
      actions.push({ type: 'PAY_JAIL_FINE' });
    }
  }

  // 2. Bangun rumah/hotel sebelum roll (opsional)
  const buildQueue = aiDecideBuild(aiPlayer, gameState, difficulty);
  for (const build of buildQueue) {
    actions.push({ type: build.type === 'house' ? 'BUY_HOUSE' : 'BUY_HOTEL', squareId: build.squareId });
  }

  // 3. Roll dadu
  actions.push({ type: 'ROLL_DICE' });

  return actions;
};