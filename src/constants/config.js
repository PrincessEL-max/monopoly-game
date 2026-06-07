// ============================================================
// config.js — Konfigurasi board, warna, harga, aturan game
// ============================================================

// ─── UKURAN BOARD ────────────────────────────────────────────
export const BOARD = {
  SIZE: 760,           // px — total lebar/tinggi board (kotak)
  CORNER_SIZE: 100,    // px — lebar & tinggi petak sudut
  SQUARE_WIDTH: 66,    // px — lebar petak biasa  (9 petak × 66 + 2×100 = 794... disesuaikan)
  SQUARE_HEIGHT: 100,  // px — tinggi petak biasa
  CENTER_SIZE: 560,    // px — area tengah (globe + logo)
  SQUARES_PER_SIDE: 9, // petak non-sudut per sisi
};

// ─── WARNA TEMA BOARD ────────────────────────────────────────
export const COLORS = {
  // Komplex colors (strip atas tiap petak)
  KOMPLEX_A: '#4B0082',  // ungu tua
  KOMPLEX_B: '#00BFFF',  // biru muda (deepskyblue)
  KOMPLEX_C: '#FF69B4',  // pink
  KOMPLEX_D: '#FF8C00',  // oranye
  KOMPLEX_E: '#DC143C',  // merah
  KOMPLEX_F: '#FFD700',  // kuning
  KOMPLEX_G: '#228B22',  // hijau
  KOMPLEX_H: '#00008B',  // navy biru

  // UI umum
  BOARD_BG: '#1a2a5e',       // background board navy biru
  BOARD_BORDER: '#c0a060',   // border emas board
  BOARD_BORDER_INNER: '#FFD700',
  SQUARE_BG: '#f5f0e8',      // background petak normal
  SQUARE_BORDER: '#999',

  CORNER_GO_BG: '#e8f5e9',
  CORNER_JAIL_BG: '#fff9c4',
  CORNER_PARKING_BG: '#e3f2fd',
  CORNER_GOTOJAIL_BG: '#ffebee',

  AIRPORT_BG: '#e8eaf6',
  UTILITY_BG: '#e0f7fa',
  CHANCE_BG: '#fff3e0',
  CHEST_BG: '#fce4ec',
  TAX_BG: '#ede7f6',

  // Player colors
  PLAYER_1: '#e53935',
  PLAYER_2: '#1e88e5',
  PLAYER_3: '#43a047',
  PLAYER_4: '#fdd835',
  PLAYER_5: '#8e24aa',
  PLAYER_6: '#f4511e',

  // UI panels
  PANEL_BG: '#0d1b4b',
  PANEL_BORDER: '#2a4090',
  TEXT_PRIMARY: '#ffffff',
  TEXT_SECONDARY: '#aab4d4',
  BUTTON_PRIMARY: '#2563eb',
  BUTTON_DANGER: '#dc2626',
  BUTTON_SUCCESS: '#16a34a',
};

// ─── ATURAN GAME ─────────────────────────────────────────────
export const RULES = {
  STARTING_MONEY: 200000,     // uang awal tiap pemain
  PASS_GO_REWARD: 25000,      // bonus lewat START
  JAIL_FINE: 10000,           // denda bebas penjara
  JAIL_TURNS_MAX: 3,          // maks giliran di penjara sebelum harus bayar
  DOUBLES_JAIL_COUNT: 3,      // double 3x berturut → masuk penjara
  AUCTION_MIN_BID: 1,         // bid minimal lelang
  AUCTION_INCREMENT: 1000,    // kelipatan kenaikan tawaran lelang
  MORTGAGE_RATE: 0.5,         // gadai = 50% harga beli
  UNMORTGAGE_RATE: 0.55,      // tebus gadai = 55% harga beli
  SELL_REFUND_RATE: 0.5,      // jual rumah/hotel = 50% harga bangun
  MAX_HOUSES: 32,             // stok rumah global
  MAX_HOTELS: 12,             // stok hotel global
  MIN_HOUSES_FOR_HOTEL: 4,    // rumah diperlukan sebelum beli hotel
  FREE_PARKING_COLLECT: true, // uang pajak/denda masuk ke Parkir Gratis
  BANKRUPTCY_THRESHOLD: 0,    // pemain bangkrut jika uang < 0
};

// ─── DENOMINASI UANG ─────────────────────────────────────────
// Nilai uang yang ada di game (untuk tampilan)
export const MONEY_DENOMINATIONS = [500, 1000, 5000, 10000, 25000, 50000, 100000];

// ─── PLAYER CONFIG ───────────────────────────────────────────
export const PLAYER_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 6,
  PIECE_ICONS: ['🚀', '🚗', '⚓', '🎩', '🐶', '💎'],
  DEFAULT_NAMES: ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4', 'Pemain 5', 'Pemain 6'],
};

// ─── POSISI BANDARA (untuk move_nearest) ─────────────────────
export const AIRPORT_POSITIONS = [5, 15, 25, 35];

// ─── POSISI UTILITAS ─────────────────────────────────────────
export const UTILITY_POSITIONS = [12, 28];

// ─── POSISI KHUSUS ───────────────────────────────────────────
export const SPECIAL_POSITIONS = {
  GO: 0,
  JAIL: 10,
  FREE_PARKING: 20,
  GO_TO_JAIL: 30,
};

// ─── ANIMASI ─────────────────────────────────────────────────
export const ANIMATION = {
  DICE_ROLL_DURATION: 600,   // ms
  PIECE_MOVE_DURATION: 200,  // ms per petak
  MODAL_FADE_DURATION: 250,  // ms
};