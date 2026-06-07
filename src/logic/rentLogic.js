// ============================================================
// rentLogic.js — Kalkulasi sewa semua tipe petak
// ============================================================

import { SQUARES, getKomplexSquares, ownsFullKomplex } from '../constants/squares';

// ─────────────────────────────────────────────────────────────
// MAIN ENTRY
// ─────────────────────────────────────────────────────────────

/**
 * Hitung sewa yang harus dibayar pemain yang mendarat
 * @param {Object} square      — data petak dari SQUARES
 * @param {Object} gameState   — { owners, houses, hotels, players, lastRoll }
 * @param {Object} lander      — pemain yang mendarat (untuk utility dice)
 * @returns {number}           — jumlah sewa
 */
export const calculateRent = (square, gameState, lander) => {
  switch (square.type) {
    case 'property':
      return calcPropertyRent(square, gameState);
    case 'airport':
      return calcAirportRent(square, gameState);
    case 'utility':
      return calcUtilityRent(square, gameState, lander);
    default:
      return 0;
  }
};

// ─────────────────────────────────────────────────────────────
// PROPERTI
// ─────────────────────────────────────────────────────────────

/**
 * Sewa properti biasa (Komplex A–H)
 *
 * Aturan:
 * - 0 rumah, komplex penuh  → 2x sewa dasar
 * - 0 rumah, tidak penuh    → sewa dasar (index 0)
 * - 1–4 rumah               → rent[1–4]
 * - 1 hotel                 → rent[5]
 */
const calcPropertyRent = (square, gameState) => {
  const { owners, houses, hotels } = gameState;
  const ownerId = owners[square.id];
  const houseCount = houses[square.id] || 0;
  const hasHotel = (hotels[square.id] || 0) >= 1;

  if (hasHotel) {
    return square.rent[5]; // hotel
  }

  if (houseCount > 0) {
    return square.rent[houseCount]; // 1–4 rumah
  }

  // Tidak ada rumah — cek monopoli komplex
  const fullKomplex = ownsFullKomplex(square.komplex, ownerId, owners);
  const baseRent = square.rent[0];
  return fullKomplex ? baseRent * 2 : baseRent;
};

// ─────────────────────────────────────────────────────────────
// BANDARA
// ─────────────────────────────────────────────────────────────

/**
 * Sewa bandara berdasarkan jumlah bandara yang dimiliki owner
 *
 * square.rent = [2000, 4000, 8000, 16000]
 *   index 0 = punya 1 bandara
 *   index 1 = punya 2 bandara
 *   ...dst
 */
const calcAirportRent = (square, gameState) => {
  const { owners } = gameState;
  const ownerId = owners[square.id];

  const airportSquares = SQUARES.filter((s) => s.type === 'airport');
  const ownedCount = airportSquares.filter((s) => owners[s.id] === ownerId).length;

  // clamp ke index valid
  const idx = Math.min(ownedCount - 1, square.rent.length - 1);
  return square.rent[Math.max(0, idx)];
};

// ─────────────────────────────────────────────────────────────
// UTILITAS (PLN / PAM)
// ─────────────────────────────────────────────────────────────

/**
 * Sewa utilitas = multiplier × total dadu pemain yang mendarat
 *
 * square.rentMultiplier = [4, 10]
 *   index 0 = punya 1 utilitas  → 4× dadu
 *   index 1 = punya 2 utilitas  → 10× dadu
 */
const calcUtilityRent = (square, gameState, lander) => {
  const { owners, lastRoll } = gameState;
  const ownerId = owners[square.id];
  const diceTotal = lastRoll?.total || 0;

  const utilitySquares = SQUARES.filter((s) => s.type === 'utility');
  const ownedCount = utilitySquares.filter((s) => owners[s.id] === ownerId).length;

  const multiplier = square.rentMultiplier[Math.min(ownedCount - 1, 1)] || 4;
  return diceTotal * multiplier;
};

// ─────────────────────────────────────────────────────────────
// PREVIEW RENT (untuk UI tooltip / modal)
// ─────────────────────────────────────────────────────────────

/**
 * Kembalikan tabel sewa lengkap untuk ditampilkan di modal/tooltip
 * Return array of { label, amount }
 */
export const getRentTable = (square, gameState) => {
  if (square.type === 'property') {
    const { owners } = gameState;
    const ownerId = owners[square.id];
    const fullKomplex = ownerId != null && ownsFullKomplex(square.komplex, ownerId, owners);

    return [
      { label: 'Sewa dasar',           amount: square.rent[0] },
      { label: 'Komplex penuh',         amount: square.rent[0] * 2, highlight: fullKomplex },
      { label: '🏠 1 Rumah',           amount: square.rent[1] },
      { label: '🏠🏠 2 Rumah',         amount: square.rent[2] },
      { label: '🏠🏠🏠 3 Rumah',       amount: square.rent[3] },
      { label: '🏠🏠🏠🏠 4 Rumah',     amount: square.rent[4] },
      { label: '🏨 Hotel',             amount: square.rent[5] },
    ];
  }

  if (square.type === 'airport') {
    return square.rent.map((amount, i) => ({
      label: `${i + 1} Bandara dimiliki`,
      amount,
    }));
  }

  if (square.type === 'utility') {
    return [
      { label: '1 Utilitas dimiliki (×4 dadu)',  amount: '4× dadu' },
      { label: '2 Utilitas dimiliki (×10 dadu)', amount: '10× dadu' },
    ];
  }

  return [];
};

// ─────────────────────────────────────────────────────────────
// BIAYA PERBAIKAN (kartu Dana Umum / Kesempatan)
// ─────────────────────────────────────────────────────────────

/**
 * Hitung total biaya perbaikan properti pemain
 * (dipakai saat kartu repairs ditarik)
 */
export const calcRepairCost = (player, gameState, perHouse, perHotel) => {
  const { houses, hotels, owners } = gameState;

  let totalHouses = 0;
  let totalHotels = 0;

  for (const [squareId, ownerId] of Object.entries(owners)) {
    if (ownerId !== player.id) continue;
    totalHouses += houses[squareId] || 0;
    totalHotels += hotels[squareId] || 0;
  }

  return totalHouses * perHouse + totalHotels * perHotel;
};

// ─────────────────────────────────────────────────────────────
// NET WORTH (untuk ranking / kondisi bangkrut)
// ─────────────────────────────────────────────────────────────

/**
 * Hitung total kekayaan pemain:
 * uang + nilai properti (harga beli) + nilai bangunan
 */
export const calcNetWorth = (player, gameState) => {
  const { owners, houses, hotels } = gameState;
  let worth = player.money;

  for (const square of SQUARES) {
    if (owners[square.id] !== player.id) continue;
    worth += square.price || 0;
    if (square.houseCost) {
      worth += (houses[square.id] || 0) * square.houseCost;
      worth += (hotels[square.id] || 0) * square.hotelCost;
    }
  }

  return worth;
};