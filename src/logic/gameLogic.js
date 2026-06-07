// ============================================================
// gameLogic.js — Core game logic
// Semua fungsi pure (tidak mutate state langsung)
// Kembalikan patch object → merge di useGameState
// ============================================================

import { SQUARES } from '../constants/squares';
import { RULES, SPECIAL_POSITIONS, AIRPORT_POSITIONS, UTILITY_POSITIONS } from '../constants/config';
import { shuffleDeck, CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '../constants/cards';
import { calculateRent } from './rentLogic';

// ─────────────────────────────────────────────────────────────
// DICE
// ─────────────────────────────────────────────────────────────

/**
 * Roll 2 dadu, return { d1, d2, total, isDouble }
 */
export const rollDice = () => {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { d1, d2, total: d1 + d2, isDouble: d1 === d2 };
};

// ─────────────────────────────────────────────────────────────
// MOVEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Hitung posisi baru dari posisi sekarang + steps
 * Return { newPos, passedGo }
 */
export const calcNewPosition = (currentPos, steps) => {
  const raw = currentPos + steps;
  const newPos = ((raw % 40) + 40) % 40; // handle negatif
  const passedGo = raw >= 40;
  return { newPos, passedGo };
};

/**
 * Cari bandara/utilitas terdekat dari posisi sekarang
 */
export const findNearest = (currentPos, type) => {
  const positions = type === 'airport' ? AIRPORT_POSITIONS : UTILITY_POSITIONS;
  let nearest = positions[0];
  let minDist = Infinity;

  for (const pos of positions) {
    const dist = pos > currentPos ? pos - currentPos : 40 - currentPos + pos;
    if (dist < minDist) {
      minDist = dist;
      nearest = pos;
    }
  }
  return nearest;
};

// ─────────────────────────────────────────────────────────────
// JAIL
// ─────────────────────────────────────────────────────────────

/**
 * Kirim pemain ke penjara
 */
export const sendToJail = (player) => ({
  ...player,
  position: SPECIAL_POSITIONS.JAIL,
  inJail: true,
  jailTurns: 0,
  consecutiveDoubles: 0,
});

/**
 * Proses giliran pemain di penjara
 * Return { freed, paid, patch }
 */
export const processJailTurn = (player, roll) => {
  const { isDouble, total } = roll;

  // Keluar gratis dengan double
  if (isDouble) {
    return {
      freed: true,
      paid: false,
      patch: {
        inJail: false,
        jailTurns: 0,
        position: (SPECIAL_POSITIONS.JAIL + total) % 40,
      },
    };
  }

  const newJailTurns = player.jailTurns + 1;

  // Sudah 3 giliran → wajib bayar denda
  if (newJailTurns >= RULES.JAIL_TURNS_MAX) {
    return {
      freed: true,
      paid: true,
      patch: {
        inJail: false,
        jailTurns: 0,
        money: player.money - RULES.JAIL_FINE,
        position: (SPECIAL_POSITIONS.JAIL + total) % 40,
      },
    };
  }

  // Masih di penjara
  return {
    freed: false,
    paid: false,
    patch: { jailTurns: newJailTurns },
  };
};

/**
 * Bayar denda untuk bebas dari penjara secara manual
 */
export const payJailFine = (player) => {
  if (player.money < RULES.JAIL_FINE) return null; // tidak cukup uang
  return {
    ...player,
    money: player.money - RULES.JAIL_FINE,
    inJail: false,
    jailTurns: 0,
  };
};

/**
 * Gunakan kartu bebas penjara
 */
export const useJailFreeCard = (player, cardSource) => ({
  ...player,
  inJail: false,
  jailTurns: 0,
  jailFreeCards: {
    ...player.jailFreeCards,
    [cardSource]: player.jailFreeCards[cardSource] - 1,
  },
});

// ─────────────────────────────────────────────────────────────
// LANDING — apa yang terjadi saat pemain berhenti di petak
// ─────────────────────────────────────────────────────────────

/**
 * Proses efek mendarat di petak
 * Return landResult:
 * {
 *   type: 'buy_prompt' | 'rent' | 'tax' | 'go_to_jail' |
 *         'chance' | 'community_chest' | 'corner' | 'free' | 'auction_prompt',
 *   square,
 *   rentAmount?,
 *   taxAmount?,
 *   card?,
 * }
 */
export const processLanding = (player, square, gameState) => {
  const { owners, houses, hotels, players } = gameState;

  switch (square.type) {
    case 'property':
    case 'airport':
    case 'utility': {
      const ownerId = owners[square.id];

      // Tidak ada pemilik → tawaran beli / lelang
      if (ownerId === undefined || ownerId === null) {
        if (player.money >= square.price) {
          return { type: 'buy_prompt', square };
        }
        return { type: 'auction_prompt', square };
      }

      // Milik sendiri atau sedang digadai
      if (ownerId === player.id) return { type: 'own', square };
      const ownerPlayer = players.find((p) => p.id === ownerId);
      if (ownerPlayer?.mortgaged?.includes(square.id)) return { type: 'mortgaged', square };

      // Bayar sewa
      const rent = calculateRent(square, gameState, player);
      return { type: 'rent', square, rentAmount: rent, ownerId };
    }

    case 'tax':
      return { type: 'tax', square, taxAmount: square.amount };

    case 'chance':
      return { type: 'chance', square };

    case 'community_chest':
      return { type: 'community_chest', square };

    case 'corner': {
      if (square.subtype === 'go_to_jail') {
        return { type: 'go_to_jail', square };
      }
      return { type: 'corner', square };
    }

    default:
      return { type: 'free', square };
  }
};

// ─────────────────────────────────────────────────────────────
// KARTU — terapkan efek kartu (lihat cardLogic.js untuk detail)
// ─────────────────────────────────────────────────────────────

/**
 * Draw kartu dari deck, otomatis shuffle jika habis
 * Return { card, newDeck }
 */
// NOTE: gunakan drawFromDeck dari cardLogic.js — fungsi ini hanya fallback
export const drawCard = (deck, sourceCards) => {
  if (!deck || deck.length === 0) {
    const reshuffled = shuffleDeck(sourceCards);
    return { card: reshuffled[0], newDeck: reshuffled.slice(1) };
  }
  return { card: deck[0], newDeck: deck.slice(1) };
};

// ─────────────────────────────────────────────────────────────
// PROPERTI — beli, gadai, bangun
// ─────────────────────────────────────────────────────────────

/**
 * Beli properti
 * Return updated player atau null jika tidak cukup uang
 */
export const buyProperty = (player, square, gameState) => {
  if (player.money < square.price) return null;

  return {
    playerPatch: { money: player.money - square.price },
    ownersPatch: { [square.id]: player.id },
  };
};

/**
 * Gadaikan properti (mortgage)
 * Return { playerPatch, mortgagedPatch } atau null
 */
export const mortgageProperty = (player, squareId, gameState) => {
  const square = SQUARES.find((s) => s.id === squareId);
  if (!square || gameState.owners[squareId] !== player.id) return null;

  const mortgageValue = Math.floor(square.price * RULES.MORTGAGE_RATE);
  return {
    playerPatch: {
      money: player.money + mortgageValue,
      mortgaged: [...(player.mortgaged || []), squareId],
    },
  };
};

/**
 * Tebus gadai (unmortgage)
 */
export const unmortgageProperty = (player, squareId) => {
  const square = SQUARES.find((s) => s.id === squareId);
  if (!square) return null;

  const cost = Math.floor(square.price * RULES.UNMORTGAGE_RATE);
  if (player.money < cost) return null;

  return {
    playerPatch: {
      money: player.money - cost,
      mortgaged: (player.mortgaged || []).filter((id) => id !== squareId),
    },
  };
};

/**
 * Beli rumah di properti
 * Return patch atau null jika syarat tidak terpenuhi
 */
export const buyHouse = (player, squareId, gameState) => {
  const { owners, houses, hotels, housesLeft, hotelsLeft } = gameState;
  const square = SQUARES.find((s) => s.id === squareId);

  if (!square || owners[squareId] !== player.id) return null;
  if (hotels[squareId] > 0) return null; // sudah ada hotel
  if ((houses[squareId] || 0) >= 4) return null; // harus beli hotel
  if (housesLeft <= 0) return null; // stok habis
  if (player.money < square.houseCost) return null;

  return {
    playerPatch: { money: player.money - square.houseCost },
    housesPatch: { [squareId]: (houses[squareId] || 0) + 1 },
    housesLeft: housesLeft - 1,
  };
};

/**
 * Beli hotel (butuh 4 rumah)
 */
export const buyHotel = (player, squareId, gameState) => {
  const { owners, houses, hotels, housesLeft, hotelsLeft } = gameState;
  const square = SQUARES.find((s) => s.id === squareId);

  if (!square || owners[squareId] !== player.id) return null;
  if ((houses[squareId] || 0) < RULES.MIN_HOUSES_FOR_HOTEL) return null;
  if ((hotels[squareId] || 0) >= 1) return null;
  if (hotelsLeft <= 0) return null;
  if (player.money < square.hotelCost) return null;

  return {
    playerPatch: { money: player.money - square.hotelCost },
    housesPatch: { [squareId]: 0 },      // rumah dikembalikan ke stok
    hotelsPatch: { [squareId]: 1 },
    housesLeft: housesLeft + 4,          // 4 rumah balik ke stok
    hotelsLeft: hotelsLeft - 1,
  };
};

/**
 * Jual satu rumah (refund 50% harga bangun).
 * Aturan jual merata: hanya boleh menjual dari petak dengan rumah
 * TERBANYAK dalam komplex. Return patch atau null.
 */
export const sellHouse = (player, squareId, gameState) => {
  const { owners, houses, hotels, housesLeft } = gameState;
  const square = SQUARES.find((s) => s.id === squareId);
  if (!square || owners[squareId] !== player.id) return null;
  if ((hotels[squareId] || 0) >= 1) return null; // ada hotel — pakai sellHotel
  const count = houses[squareId] || 0;
  if (count <= 0) return null;

  // Jual merata: petak ini harus punya rumah terbanyak dalam komplex
  const maxInKomplex = Math.max(
    ...getKomplexSquares(square.komplex).map((s) => houses[s.id] || 0)
  );
  if (count !== maxInKomplex) return null;

  const refund = Math.floor(square.houseCost * RULES.SELL_REFUND_RATE);
  return {
    playerPatch: { money: player.money + refund },
    housesPatch: { [squareId]: count - 1 },
    housesLeft: housesLeft + 1,
    refund,
  };
};

/**
 * Jual hotel → kembali menjadi 4 rumah (refund 50% harga hotel).
 * Butuh stok minimal 4 rumah (kebalikan dari buyHotel). Return patch / null.
 */
export const sellHotel = (player, squareId, gameState) => {
  const { owners, hotels, housesLeft, hotelsLeft } = gameState;
  const square = SQUARES.find((s) => s.id === squareId);
  if (!square || owners[squareId] !== player.id) return null;
  if ((hotels[squareId] || 0) < 1) return null;
  if (housesLeft < RULES.MIN_HOUSES_FOR_HOTEL) return null; // tak cukup rumah utk dipecah

  const refund = Math.floor(square.hotelCost * RULES.SELL_REFUND_RATE);
  return {
    playerPatch: { money: player.money + refund },
    housesPatch: { [squareId]: RULES.MIN_HOUSES_FOR_HOTEL }, // hotel → 4 rumah
    hotelsPatch: { [squareId]: 0 },
    housesLeft: housesLeft - RULES.MIN_HOUSES_FOR_HOTEL,
    hotelsLeft: hotelsLeft + 1,
    refund,
  };
};

// ─────────────────────────────────────────────────────────────
// LIKUIDASI / BANGKRUT — pindahkan aset pemain bangkrut
// ─────────────────────────────────────────────────────────────

/**
 * Likuidasi seluruh aset pemain bangkrut.
 * @param {Object} state        — game state sekarang
 * @param {number} bankruptId   — id pemain yang bangkrut
 * @param {number|null} creditorId — penerima aset; null = kembali ke bank
 * @returns {Object} sub-state: { players, owners, houses, hotels, housesLeft, hotelsLeft }
 *
 * - Semua bangunan dibongkar & dikembalikan ke stok global.
 * - Properti pindah ke kreditor (status gadai ikut) atau balik ke bank.
 * - Sisa kas pindah ke kreditor (jika ada).
 */
export const liquidatePlayer = (state, bankruptId, creditorId) => {
  const { players, owners, houses, hotels, housesLeft, hotelsLeft } = state;
  const bankruptPlayer = players.find((p) => p.id === bankruptId);

  let newHousesLeft = housesLeft;
  let newHotelsLeft = hotelsLeft;
  const newOwners = { ...owners };
  const newHouses = { ...houses };
  const newHotels = { ...hotels };

  for (const sq of SQUARES) {
    if (owners[sq.id] !== bankruptId) continue;
    newHousesLeft += houses[sq.id] || 0;
    newHotelsLeft += hotels[sq.id] || 0;
    newHouses[sq.id] = 0;
    newHotels[sq.id] = 0;
    if (creditorId != null) newOwners[sq.id] = creditorId;
    else delete newOwners[sq.id]; // balik ke bank
  }

  const cashToCreditor = creditorId != null ? Math.max(0, bankruptPlayer.money) : 0;
  const inheritedMortgages = bankruptPlayer.mortgaged || [];

  const newPlayers = players.map((p) => {
    if (p.id === bankruptId) {
      return {
        ...p, money: 0, bankrupt: true, inJail: false, jailTurns: 0,
        mortgaged: [], jailFreeCards: { chance: 0, community_chest: 0 },
      };
    }
    if (p.id === creditorId) {
      return {
        ...p,
        money: p.money + cashToCreditor,
        mortgaged: [...(p.mortgaged || []), ...inheritedMortgages],
      };
    }
    return p;
  });

  return {
    players: newPlayers,
    owners: newOwners,
    houses: newHouses,
    hotels: newHotels,
    housesLeft: newHousesLeft,
    hotelsLeft: newHotelsLeft,
  };
};

// ─────────────────────────────────────────────────────────────
// LELANG — inisialisasi sesi lelang
// ─────────────────────────────────────────────────────────────

/**
 * Buat objek lelang untuk sebuah properti.
 * Urutan menawar dimulai dari pemain yang sedang giliran, searah.
 * @returns {Object} auction { squareId, remaining[], currentBidderId,
 *                             highestBid, highestBidderId }
 */
export const startAuction = (players, currentPlayerIndex, squareId) => {
  const n = players.length;
  const order = [];
  for (let i = 0; i < n; i++) {
    const idx = (currentPlayerIndex + i) % n;
    if (!players[idx].bankrupt) order.push(players[idx].id);
  }
  return {
    squareId,
    remaining: order,
    currentBidderId: order[0] ?? null,
    highestBid: 0,
    highestBidderId: null,
  };
};

// ─────────────────────────────────────────────────────────────
// STATISTIK — segarkan rekap kekayaan pemain
// ─────────────────────────────────────────────────────────────

/**
 * Perbarui stats.peakMoney & stats.maxProps untuk semua pemain
 * berdasarkan kondisi terkini. Dipanggil setelah perubahan besar
 * (akhir giliran). Mengembalikan array players baru (immutable).
 */
export const refreshStats = (players, owners) => {
  return players.map((p) => {
    const propCount = SQUARES.filter((s) => owners[s.id] === p.id).length;
    const prev = p.stats || { peakMoney: p.money, maxProps: 0, rentPaid: 0, rentEarned: 0 };
    return {
      ...p,
      stats: {
        ...prev,
        peakMoney: Math.max(prev.peakMoney, p.money),
        maxProps: Math.max(prev.maxProps, propCount),
      },
    };
  });
};

// ─────────────────────────────────────────────────────────────
// TRANSFER UANG
// ─────────────────────────────────────────────────────────────

/**
 * Transfer uang antar pemain atau ke/dari bank
 * Return { fromPatch, toPatch } atau null jika bangkrut
 */
export const transferMoney = (fromPlayer, toPlayer, amount) => {
  // toPlayer bisa null = bank
  const fromPatch = { money: fromPlayer.money - amount };
  const toPatch = toPlayer ? { money: toPlayer.money + amount } : null;
  return { fromPatch, toPatch, bankrupt: fromPlayer.money - amount < RULES.BANKRUPTCY_THRESHOLD };
};

// ─────────────────────────────────────────────────────────────
// NEXT TURN
// ─────────────────────────────────────────────────────────────

/**
 * Tentukan pemain berikutnya
 * Jika double dan tidak masuk penjara → giliran sama
 */
export const getNextTurn = (currentIndex, players, rolledDouble, wentToJail) => {
  if (rolledDouble && !wentToJail) return currentIndex; // giliran lagi
  const activePlayers = players.filter((p) => !p.bankrupt);
  const currentActiveIndex = activePlayers.findIndex(
    (p) => p.id === players[currentIndex].id
  );
  return players.findIndex(
    (p) => p.id === activePlayers[(currentActiveIndex + 1) % activePlayers.length].id
  );
};

// ─────────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────────

/**
 * Buat initial game state
 * @param {Array} playerSetups — [{ name, piece, isAI }]
 */
export const createInitialState = (playerSetups) => {
  const players = playerSetups.map((setup, i) => ({
    id: i,
    name: setup.name,
    piece: setup.piece,
    isAI: setup.isAI || false,
    money: RULES.STARTING_MONEY,
    position: 0,
    inJail: false,
    jailTurns: 0,
    consecutiveDoubles: 0,
    mortgaged: [],
    jailFreeCards: { chance: 0, community_chest: 0 },
    bankrupt: false,
    // Statistik (Prioritas 3)
    stats: {
      peakMoney: RULES.STARTING_MONEY,  // kas tertinggi yang pernah dicapai
      maxProps: 0,                       // properti terbanyak yang pernah dimiliki
      rentPaid: 0,                       // total sewa yang dibayar
      rentEarned: 0,                     // total sewa yang diterima
    },
  }));

  return {
    players,
    currentPlayerIndex: 0,
    turnCount: 0,             // total giliran yang sudah berjalan
    startedAt: Date.now(),    // timestamp mulai (untuk durasi)
    turnEnded: false,         // true bila reducer sudah memindahkan giliran sendiri
    phase: 'setup',         // 'setup' | 'playing' | 'ended'
    owners: {},             // { squareId: playerId }
    houses: {},             // { squareId: count }
    hotels: {},             // { squareId: 0|1 }
    housesLeft: RULES.MAX_HOUSES,
    hotelsLeft: RULES.MAX_HOTELS,
    freeParkingPool: 0,     // uang terkumpul di Parkir Gratis
    chanceDeck: shuffleDeck(CHANCE_CARDS),
    communityChestDeck: shuffleDeck(COMMUNITY_CHEST_CARDS),
    lastRoll: null,         // { d1, d2, total, isDouble }
    log: [],                // array string event
    landResult: null,       // hasil mendarat (untuk modal)
    activeCard: null,       // kartu yang sedang aktif
    auction: null,          // sesi lelang aktif
    pendingDebt: null,      // kewajiban yang harus dilunasi (raise funds)
    winner: null,
  };
};

/**
 * Tambah entri ke log game
 */
export const addLog = (log, message) => [
  { text: message, ts: Date.now() },
  ...log.slice(0, 49), // simpan max 50 entri
];