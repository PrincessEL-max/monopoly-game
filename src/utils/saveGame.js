// ============================================================
// saveGame.js — Simpan/muat state permainan via localStorage.
//
// Catatan: localStorage berfungsi di aplikasi Vite biasa. (Di dalam
// artifact claude.ai memang diblokir, tapi project ini dijalankan
// sendiri dengan `npm run dev`, jadi aman.)
//
// Yang DISIMPAN hanyalah snapshot inti reducer. Flag transien
// (modal, lelang, dll) sengaja tidak dipulihkan — LOAD_GAME
// membersihkannya agar UI tidak nyangkut.
// ============================================================

const KEY = 'monopoli:savegame:v1';
const SCHEMA = 1;
const SLOT_COUNT = 3;
const slotKey = (slot) => `${KEY}:slot:${slot}`;

/** Apakah localStorage tersedia & bisa ditulis */
const available = () => {
  try {
    const t = '__t__';
    window.localStorage.setItem(t, '1');
    window.localStorage.removeItem(t);
    return true;
  } catch {
    return false;
  }
};

/**
 * Simpan snapshot game. Hanya saat fase 'playing'.
 * @returns {boolean} sukses
 */
const createPayload = (state) => ({
  schema: SCHEMA,
  savedAt: Date.now(),
  snapshot: {
    players: state.players,
    currentPlayerIndex: state.currentPlayerIndex,
    turnCount: state.turnCount ?? 0,
    startedAt: state.startedAt ?? Date.now(),
    turnStartedAt: state.turnStartedAt ?? null,
    settings: state.settings,
    phase: 'playing',
    owners: state.owners,
    houses: state.houses,
    hotels: state.hotels,
    housesLeft: state.housesLeft,
    hotelsLeft: state.hotelsLeft,
    freeParkingPool: state.freeParkingPool,
    chanceDeck: state.chanceDeck,
    communityChestDeck: state.communityChestDeck,
    lastRoll: state.lastRoll,
    log: state.log,
    winner: null,
    // State giliran yang sedang berjalan (sewa/pajak/utang/lelang/kartu yang
    // belum selesai). Tanpa ini, memuat save di tengah giliran menghapus
    // kewajiban pemain dan memberi lemparan dadu baru.
    turnState: {
      waitingFor: state.waitingFor ?? null,
      canRoll: state.canRoll ?? true,
      turnEnded: state.turnEnded ?? false,
      landResult: state.landResult ?? null,
      activeCard: state.activeCard ?? null,
      auction: state.auction ?? null,
      pendingDebt: state.pendingDebt ?? null,
      pendingPayments: state.pendingPayments ?? null,
      pendingTrade: state.pendingTrade ?? null,
      pendingReroll: state.pendingReroll ?? null,
    },
  },
});

const writeSave = (key, state) => {
  if (!available()) return false;
  if (!state || state.phase !== 'playing') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(createPayload(state)));
    return true;
  } catch {
    return false;
  }
};

/** Simpan snapshot inti ke slot manual 1–3. */
export const saveGameToSlot = (state, slot) => {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) return false;
  return writeSave(slotKey(slot), state);
};

/** Autosave untuk fitur Lanjutkan di menu utama. */
export const saveGame = (state) => writeSave(KEY, state);

const readPayload = (key) => {
  if (!available()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.schema !== SCHEMA || !parsed.snapshot?.players?.length) return null;
    return parsed;
  } catch {
    return null;
  }
};

const summarize = (payload) => {
  if (!payload) return null;
  const snapshot = payload.snapshot;
  const mapNames = {
    nusantara: 'Peta Nusantara',
    'nusantara-compact': 'Peta Nusantara Ringkas',
    dunia: 'Peta Dunia',
    kota: 'Peta Kota',
  };
  const map = snapshot.settings?.map || 'nusantara';
  const playerWithMoney = snapshot.players.find((player) => !player.isAI) || snapshot.players[0];
  const turnCount = snapshot.turnCount ?? 0;
  return {
    savedAt: payload.savedAt,
    map,
    mapName: mapNames[map] || map,
    round: Math.floor(turnCount / snapshot.players.length) + 1,
    money: playerWithMoney.money ?? 0,
    players: snapshot.players.length,
  };
};

/** Ringkasan save tersimpan (untuk tombol Lanjutkan), atau null */
export const peekSave = () => {
  return summarize(readPayload(KEY));
};

/** Metadata untuk slot manual 1–3. */
export const peekSaveSlots = () => Array.from({ length: SLOT_COUNT }, (_, index) => {
  const slot = index + 1;
  return { slot, ...summarize(readPayload(slotKey(slot))) };
});

/** Muat snapshot penuh untuk LOAD_GAME, atau null */
export const loadGameFromSlot = (slot) => {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) return null;
  return readPayload(slotKey(slot))?.snapshot ?? null;
};

/** Hapus save dari satu slot manual. */
export const clearSaveSlot = (slot) => {
  if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT || !available()) return false;
  try {
    window.localStorage.removeItem(slotKey(slot));
    return true;
  } catch {
    return false;
  }
};

/** Muat snapshot penuh untuk LOAD_GAME, atau null */
export const loadGame = () => {
  return readPayload(KEY)?.snapshot ?? null;
};

/** Hapus save tersimpan */
export const clearSave = () => {
  if (!available()) return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
};
