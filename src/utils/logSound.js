// ============================================================
// logSound.js — Pilih efek suara dari teks baris log permainan
// ============================================================

const RULES = [
  ['buy', /membeli|memenangkan lelang/i],
  ['money', /menerima|bonus|lewat MULAI|Parkir Gratis/i],
  ['jail', /penjara/i],
  ['lose', /bangkrut/i],
];

/**
 * @param {string} text — isi teks baris log (`entry.text`, bukan objeknya)
 * @returns {'buy'|'money'|'jail'|'lose'|null}
 */
export const soundForLogText = (text) => {
  if (typeof text !== 'string') return null;
  const match = RULES.find(([, pattern]) => pattern.test(text));
  return match ? match[0] : null;
};
