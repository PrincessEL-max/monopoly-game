/* save-option.js — Data Simpanan (Save) + Pengaturan (Option) + Hubungi Kami.
   Berdiri sendiri (tanpa library). Membuat window.GameMenu dengan API yang sama dengan proyek lengkap.
   Buka dari game kamu:  GameMenu.openSaves()  ·  GameMenu.openOptions()  ·  GameMenu.openContact()  ·  GameMenu.closePopup() */
(function(){
const ASSET_PATH=(window.GameMenuConfig&&GameMenuConfig.assetsPath)||'assets/';
const ASSETS={}; ["s_dlg", "s_on", "s_off", "s_map", "o_dlg", "k_dlg"].forEach(n=>ASSETS[n]=ASSET_PATH+n+'.webp');
const $q=s=>document.querySelector(s);
const GameMenu=window.GameMenu=window.GameMenu||{};
Object.assign(GameMenu,{ _h:GameMenu._h||{}, on(a,fn){ this._h[a]=fn; return this; },
  settings:Object.assign({music:true,sfx:true,vibrate:true,language:'id',graphics:'medium'},GameMenu.settings||{}) });
try{ Object.assign(GameMenu.settings, JSON.parse(localStorage.getItem('monopoli.menu.settings')||'{}')); }catch(e){}   // pengaturan tersimpan

/* ---------- helper ---------- */
let tt; function toast(m){ const t=$q('#toast'); t.textContent=m; t.classList.add('on'); clearTimeout(tt); tt=setTimeout(()=>t.classList.remove('on'),1800); }
let ac; function sfx(f){ f=f||520; if(!GameMenu.settings.sfx) return;
  try{ ac=ac||new (window.AudioContext||window.webkitAudioContext)(); const o=ac.createOscillator(), g=ac.createGain(); o.type='triangle'; o.frequency.value=f;
    g.gain.setValueAtTime(.12,ac.currentTime); g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.18); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime+.2); }catch(e){} }
function emit(n,d){ window.dispatchEvent(new CustomEvent('menu:'+n,{detail:d})); const h=GameMenu._h[n]; if(h){ h(d); return true; } return false; }
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf=n=>Number(n).toLocaleString('id-ID');
const MAPS=[{id:'nusantara',n:'Peta Nusantara',f:'none'},{id:'dunia',n:'Peta Dunia',f:'hue-rotate(150deg) saturate(1.15)'},{id:'kota',n:'Peta Kota',f:'hue-rotate(-55deg) saturate(1.1)'}];
GameMenu.maps=MAPS;                                   // tambah/ubah peta: {id, n:nama, f:filter CSS untuk thumbnail bawaan}

/* ---------- pop-up: tampil / sembunyi ---------- */
const POPS=['pS','pO','pK']; let hideT;
function showPop(id){ clearTimeout(hideT); POPS.forEach(p=>$q('#'+p).classList.toggle('on',p===id)); $q('#pop').classList.add('on'); }
function hidePop(){ $q('#pop').classList.remove('on'); clearTimeout(hideT); hideT=setTimeout(()=>{ if(!$q('#pop').classList.contains('on')) POPS.forEach(p=>$q('#'+p).classList.remove('on')); },280); }
function fit(){ $q('#stage3').style.setProperty('--s',Math.min(innerWidth/1600,innerHeight/900)); }
addEventListener('resize',fit); fit();

const hit=(box,label,fn,r)=>{ const b=document.createElement('button'); b.className='hr a'; b.style.cssText='--r:'+(r||40)+'px;left:'+box[0]+'px;top:'+box[1]+'px;width:'+box[2]+'px;height:'+box[3]+'px'; b.setAttribute('aria-label',label); b.onclick=fn; return b; };

/* ================= DATA SIMPANAN (tombol Save) ================= */
const SVX=[465,1025,1585];                       // posisi x tiap slot
const SV={saves:[],armed:0,tm:0};
const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
function wib(v){ const d=new Date(isNaN(+v)?Date.parse(v):+v); if(isNaN(d)) return '-'; const t=new Date(d.getTime()+7*3600e3), p=n=>String(n).padStart(2,'0');
  return t.getUTCDate()+' '+BLN[t.getUTCMonth()]+' '+t.getUTCFullYear()+', '+p(t.getUTCHours())+':'+p(t.getUTCMinutes())+' WIB'; }
