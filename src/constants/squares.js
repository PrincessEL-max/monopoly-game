// ============================================================
// squares.js — Data 40 petak Monopoli International
// Urutan: pos 0 = START (sudut kanan bawah), searah jarum jam
// ============================================================

export const KOMPLEX_COLORS = {
  A: '#8b5a2b',
  B: '#7ec8f2',
  C: '#d63fa0',
  D: '#f08a1c',
  E: '#e03a3a',
  F: '#f2d83a',
  G: '#2fa84f',
  H: '#2563eb',
};

export const SQUARES = [
  // ─────────────────────────────────────────
  // SUDUT & SISI BAWAH (pos 0–9)
  // ─────────────────────────────────────────
  {
    id: 0,
    name: 'MULAI',
    type: 'corner',
    subtype: 'go',
    passReward: 20000,
  },
  {
    id: 1,
    name: 'Indonesia',
    type: 'property',
    komplex: 'A',
    price: 6000,
    houseCost: 5000,
    hotelCost: 25000,
    rent: [200, 1000, 3000, 9000, 16000, 25000],
    mortgage: 3000,
    image: 'Indonesia',
  },
  {
    id: 2,
    name: 'Dana Umum',
    type: 'community_chest',
    image: 'card_chest_back',
  },
  {
    id: 3,
    name: 'Malaysia',
    type: 'property',
    komplex: 'A',
    price: 6000,
    houseCost: 5000,
    hotelCost: 25000,
    rent: [400, 2000, 6000, 18000, 32000, 45000],
    mortgage: 3000,
    image: 'Malaysia',
  },
  {
    id: 4,
    name: 'Pajak Penghasilan',
    type: 'tax',
    amount: 20000,
    image: 'Pajak_jalan',
  },
  {
    id: 5,
    name: 'Bandara Changi',
    type: 'airport',
    price: 20000,
    rent: [2500, 5000, 10000, 20000], // 1, 2, 3, 4 bandara dimiliki
    mortgage: 10000,
    image: 'soetta_airport',
  },
  {
    id: 6,
    name: 'Singapura',
    type: 'property',
    komplex: 'B',
    price: 10000,
    houseCost: 5000,
    hotelCost: 25000,
    rent: [600, 3000, 9000, 27000, 40000, 55000],
    mortgage: 5000,
    image: 'Singapura',
  },
  {
    id: 7,
    name: 'Kesempatan',
    type: 'chance',
    image: 'card_chance_back',
  },
  {
    id: 8,
    name: 'Hongkong',
    type: 'property',
    komplex: 'B',
    price: 10000,
    houseCost: 5000,
    hotelCost: 25000,
    rent: [600, 3000, 9000, 27000, 40000, 55000],
    mortgage: 5000,
    image: 'Hongkong',
  },
  {
    id: 9,
    name: 'Taiwan',
    type: 'property',
    komplex: 'B',
    price: 12000,
    houseCost: 5000,
    hotelCost: 25000,
    rent: [800, 4000, 10000, 30000, 45000, 60000],
    mortgage: 6000,
    image: 'Taiwan',
  },

  // ─────────────────────────────────────────
  // SUDUT PENJARA (pos 10)
  // ─────────────────────────────────────────
  {
    id: 10,
    name: 'Penjara',
    type: 'corner',
    subtype: 'jail',
  },

  // ─────────────────────────────────────────
  // SISI KIRI (pos 11–19)
  // ─────────────────────────────────────────
  {
    id: 11,
    name: 'Filipina',
    type: 'property',
    komplex: 'C',
    price: 14000,
    houseCost: 10000,
    hotelCost: 50000,
    rent: [1000, 5000, 15000, 45000, 62500, 75000],
    mortgage: 7000,
    image: 'Philipina',
  },
  {
    id: 12,
    name: 'Perusahaan Listrik',
    type: 'utility',
    price: 15000,
    // Sewa = 4x dadu (1 utilitas) atau 10x dadu (2 utilitas)
    rentMultiplier: [400, 1000],
    mortgage: 7500,
    image: 'pln',
  },
  {
    id: 13,
    name: 'Thailand',
    type: 'property',
    komplex: 'C',
    price: 14000,
    houseCost: 10000,
    hotelCost: 50000,
    rent: [1000, 5000, 15000, 45000, 62500, 75000],
    mortgage: 7000,
    image: 'Thailand',
  },
  {
    id: 14,
    name: 'Vietnam',
    type: 'property',
    komplex: 'C',
    price: 16000,
    houseCost: 10000,
    hotelCost: 50000,
    rent: [1200, 6000, 18000, 50000, 70000, 90000],
    mortgage: 8000,
    image: 'Vietnam',
  },
  {
    id: 15,
    name: 'Terminal Bis Tokyo',
    type: 'airport',
    price: 20000,
    rent: [2500, 5000, 10000, 20000],
    mortgage: 10000,
    image: 'tokyo_bus_terminal',
  },
  {
    id: 16,
    name: 'Jepang',
    type: 'property',
    komplex: 'D',
    price: 18000,
    houseCost: 10000,
    hotelCost: 50000,
    rent: [1400, 7000, 20000, 55000, 75000, 95000],
    mortgage: 9000,
    image: 'Jepang',
  },
  {
    id: 17,
    name: 'Dana Umum',
    type: 'community_chest',
    image: 'card_chest_back',
  },
  {
    id: 18,
    name: 'Korea',
    type: 'property',
    komplex: 'D',
    price: 18000,
    houseCost: 10000,
    hotelCost: 50000,
    rent: [1400, 7000, 20000, 55000, 75000, 95000],
    mortgage: 9000,
    image: 'Korea',
  },
  {
    id: 19,
    name: 'India',
    type: 'property',
    komplex: 'D',
    price: 20000,
    houseCost: 10000,
    hotelCost: 50000,
    rent: [1600, 8000, 22000, 60000, 80000, 100000],
    mortgage: 10000,
    image: 'India',
  },

  // ─────────────────────────────────────────
  // SUDUT PARKIR GRATIS (pos 20)
  // ─────────────────────────────────────────
  {
    id: 20,
    name: 'Parkir Gratis',
    type: 'corner',
    subtype: 'free_parking',
  },

  // ─────────────────────────────────────────
  // SISI ATAS (pos 21–29)
  // ─────────────────────────────────────────
  {
    id: 21,
    name: 'RRC (China)',
    type: 'property',
    komplex: 'E',
    price: 22000,
    houseCost: 15000,
    hotelCost: 75000,
    rent: [1800, 9000, 25000, 70000, 87500, 105000],
    mortgage: 11000,
    image: 'China',
  },
  {
    id: 22,
    name: 'Kesempatan',
    type: 'chance',
    image: 'card_chance_back',
  },
  {
    id: 23,
    name: 'Uni Soviet',
    type: 'property',
    komplex: 'E',
    price: 22000,
    houseCost: 15000,
    hotelCost: 75000,
    rent: [1800, 9000, 25000, 70000, 87500, 105000],
    mortgage: 11000,
    image: 'Uni_Soviet',
  },
  {
    id: 24,
    name: 'Italia',
    type: 'property',
    komplex: 'E',
    price: 24000,
    houseCost: 15000,
    hotelCost: 75000,
    rent: [2000, 10000, 30000, 75000, 92500, 110000],
    mortgage: 12000,
    image: 'Italia',
  },
  {
    id: 25,
    name: 'Stasiun London',
    type: 'airport',
    price: 20000,
    rent: [2500, 5000, 10000, 20000],
    mortgage: 10000,
    image: 'london_station',
  },
  {
    id: 26,
    name: 'Inggris',
    type: 'property',
    komplex: 'F',
    price: 26000,
    houseCost: 15000,
    hotelCost: 75000,
    rent: [2200, 11000, 33000, 80000, 97500, 115000],
    mortgage: 13000,
    image: 'London',
  },
  {
    id: 27,
    name: 'Perancis',
    type: 'property',
    komplex: 'F',
    price: 26000,
    houseCost: 15000,
    hotelCost: 75000,
    rent: [2200, 11000, 33000, 80000, 97500, 115000],
    mortgage: 13000,
    image: 'Perancis',
  },
  {
    id: 28,
    name: 'Perusahaan Air',
    type: 'utility',
    price: 15000,
    rentMultiplier: [400, 1000],
    mortgage: 7500,
    image: 'pam',
  },
  {
    id: 29,
    name: 'Belanda',
    type: 'property',
    komplex: 'F',
    price: 28000,
    houseCost: 15000,
    hotelCost: 75000,
    rent: [2400, 12000, 36000, 85000, 102500, 120000],
    mortgage: 14000,
    image: 'Belanda',
  },

  // ─────────────────────────────────────────
  // SUDUT MASUK PENJARA (pos 30)
  // ─────────────────────────────────────────
  {
    id: 30,
    name: 'Masuk Penjara',
    type: 'corner',
    subtype: 'go_to_jail',
  },

  // ─────────────────────────────────────────
  // SISI KANAN (pos 31–39)
  // ─────────────────────────────────────────
  {
    id: 31,
    name: 'Kanada',
    type: 'property',
    komplex: 'G',
    price: 30000,
    houseCost: 20000,
    hotelCost: 100000,
    rent: [2600, 13000, 39000, 90000, 110000, 127500],
    mortgage: 15000,
    image: 'rio_de_janeiro',
  },
  {
    id: 32,
    name: 'Amerika Serikat',
    type: 'property',
    komplex: 'G',
    price: 30000,
    houseCost: 20000,
    hotelCost: 100000,
    rent: [2600, 13000, 39000, 90000, 110000, 127500],
    mortgage: 15000,
    image: 'Amerika Serikat',
  },
  {
    id: 33,
    name: 'Dana Umum',
    type: 'community_chest',
    image: 'card_chest_back',
  },
  {
    id: 34,
    name: 'Brazilia',
    type: 'property',
    komplex: 'G',
    price: 32000,
    houseCost: 20000,
    hotelCost: 100000,
    rent: [2800, 15000, 45000, 100000, 120000, 140000],
    mortgage: 16000,
    image: 'Brazilia',
  },
  {
    id: 35,
    name: 'Pelabuhan Sydney',
    type: 'airport',
    price: 20000,
    rent: [2500, 5000, 10000, 20000],
    mortgage: 10000,
    image: 'sydney_port',
  },
  {
    id: 36,
    name: 'Kesempatan',
    type: 'chance',
    image: 'card_chance_back',
  },
  {
    id: 37,
    name: 'Australia',
    type: 'property',
    komplex: 'H',
    price: 35000,
    houseCost: 20000,
    hotelCost: 100000,
    rent: [3500, 17500, 50000, 110000, 130000, 150000],
    mortgage: 17500,
    image: 'Australia',
  },
  {
    id: 38,
    name: 'Pajak Barang Mewah',
    type: 'tax',
    amount: 10000,
    image: 'Pajak_istimewa',
  },
  {
    id: 39,
    name: 'Afrika',
    type: 'property',
    komplex: 'H',
    price: 40000,
    houseCost: 20000,
    hotelCost: 100000,
    rent: [5000, 20000, 60000, 140000, 170000, 200000],
    mortgage: 20000,
    image: 'afrika',
  },
];

export const COMPACT_MAP_ID = 'nusantara-compact';
export const COMPACT_MAP_REMOVED_IDS = [14, 17, 36, 38];
export const COMPACT_SQUARES = SQUARES.filter(
  (square) => !COMPACT_MAP_REMOVED_IDS.includes(square.id)
);

export const getSquaresForMap = (map = 'nusantara') =>
  map === COMPACT_MAP_ID ? COMPACT_SQUARES : SQUARES;

// Helper: ambil semua properti dalam 1 komplex
export const getKomplexSquares = (komplex, squares = SQUARES) =>
  squares.filter((s) => s.komplex === komplex);

// Helper: cek apakah pemain kuasai seluruh komplex
export const ownsFullKomplex = (komplex, ownerId, owners, squares = SQUARES) => {
  const props = getKomplexSquares(komplex, squares);
  return props.every((s) => owners[s.id] === ownerId);
};