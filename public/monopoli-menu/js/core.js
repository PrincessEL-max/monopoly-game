/* core.js — GameMenu API, menu utama, modal Option, suara, toast */

/* =========================================================
   SAMBUNGKAN KE GAME KAMU:
   GameMenu.on('offline', () => { ...mulai game offline... });
   GameMenu.on('online',  () => { ...buka lobi online...   });
   GameMenu.on('save',    () => { ...simpan progres...     });
   GameMenu.on('option',  () => { ... });  // modal bawaan tetap terbuka
   GameMenu.on('start', cfg => { ...mulai game dengan cfg... });
     cfg = { players:[{slot,type:'human'|'bot',difficulty}], map, mapName, startMoney, speed:'normal'|'cepat' }
     (juga: GameMenu.getSetup() dan event window 'menu:start' / 'menu:back')
   LOBI ONLINE: GameMenu.on('quick'|'create'|'join'|'invite'|'addfriend'|'back', detail => {...})
     join -> {roomId} | create -> {map,maxPlayers} | invite -> {id,name} | addfriend -> {query}
   POPUP: on('quick'|'quickfound'|'quickcancel'|'create'|'roominvite'|'roombot'|'roomremove'|'disband'|'friendsearch'|'addfriend'|'start')
     Main Cepat : GameMenu.matchPlayer({name,id,avatar}) tiap lawan ketemu; GameMenu.matchEstimate(detik)
                  (3 lawan ketemu -> hitung mundur 3 detik -> event 'start' {mode:'quick',players})
     Kamar      : GameMenu.setRoomId('824591'); GameMenu.roomPlayerJoined(slot,{name,id,avatar}); GameMenu.roomPlayerLeft(slot)
                  create -> {roomId,type,maxPlayers,map,mapName,startMoney,turnSeconds}; start -> {mode:'room',...,players}
     Teman      : on('friendsearch', ({query}) => ...) lalu GameMenu.setFriendResults([{id,name,avatar}])
   Data server: GameMenu.setServerStatus({name:'INDONESIA',ping:24}); GameMenu.setTotalOnline(5842);
     GameMenu.setActivePlayers(2430); GameMenu.setFriends([{id,name,online:true,avatar:'url'}])
   GameMenu.settings = { music, sfx, vibrate }
   GameMenu.hide() / GameMenu.show()
   Event DOM: window.addEventListener('menu:offline', ...)
   ========================================================= */
const GameMenu = window.GameMenu = {
  _h:{}, settings:{music:true,sfx:true,vibrate:true},
  on(a,fn){this._h[a]=fn;return this}, hide(){ ROOT.style.display='none'; if(GameMenu._bg) GameMenu._bg.pause(); },
  show(){ ROOT.style.display=''; if(GameMenu._bg) GameMenu._bg.resume(); }
};
const $q = s => document.querySelector(s);
const ROOT = document.getElementById('menu-root');
$q('#logo').src = ASSETS.logo;
document.querySelectorAll('[data-s]').forEach(i => i.src = ASSETS[i.dataset.s]);
let tt; function toast(m){const t=$q('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),1800)}
GameMenu.toast = toast;
let ac; function sfx(f=520){ if(!GameMenu.settings.sfx) return;
  try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.value=f;
  g.gain.setValueAtTime(.12,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.18);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+.2)}catch(e){} }
const demo={offline:()=>toast('Memulai permainan offline…'),online:()=>toast('Menghubungkan ke lobi online…'),save:()=>toast('Progres tersimpan ✔'),option:()=>$q('#opt').classList.add('on')};
function trigger(a){
  sfx({offline:600,online:660,save:520,option:440}[a]);
  if(GameMenu.settings.vibrate&&navigator.vibrate)try{navigator.vibrate(15)}catch(e){}
  window.dispatchEvent(new CustomEvent('menu:'+a));
  if(a==='online'){ openLobby(); if(GameMenu._h.online) GameMenu._h.online(); return; }
  if(a==='offline'){ openSetup(); if(GameMenu._h.offline) GameMenu._h.offline(); return; }
  (GameMenu._h[a]||demo[a])();
  if(a==='option'&&GameMenu._h[a])$q('#opt').classList.add('on');
}
document.querySelectorAll('.bt').forEach(b=>b.addEventListener('click',()=>trigger(b.dataset.a)));
document.querySelectorAll('.sw').forEach(s=>s.addEventListener('click',()=>{s.classList.toggle('on');GameMenu.settings[s.dataset.k]=s.classList.contains('on');sfx(700);window.dispatchEvent(new CustomEvent('menu:settings',{detail:Object.assign({},GameMenu.settings)}))}));
$q('#optClose').onclick=()=>{sfx(400);$q('#opt').classList.remove('on')};