function sRender(){
  const box=$q('#sSl'); box.innerHTML='';
  for(let i=0;i<3;i++){
    const sv=SV.saves.find(s=>s.slot===i+1), d=document.createElement('div'); d.className='sv'+(sv?'':' emp'); d.style.left=SVX[i]+'px';
    const cb=new Image(); cb.className='cb'; cb.alt=''; cb.src=ASSETS[sv?'s_on':'s_off']; d.appendChild(cb);
    d.insertAdjacentHTML('beforeend','<div class="tt '+(sv?'on':'off')+'">SLOT '+(i+1)+'</div>');
    if(sv){
      const m=MAPS.find(x=>x.id===sv.map)||MAPS[0], th=document.createElement('div'); th.className='th';
      const ti=new Image(); ti.alt=''; ti.src=sv.thumbnail||ASSETS.s_map; if(!sv.thumbnail) ti.style.filter=m.f; th.appendChild(ti);
      th.insertAdjacentHTML('beforeend','<div class="lb">'+esc(sv.mapName||m.n)+'</div>'); d.appendChild(th);
      d.insertAdjacentHTML('beforeend','<div class="inf">Babak '+esc(sv.round)+'<br>Uang: Rp '+nf(sv.money)+'<br>Pemain: '+esc(sv.players)+' Orang</div><div class="tm">Tersimpan: '+wib(sv.savedAt)+'</div>');
      const del=hit([33,557,136,128],'Hapus slot '+(i+1),()=>sDelete(i+1),60); if(SV.armed===i+1) del.classList.add('arm'); d.appendChild(del);
      d.appendChild(hit([193,557,294,130],'Muat game slot '+(i+1),()=>sLoad(i+1),60));
    } else {
      d.tabIndex=0; d.setAttribute('role','button'); d.setAttribute('aria-label','Slot '+(i+1)+' kosong');
      const go=()=>{ sfx(440); if(!emit('saveslot',{slot:i+1})) toast('Slot '+(i+1)+' kosong'); };
      d.onclick=go; d.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } };
    }
    box.appendChild(d);
  }
}
function sLoad(slot){ const sv=SV.saves.find(s=>s.slot===slot); sfx(720); hidePop(); if(!emit('loadgame',{slot,save:sv})) toast('Memuat slot '+slot+'…'); }
function sDelete(slot){
  if(SV.armed!==slot){ SV.armed=slot; sfx(300); toast('Pencet HAPUS sekali lagi untuk menghapus'); clearTimeout(SV.tm); SV.tm=setTimeout(()=>{ SV.armed=0; sRender(); },2500); sRender(); return; }
  clearTimeout(SV.tm); SV.armed=0; sfx(260); emit('deletesave',{slot}); SV.saves=SV.saves.filter(s=>s.slot!==slot); toast('Slot '+slot+' dihapus'); sRender();
}
function openSaves(){ SV.armed=0; sRender(); showPop('pS'); }
$q('#sX').onclick=$q('#sBack').onclick=()=>{ sfx(380); hidePop(); };
GameMenu.setSaves=function(list){ SV.saves=Array.isArray(list)?list.filter(s=>s&&s.slot>=1&&s.slot<=3):[]; SV.armed=0; if($q('#pS').classList.contains('on')) sRender(); };

