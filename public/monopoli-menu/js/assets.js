/* assets.js — peta nama aset -> file gambar.
   Ubah folder lewat:  window.GameMenuConfig = { assetsPath: '/static/ui/' }  (sebelum memuat script) */
const ASSETS = (function(){
  const P=(window.GameMenuConfig&&GameMenuConfig.assetsPath)||'assets/';
  const names=["aturan", "b_offline", "b_online", "b_option", "b_save", "back", "banner", "billsB", "billsR", "board", "card1", "card2", "card3", "card4", "dana", "dice1", "dice2", "houses", "kes", "l_act1", "l_act2", "l_av1", "l_av2", "l_back", "l_banner", "l_buat", "l_gabung", "l_main", "l_status", "l_teman", "logo", "mulai", "p_av1", "p_av2", "p_av3", "p_av4", "p_bot", "p_c", "p_f", "p_map", "p_q1", "p_q2", "p_r", "p_sil", "p_unk", "panel", "peta", "preview", "prop"];
  const o={}; names.forEach(n=>o[n]=P+n+'.webp'); return o;
})();
