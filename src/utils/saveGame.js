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
export const saveGame = (state) => {
  if (!available()) return false;
  if (!state || state.phase !== 'playing') return false;
  try {
    const payload = {
      schema: SCHEMA,
      savedAt: Date.now(),
      // Snapshot inti — decks ikut agar lanjutan konsisten
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
      },
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
};

/** Ringkasan save tersimpan (untuk tombol Lanjutkan), atau null */
export const peekSave = () => {
  if (!available()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.schema !== SCHEMA || !parsed.snapshot?.players?.length) return null;
    const snapshot = parsed.snapshot;
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
      savedAt: parsed.savedAt,
      map,
      mapName: mapNames[map] || map,
      round: Math.floor(turnCount / snapshot.players.length) + 1,
      money: playerWithMoney.money ?? 0,
      players: snapshot.players.length,
    };
  } catch {
    return null;
  }
};

/** Muat snapshot penuh untuk LOAD_GAME, atau null */
export const loadGame = () => {
  if (!available()) return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.schema !== SCHEMA || !parsed.snapshot?.players?.length) return null;
    return parsed.snapshot;
  } catch {
    return null;
  }
};

/** Hapus save tersimpan */
export const clearSave = () => {
  if (!available()) return;
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
};
