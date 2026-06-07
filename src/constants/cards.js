// ============================================================
// cards.js — Kartu Kesempatan & Dana Umum
// Setiap kartu punya: id, text, type, value/target
// ============================================================

// ─── TIPE EFEK ───────────────────────────────────────────────
// 'collect'        → terima uang dari bank
// 'pay'            → bayar ke bank
// 'collect_players'→ terima uang dari semua pemain
// 'pay_players'    → bayar ke semua pemain
// 'move_to'        → pindah ke posisi tertentu
// 'move_by'        → maju/mundur N petak
// 'move_nearest'   → pindah ke bandara/utilitas terdekat
// 'jail'           → masuk penjara
// 'jail_free'      → kartu bebas penjara (disimpan)
// 'back_3'         → mundur 3 petak
// 'repairs'        → bayar per rumah/hotel

export const CHANCE_CARDS = [
  {
    id: 'c01',
    text: 'Maju ke START. Terima $25.000.',
    type: 'move_to',
    target: 0,
    collectGo: true,
  },
  {
    id: 'c02',
    text: 'Maju ke Hollywood. Jika melewati START, terima $25.000.',
    type: 'move_to',
    target: 39,
    collectGo: true,
  },
  {
    id: 'c03',
    text: 'Maju ke Dubai. Jika melewati START, terima $25.000.',
    type: 'move_to',
    target: 37,
    collectGo: true,
  },
  {
    id: 'c04',
    text: 'Maju ke Bandara terdekat. Jika tidak punya pemilik, beli. Jika punya pemilik, bayar 2x sewa.',
    type: 'move_nearest',
    nearestType: 'airport',
    rentMultiplier: 2,
    collectGo: true,
  },
  {
    id: 'c05',
    text: 'Maju ke Perusahaan Utilitas terdekat. Jika tidak punya pemilik, beli. Jika punya pemilik, bayar 10x dadu.',
    type: 'move_nearest',
    nearestType: 'utility',
    rentMultiplier: 10,
    collectGo: true,
  },
  {
    id: 'c06',
    text: 'Bank membayarmu dividen sebesar $5.000.',
    type: 'collect',
    amount: 5000,
  },
  {
    id: 'c07',
    text: 'Kartu Bebas Penjara. Simpan kartu ini sampai dibutuhkan.',
    type: 'jail_free',
  },
  {
    id: 'c08',
    text: 'Mundur 3 petak.',
    type: 'move_by',
    steps: -3,
  },
  {
    id: 'c09',
    text: 'Masuk Penjara. Jangan lewati START, jangan terima $25.000.',
    type: 'jail',
  },
  {
    id: 'c10',
    text: 'Biaya perbaikan properti: $4.000 per rumah, $11.500 per hotel.',
    type: 'repairs',
    perHouse: 4000,
    perHotel: 11500,
  },
  {
    id: 'c11',
    text: 'Denda tilang speeding: bayar $3.000.',
    type: 'pay',
    amount: 3000,
  },
  {
    id: 'c12',
    text: 'Maju ke Bali. Jika melewati START, terima $25.000.',
    type: 'move_to',
    target: 1,
    collectGo: true,
  },
  {
    id: 'c13',
    text: 'Terpilih sebagai Ketua Dewan Direksi. Bayar setiap pemain $5.000.',
    type: 'pay_players',
    amount: 5000,
  },
  {
    id: 'c14',
    text: 'Perjalanan wisata gratis ke Tokyo. Maju ke Tokyo.',
    type: 'move_to',
    target: 14,
    collectGo: true,
  },
  {
    id: 'c15',
    text: 'Mendapat warisan mendadak: terima $20.000.',
    type: 'collect',
    amount: 20000,
  },
  {
    id: 'c16',
    text: 'Biaya konsultan investasi: bayar $10.000.',
    type: 'pay',
    amount: 10000,
  },
];

export const COMMUNITY_CHEST_CARDS = [
  {
    id: 'd01',
    text: 'Maju ke START. Terima $25.000.',
    type: 'move_to',
    target: 0,
    collectGo: true,
  },
  {
    id: 'd02',
    text: 'Kesalahan bank demi keuntunganmu: terima $20.000.',
    type: 'collect',
    amount: 20000,
  },
  {
    id: 'd03',
    text: 'Bayar tagihan rumah sakit: $10.000.',
    type: 'pay',
    amount: 10000,
  },
  {
    id: 'd04',
    text: 'Kartu Bebas Penjara. Simpan kartu ini sampai dibutuhkan.',
    type: 'jail_free',
  },
  {
    id: 'd05',
    text: 'Masuk Penjara. Jangan lewati START, jangan terima $25.000.',
    type: 'jail',
  },
  {
    id: 'd06',
    text: 'Dana Pensiun jatuh tempo: terima $10.000.',
    type: 'collect',
    amount: 10000,
  },
  {
    id: 'd07',
    text: 'Pajak penghasilan dikembalikan: terima $5.000.',
    type: 'collect',
    amount: 5000,
  },
  {
    id: 'd08',
    text: 'Hari ulang tahunmu! Setiap pemain memberimu $5.000.',
    type: 'collect_players',
    amount: 5000,
  },
  {
    id: 'd09',
    text: 'Asuransi jiwa jatuh tempo: terima $10.000.',
    type: 'collect',
    amount: 10000,
  },
  {
    id: 'd10',
    text: 'Bayar iuran sekolah: $5.000.',
    type: 'pay',
    amount: 5000,
  },
  {
    id: 'd11',
    text: 'Menerima bunga pinjaman: terima $2.500.',
    type: 'collect',
    amount: 2500,
  },
  {
    id: 'd12',
    text: 'Terjual properti dan mendapat keuntungan: terima $5.000.',
    type: 'collect',
    amount: 5000,
  },
  {
    id: 'd13',
    text: 'Bayar biaya dokter: $5.000.',
    type: 'pay',
    amount: 5000,
  },
  {
    id: 'd14',
    text: 'Biaya renovasi properti: $4.000 per rumah, $11.500 per hotel.',
    type: 'repairs',
    perHouse: 4000,
    perHotel: 11500,
  },
  {
    id: 'd15',
    text: 'Mendapat hadiah kontes kecantikan: terima $1.000.',
    type: 'collect',
    amount: 1000,
  },
  {
    id: 'd16',
    text: 'Mendapat warisan: terima $10.000.',
    type: 'collect',
    amount: 10000,
  },
];

// Shuffle kartu di awal game
export const shuffleDeck = (deck) =>
  [...deck].sort(() => Math.random() - 0.5);