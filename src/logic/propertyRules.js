// ============================================================
// propertyRules.js — Aturan beli properti & bangun (fungsi pure)
//
// Satu sumber kebenaran untuk aturan yang dulu hanya ditegakkan di UI
// (ManagePanel) dan AI. Reducer memakainya supaya aksi yang dikirim
// langsung (mis. klien online yang dimodifikasi) tidak bisa melanggarnya.
// ============================================================

import { RULES } from '../constants/config.js';
import { getSquaresForMap, getKomplexSquares, ownsFullKomplex } from '../constants/squares.js';

export const PURCHASABLE_TYPES = ['property', 'airport', 'utility'];

export const isOwned = (owners, squareId) =>
  owners?.[squareId] !== undefined && owners?.[squareId] !== null;

/** Bisa dibeli: petak properti/bandara/utilitas, belum ada pemiliknya, uang cukup. */
export const canBuyProperty = (player, square, gameState) => {
  if (!player || !square) return false;
  if (!PURCHASABLE_TYPES.includes(square.type)) return false;
  if (!Number.isFinite(square.price) || square.price < 0) return false;
  if (isOwned(gameState.owners, square.id)) return false;
  return player.money >= square.price;
};

const komplexInfo = (squareId, gameState) => {
  const squares = getSquaresForMap(gameState.settings?.map);
  const square = squares.find((s) => s.id === squareId);
  const group = square?.komplex ? getKomplexSquares(square.komplex, squares) : [];
  return { square, group };
};

const komplexHasMortgage = (group, player) =>
  group.some((s) => (player.mortgaged || []).includes(s.id));

/**
 * Aturan membangun rumah: set warna penuh, tidak ada yang digadai, bangun
 * merata (hanya di petak dengan rumah paling sedikit), stok tersedia.
 * @param {{ignoreMoney?: boolean, free?: boolean}} options
 */
export const canBuildHouse = (player, squareId, gameState, { ignoreMoney = false, free = false } = {}) => {
  const { owners, houses = {}, hotels = {}, housesLeft } = gameState;
  const { square, group } = komplexInfo(squareId, gameState);
  if (!player || !square || group.length === 0) return false; // hanya properti berwarna
  if (owners[squareId] !== player.id) return false;
  if (!ownsFullKomplex(square.komplex, player.id, owners, getSquaresForMap(gameState.settings?.map))) return false;
  if (komplexHasMortgage(group, player)) return false;
  if ((hotels[squareId] || 0) >= 1) return false;
  const count = houses[squareId] || 0;
  if (count >= 4) return false; // harus beli hotel
  if (count !== Math.min(...group.map((s) => houses[s.id] || 0))) return false; // bangun merata
  if (!(housesLeft > 0)) return false;
  return ignoreMoney || free || player.money >= square.houseCost;
};

/** Aturan membangun hotel: set penuh, semua petak sudah 4 rumah/hotel, stok hotel ada. */
export const canBuildHotel = (player, squareId, gameState, { ignoreMoney = false } = {}) => {
  const { owners, houses = {}, hotels = {}, hotelsLeft } = gameState;
  const { square, group } = komplexInfo(squareId, gameState);
  if (!player || !square || group.length === 0) return false;
  if (owners[squareId] !== player.id) return false;
  if (!ownsFullKomplex(square.komplex, player.id, owners, getSquaresForMap(gameState.settings?.map))) return false;
  if (komplexHasMortgage(group, player)) return false;
  if ((hotels[squareId] || 0) >= 1) return false;
  if ((houses[squareId] || 0) < RULES.MIN_HOUSES_FOR_HOTEL) return false;
  const ready = group.every(
    (s) => (houses[s.id] || 0) >= RULES.MIN_HOUSES_FOR_HOTEL || (hotels[s.id] || 0) >= 1
  );
  if (!ready) return false;
  if (!(hotelsLeft > 0)) return false;
  return ignoreMoney || player.money >= square.hotelCost;
};

/**
 * Aturan menggadaikan: milik pemain, belum digadai, dan tidak ada bangunan
 * di properti mana pun dalam set warna yang sama.
 */
export const canMortgage = (player, squareId, gameState) => {
  const { owners, houses = {}, hotels = {} } = gameState;
  const { square, group } = komplexInfo(squareId, gameState);
  if (!player || !square || owners[squareId] !== player.id) return false;
  if ((player.mortgaged || []).includes(squareId)) return false;
  return !group.some((s) => (houses[s.id] || 0) > 0 || (hotels[s.id] || 0) > 0);
};