/* ================= PENGATURAN (tombol Option) ================= */
const FLAGS={
  id:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#fff"/><path d="M0 20A20 20 0 0 1 40 20z" fill="#e8112d"/></svg>',
  en:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><clipPath id="c"><circle cx="20" cy="20" r="20"/></clipPath><g clip-path="url(#c)"><rect width="40" height="40" fill="#1b3c8c"/><path d="M0 0L40 40M40 0L0 40" stroke="#fff" stroke-width="7"/><path d="M0 0L40 40M40 0L0 40" stroke="#d2202e" stroke-width="3"/><path d="M20 0V40M0 20H40" stroke="#fff" stroke-width="11"/><path d="M20 0V40M0 20H40" stroke="#d2202e" stroke-width="6"/></g></svg>',
  xx:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#3a7fd0"/><ellipse cx="20" cy="20" rx="8" ry="20" fill="none" stroke="#fff" stroke-width="2"/><path d="M0 20H40M3 10H37M3 30H37" stroke="#fff" stroke-width="2"/></svg>'};
GameMenu.languages=[{code:'id',name:'Indonesia'},{code:'en',name:'English'}];   // tambah bahasa lain di sini (flag:'url' opsional)
const flagSrc=l=>l.flag||('data:image/svg+xml,'+encodeURIComponent(FLAGS[l.code]||FLAGS.xx));
const GFX=[['low','Rendah'],['medium','Sedang'],['high','Tinggi']];
function setSet(k,v){
  GameMenu.settings[k]=v;
  try{ localStorage.setItem('monopoli.menu.settings',JSON.stringify(GameMenu.settings)); }catch(e){}
  if(k==='graphics'&&GameMenu._bg&&GameMenu._bg.setQuality) GameMenu._bg.setQuality(v);
  emit('settings',Object.assign({},GameMenu.settings));
}
function oRender(){
  const s=GameMenu.settings;
  [['#oMusic','music'],['#oSfx','sfx']].forEach(([id,k])=>{ const b=$q(id); b.className='tg a '+(s[k]?'on':'off'); b.textContent=s[k]?'ON':'OFF'; b.setAttribute('aria-label',(k==='music'?'Musik ':'Efek suara ')+(s[k]?'menyala':'mati')); });
  const L=GameMenu.languages.find(l=>l.code===s.language)||GameMenu.languages[0]; $q('#oFlag').src=flagSrc(L); $q('#oLangN').textContent=L.name;
  const g=$q('#oGfx'); g.innerHTML='';
  GFX.forEach(([k,t],i)=>{ const b=document.createElement('button'); b.className='gb'+(s.graphics===k?' on':''); b.textContent=t; b.style.left=(i*189)+'px';
    b.onclick=()=>{ setSet('graphics',k); sfx(560); oRender(); }; g.appendChild(b); });
}
function oLangList(){
  const box=$q('#oLangList'); box.innerHTML='';
  GameMenu.languages.forEach(l=>{ const it=document.createElement('div'); it.className='li'+(l.code===GameMenu.settings.language?' on':'');
    const im=new Image(); im.alt=''; im.src=flagSrc(l); it.appendChild(im); it.appendChild(document.createTextNode(l.name));
    it.onclick=()=>{ setSet('language',l.code); sfx(560); box.classList.remove('on'); oRender(); }; box.appendChild(it); });
}
function openOptions(){ oRender(); $q('#oLangList').classList.remove('on'); showPop('pO'); }
$q('#oMusic').onclick=()=>{ setSet('music',!GameMenu.settings.music); sfx(700); oRender(); };
$q('#oSfx').onclick=()=>{ const on=!GameMenu.settings.sfx; setSet('sfx',on); if(on) sfx(700); oRender(); };
$q('#oLang').onclick=()=>{ const b=$q('#oLangList'); sfx(520); oLangList(); b.classList.toggle('on'); };
$q('#oHow').onclick=()=>{ sfx(560); if(!emit('howto',null)) toast('Cara bermain segera hadir'); };
$q('#oContact').onclick=()=>{ sfx(560); openContact('pO'); };
$q('#oBack').onclick=$q('#oX').onclick=()=>{ sfx(380); hidePop(); };

/* ================= HUBUNGI KAMI ================= */
const K={from:null,busy:false}, kc=()=>window.GameMenuContact||{};
function openContact(from){ K.from=from||null; showPop('pK'); }
function kClose(){ sfx(380); const f=K.from; K.from=null; if(f==='pO') showPop('pO'); else hidePop(); }
const kBad=(el,msg)=>{ el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); el.focus(); sfx(220); toast(msg); };
function kMailto(body){ const c=kc(); location.href='mailto:'+c.email+'?subject='+encodeURIComponent(c.emailSubject||'Masukan')+'&body='+encodeURIComponent(body||''); }
$q('#kWa').onclick=()=>{
  const c=kc(), n=String(c.whatsapp||'').replace(/\D/g,''); sfx(620);
  if(!n){ toast('Nomor WhatsApp belum diatur (isi js/config.js)'); return; }
  emit('contactwa',{number:n}); window.open('https://wa.me/'+n+'?text='+encodeURIComponent(c.whatsappText||''),'_blank','noopener');
};
$q('#kMail').onclick=()=>{
  const c=kc(); sfx(620);
  if(!c.email){ toast('Email tujuan belum diatur (isi js/config.js)'); return; }
  emit('contactmail',{email:c.email}); kMailto($q('#kMsg').value);
};
function kDone(){ toast('Terima kasih! Pesanmu terkirim.'); $q('#kEmail').value=''; $q('#kMsg').value=''; kClose(); }
async function kSend(){
  if(K.busy) return; const c=kc(), email=$q('#kEmail').value.trim(), msg=$q('#kMsg').value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return kBad($q('#kEmail'),'Isi email yang valid dulu');
  if(msg.length<5) return kBad($q('#kMsg'),'Tulis pesan atau masukanmu dulu');
  const payload={email,message:msg,app:c.appName||'Monopoli Indonesia',time:new Date().toISOString()}; sfx(700);
  if(emit('contact',payload)){ kDone(); return; }                       // game kamu yang mengirim
  if(c.endpoint){
    K.busy=true; toast('Mengirim…');
    try{ const r=await fetch(c.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); if(!r.ok) throw new Error(r.status); kDone(); }
    catch(e){ toast('Gagal mengirim. Coba lagi nanti.'); }
    K.busy=false; return;
  }
  if(c.email){ toast('Membuka aplikasi email…'); kMailto('Email pengirim: '+email+'\n\n'+msg); return; }
  toast('Tujuan pengiriman belum diatur (isi js/config.js)');
}
$q('#kSend').onclick=kSend;
$q('#kX').onclick=kClose;

addEventListener('keydown',e=>{ if(e.key!=='Escape'||!$q('#pop').classList.contains('on')) return;
  if($q('#pS').classList.contains('on')) $q('#sBack').click(); else if($q('#pO').classList.contains('on')){ const l=$q('#oLangList'); if(l.classList.contains('on')) l.classList.remove('on'); else $q('#oBack').click(); }
  else if($q('#pK').classList.contains('on')) kClose(); });
document.querySelectorAll('#pS [data-s],#pO [data-s],#pK [data-s]').forEach(i=>i.src=ASSETS[i.dataset.s]);

/* ---------- API publik ---------- */
Object.assign(GameMenu,{ openSaves, openOptions, openContact:()=>openContact(null), closePopup:hidePop, getSaves:()=>SV.saves.slice() });
GameMenu.on('save',openSaves);
GameMenu.on('option',openOptions);
})();
