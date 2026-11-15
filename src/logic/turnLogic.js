// ============================================================
// turnLogic.js — Urutan giliran (fungsi pure, tanpa dependensi)
// ============================================================

/**
 * Tentukan index pemain yang main berikutnya.
 * - Double dan tidak masuk penjara → giliran sama (lempar lagi).
 * - Selain itu → pemain AKTIF berikutnya setelah `currentIndex`
 *   menurut urutan meja. `currentIndex` boleh menunjuk pemain yang
 *   baru saja bangkrut; urutannya tetap dihitung dari posisinya,
 *   bukan dari daftar pemain aktif (yang sudah tidak memuat dia).
 */
export const getNextTurn = (currentIndex, players, rolledDouble, wentToJail) => {
  if (rolledDouble && !wentToJail) return currentIndex; // giliran lagi
  const count = players.length;
  for (let offset = 1; offset <= count; offset += 1) {
    const index = (currentIndex + offset) % count;
    if (!players[index].bankrupt) return index;
  }
  return currentIndex; // tidak ada pemain aktif
};
