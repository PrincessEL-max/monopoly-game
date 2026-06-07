// ============================================================
// squares.js — Data 40 petak Monopoli International
// Urutan: pos 0 = START (sudut kanan bawah), searah jarum jam
// ============================================================

export const KOMPLEX_COLORS = {
  A: '#4B0082', // ungu tua
  B: '#00BFFF', // biru muda
  C: '#FF69B4', // pink
  D: '#FF8C00', // oranye
  E: '#DC143C', // merah
  F: '#FFD700', // kuning
  G: '#228B22', // hijau
  H: '#00008B', // navy biru
};

export const SQUARES = [
  // ─────────────────────────────────────────
  // SUDUT & SISI BAWAH (pos 0–9)
  // ─────────────────────────────────────────
  {
    id: 0,
    name: 'Start',
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
    houseCost: 2000,
    hotelCost: 2000,
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
    houseCost: 2000,
    hotelCost: 2000,
    rent: [600, 2000, 6000, 18000, 32000, 45000],
    mortgage: 4000,
    image: 'Malaysia',
  },
  {
    id: 4,
    name: 'Pajak Penghasilan',
    type: 'tax',
    amount: 20000,
  },
  {
    id: 5,
    name: 'Cang Airport',
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
    houseCost: 3000,
    hotelCost: 3000,
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
    houseCost: 3000,
    hotelCost: 3000,
    rent: [800, 4000, 10000, 30000, 45000, 60000],
    mortgage: 5000,
    image: 'Hongkong',
  },
  {
    id: 9,
    name: 'Taiwan',
    type: 'property',
    komplex: 'B',
    price: 12000,
    houseCost: 3000,
    hotelCost: 3000,
    rent: [1000, 5000, 15000, 45000, 62500, 75000],
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
    name: 'Philipina',
    type: 'property',
    komplex: 'C',
    price: 14000,
    houseCost: 4000,
    hotelCost: 4000,
    rent: [1200, 6000, 18000, 50000, 70000, 90000],
    mortgage: 7000,
    image: 'Philipina',
  },
  {
    id: 12,
    name: 'Perusahaan Listrik',
    type: 'utility',
    price: 15000,
    // Sewa = 4x dadu (1 utilitas) atau 10x dadu (2 utilitas)
    rentMultiplier: [4, 10],
    mortgage: 7500,
    image: 'pln',
  },
  {
    id: 13,
    name: 'Thailand',
    type: 'property',
    komplex: 'C',
    price: 14000,
    houseCost: 4000,
    hotelCost: 4000,
    rent: [1400, 7000, 20000, 55000, 75000, 100000],
    mortgage: 7000,
    image: 'Thailand',
  },
  {
    id: 14,
    name: 'Taiwan',
    type: 'property',
    komplex: 'C',
    price: 16000,
    houseCost: 4000,
    hotelCost: 4000,
    rent: [1600, 8000, 22000, 60000, 80000, 110000],
    mortgage: 8000,
    image: 'Taiwan',
  },
  {
    id: 15,
    name: 'Stasiun London',
    type: 'airport',
    price: 20000,
    rent: [2500, 5000, 10000, 20000],
    mortgage: 10000,
    image: 'changi_airport',
  },
  {
    id: 16,
    name: 'Jepang',
    type: 'property',
    komplex: 'D',
    price: 18000,
    houseCost: 5000,
    hotelCost: 5000,
    rent: [1800, 9000, 25000, 70000, 87500, 112500],
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
    houseCost: 5000,
    hotelCost: 5000,
    rent: [2000, 10000, 28000, 75000, 92500, 120000],
    mortgage: 9000,
    image: 'Korea',
  },
  {
    id: 19,
    name: 'India',
    type: 'property',
    komplex: 'D',
    price: 20000,
    houseCost: 5000,
    hotelCost: 5000,
    rent: [2200, 11000, 33000, 80000, 97500, 125000],
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
    name: 'China',
    type: 'property',
    komplex: 'E',
    price: 22000,
    houseCost: 6000,
    hotelCost: 6000,
    rent: [2400, 12000, 36000, 90000, 125000, 150000],
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
    houseCost: 6000,
    hotelCost: 6000,
    rent: [2600, 13000, 39000, 90000, 127500, 150000],
    mortgage: 11000,
    image: 'Uni_Soviet',
  },
  {
    id: 24,
    name: 'Italia',
    type: 'property',
    komplex: 'E',
    price: 24000,
    houseCost: 6000,
    hotelCost: 6000,
    rent: [2800, 14000, 40000, 100000, 130000, 160000],
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
    image: 'heathrow_airport',
  },
  {
    id: 26,
    name: 'Inggris',
    type: 'property',
    komplex: 'F',
    price: 26000,
    houseCost: 7000,
    hotelCost: 7000,
    rent: [3000, 15000, 45000, 110000, 137500, 175000],
    mortgage: 13000,
    image: 'London',
  },
  {
    id: 27,
    name: 'Prancis',
    type: 'property',
    komplex: 'F',
    price: 26000,
    houseCost: 7000,
    hotelCost: 7000,
    rent: [3200, 16000, 48000, 115000, 142500, 180000],
    mortgage: 13000,
    image: 'amsterdam',
  },
  {
    id: 28,
    name: 'Perusahaan Air',
    type: 'utility',
    price: 15000,
    rentMultiplier: [4, 10],
    mortgage: 7500,
    image: 'pam',
  },
  {
    id: 29,
    name: 'Belanda',
    type: 'property',
    komplex: 'F',
    price: 26000,
    houseCost: 7000,
    hotelCost: 7000,
    rent: [3500, 17500, 50000, 120000, 147500, 185000],
    mortgage: 13000,
    image: 'berlin',
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
    name: 'Canada',
    type: 'property',
    komplex: 'G',
    price: 30000,
    houseCost: 8000,
    hotelCost: 8000,
    rent: [3500, 17500, 52500, 130000, 155000, 200000],
    mortgage: 15000,
    image: 'rio_de_janeiro',
  },
  {
    id: 32,
    name: 'Amerika Serikat',
    type: 'property',
    komplex: 'G',
    price: 30000,
    houseCost: 8000,
    hotelCost: 8000,
    rent: [3500, 17500, 52500, 130000, 157500, 205000],
    mortgage: 15000,
    image: 'los_angeles',
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
    subtitle: 'Amerika Serikat',
    type: 'property',
    komplex: 'G',
    price: 32000,
    houseCost: 8000,
    hotelCost: 8000,
    rent: [3500, 17500, 52500, 130000, 160000, 210000],
    mortgage: 16000,
    image: 'new_york',
  },
  {
    id: 35,
    name: 'Pelabuhan Sydney',
    type: 'airport',
    price: 20000,
    rent: [2500, 5000, 10000, 20000],
    mortgage: 10000,
    image: 'jfk_airport',
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
    houseCost: 10000,
    hotelCost: 10000,
    rent: [3500, 17500, 50000, 150000, 185000, 250000],
    mortgage: 17500,
    image: 'dubai',
  },
  {
    id: 38,
    name: 'Pajak Mewah',
    type: 'tax',
    amount: 10000,
  },
  {
    id: 39,
    name: 'Mesir',
    type: 'property',
    komplex: 'H',
    price: 40000,
    houseCost: 10000,
    hotelCost: 10000,
    rent: [5000, 25000, 75000, 225000, 400000, 560000],
    mortgage: 20000,
    image: 'hollywood',
  },
];

// Helper: ambil semua properti dalam 1 komplex
export const getKomplexSquares = (komplex) =>
  SQUARES.filter((s) => s.komplex === komplex);

// Helper: cek apakah pemain kuasai seluruh komplex
export const ownsFullKomplex = (komplex, ownerId, owners) => {
  const props = getKomplexSquares(komplex);
  return props.every((s) => owners[s.id] === ownerId);
};