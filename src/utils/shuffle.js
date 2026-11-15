// ============================================================
// shuffle.js — Pengacakan seragam (Fisher–Yates)
// Pengganti `sort(() => Math.random() - 0.5)` yang hasilnya bias.
// ============================================================

/**
 * Kembalikan salinan `items` dengan urutan acak seragam.
 * @param {Array} items
 * @param {() => number} [random] — sumber acak [0,1); bisa diganti untuk tes
 */
export const shuffle = (items, random = Math.random) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
