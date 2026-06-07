// ============================================================
// images.js — Mapping gambar landmark ke path aset
//
// Ganti nilai string di bawah dengan path gambar kamu.
// Taruh file gambar di: public/assets/landmarks/
// Atau gunakan URL eksternal langsung.
//
// Format: key → path/url gambar
// ============================================================

const BASE = '/assets/landmarks';  // ganti jika beda folder

export const LANDMARK_IMAGES = {
  // ── KOMPLEX A ─────────────────────────────────
  Indonesia:              `${BASE}/Indonesia.jpeg`,
  Malaysia:           `${BASE}/Malaysia.jpeg`,

  // ── KOMPLEX B ─────────────────────────────
  Singapura:      `${BASE}/Singapur.jpeg`,
  Hongkong:            `${BASE}/Hongkong.jpeg`,
  Taiwan:         `${BASE}/Taiwan.jpeg`,

  // ── KOMPLEX C ────────────────────────────────
  Philipina:             `${BASE}/Philipina.jpeg`,
  Thailand:           `${BASE}/Thailand.jpeg`,
  Vietnam:             `${BASE}/Vietnam.jpeg`,

  // ── KOMPLEX D ───────────────────
  Jepang:            `${BASE}/Jepang.jpeg`,
  Korea:            `${BASE}/Korea.jpg`,
  India:          `${BASE}/India.jpeg`,

  // ── KOMPLEX E — Eropa Timur & Tengah ─────────────────────
  China:            `${BASE}/China.jpeg`,
  Uni_Soviet:              `${BASE}/Uni-Soviet.jpeg`,
  Italia:             `${BASE}/Italia.jpeg`,

  // ── KOMPLEX F — Eropa Barat ───────────────────────────────
  London:            `${BASE}/Inggris.jpeg`,
  amsterdam:         `${BASE}/Prancis.jpeg`,
  berlin:            `${BASE}/Belanda.jpeg`,

  // ── KOMPLEX G — Amerika ───────────────────────────────────
  rio_de_janeiro:    `${BASE}/Canada.jpeg`,
  los_angeles:       `${BASE}/Amerika.jpeg`,
  new_york:          `${BASE}/Brazilia.jpeg`,

  // ── KOMPLEX H — Timur Tengah & Hollywood ─────────────────
  dubai:             `${BASE}/Australia.jpeg`,
  hollywood:         `${BASE}/Mesir.jpeg`,

  // ── BANDARA ───────────────────────────────────────────────
  soetta_airport:    `${BASE}/Chang-Airport.jpeg`,
  changi_airport:    `${BASE}/Tokyo.jpeg`,
  heathrow_airport:  `${BASE}/London.jpeg`,
  jfk_airport:       `${BASE}/Pelabuhan.jpeg`,

  // ── UTILITAS ──────────────────────────────────────────────
  pln:               `${BASE}/Listrik.jpeg`,
  pam:               `${BASE}/Air.jpeg`,

    // ── Pajak ──────────────────────────────────────────────
  Pajak_jalan:               `${BASE}/Pajak-Jalan.jpeg`,
  Pajak_istimewa:               `${BASE}/Pajak-Istimewa.jpeg`,
  // ── SUDUT / SPECIAL (opsional, untuk overlay) ────────────
  corner_go:         `${BASE}/Start.jpeg`,
  corner_jail:       `${BASE}/Penjara1.jpeg`,
  corner_parking:    `${BASE}/Bebas-Parkir.jpeg`,
  corner_gotojail:   `${BASE}/Penjara.jpeg`,

  // ── CENTER BOARD ──────────────────────────────────────────
  globe_center:      `${BASE}/globe-center.png`,   // globe landmark dunia
  logo_monopoly:     `${BASE}/logo-monopoly.png`,  // logo M.O.N.O.P.O.L.Y

  // ── KARTU ─────────────────────────────────────────────────
  card_chance_back:  `${BASE}/Kesempatan.jpeg`,
  card_chest_back:   `${BASE}/Dana-Umum.jpeg`,

  // ── UANG ──────────────────────────────────────────────────
  money_500:         `${BASE}/Start.jpeg`,
  money_1000:        `${BASE}/uang-1000.png`,
  money_5000:        `${BASE}/uang-5000.png`,
  money_10000:       `${BASE}/uang-10000.png`,
  money_25000:       `${BASE}/uang-25000.png`,
  money_50000:       `${BASE}/uang-50000.png`,
  money_100000:      `${BASE}/uang-100000.png`,
};

// ─── Helper: ambil image dengan fallback ─────────────────────
export const getImage = (key, fallback = '') =>
  LANDMARK_IMAGES[key] || fallback;

// ─── Helper: cek apakah image tersedia (non-placeholder) ─────
export const hasImage = (key) =>
  Boolean(LANDMARK_IMAGES[key]);

export default LANDMARK_IMAGES;