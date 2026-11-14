/* screen-setup.js — Bermain Offline: Persiapan Permainan */
/* ================= LAYAR PERSIAPAN PERMAINAN ================= */
const SL=[[25,208],[246,209],[468,207],[688,197]], ST=89, SH=454;
const CARD=['card1','card2','card3','card2'], COL=['#8a3d00','#0b3a8a','#0d5a14','#4a1b8a'];
const DIFF=['Mudah','Sedang','Sulit'], DC={Mudah:['#9bea3b','#27a824'],Sedang:['#38b6ff','#1262d8'],Sulit:['#ffb347','#e8590c']};
const MAPS=[{id:'nusantara',n:'Peta Nusantara',f:'none'},{id:'dunia',n:'Peta Dunia',f:'hue-rotate(150deg) saturate(1.15)'},{id:'kota',n:'Peta Kota',f:'hue-rotate(-55deg) saturate(1.1)'},{id:'nusantara-compact',n:'Peta Nusantara Ringkas',f:'hue-rotate(12deg) saturate(.95)'}];
const setup={slots:[{t:'human'},{t:'bot',d:'Sedang'},null,null], map:0, money:150000, speed:'normal'};
const MONEYS=[150000,200000,250000,300000,400000,500000];
function getSetup(){ return { mode:'offline', players:setup.slots.map((p,i)=>p&&{slot:i+1,type:p.t,difficulty:p.d||null}).filter(Boolean),
  map:MAPS[setup.map].id, mapName:MAPS[setup.map].n, startMoney:setup.money, speed:setup.speed }; }
GameMenu.getSetup = getSetup;
function renderSlots(pop){
  const box=$q('#slots'); box.innerHTML='';
  setup.slots.forEach((p,i)=>{
    const d=document.createElement('div'); d.className='slot'+(p?'':' empty')+(pop===i?' pop':'');
    d.style.cssText=`left:${SL[i][0]}px;top:${ST}px;width:${SL[i][1]}px;height:${SH}px`;
    const im=new Image(); im.alt=''; im.src=ASSETS[p?CARD[i]:'card4']; if(p&&i===3) im.style.filter='hue-rotate(70deg)'; d.appendChild(im);
    if(p){
      d.insertAdjacentHTML('beforeend',`<div class="tx nm" style="--sc:${COL[i]}">Pemain ${i+1}<br>${p.t==='human'?'(Anda)':'(Bot)'}</div>`);
      if(p.t==='bot'){
        const b=document.createElement('button'); b.className='tx pill'; b.textContent=p.d; b.setAttribute('aria-label','Tingkat kesulitan bot: '+p.d);
        b.style.background=`linear-gradient(${DC[p.d][0]},${DC[p.d][1]})`; b.style.setProperty('--sc','#10284f');
        b.onclick=()=>{p.d=DIFF[(DIFF.indexOf(p.d)+1)%3]; sfx(560); renderSlots()}; d.appendChild(b);
      }
      if(i>=2){ const r=document.createElement('button'); r.className='rm'; r.textContent='×'; r.setAttribute('aria-label','Hapus pemain '+(i+1));
        r.onclick=()=>{setup.slots[i]=null; sfx(260); renderSlots()}; d.appendChild(r); }
    } else {
      d.tabIndex=0; d.setAttribute('role','button'); d.setAttribute('aria-label','Tambah pemain '+(i+1));
      const add=()=>{setup.slots[i]={t:'bot',d:['Sedang','Mudah','Sedang','Sulit'][i]}; sfx(720); renderSlots(i)};
      d.onclick=add; d.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();add()}};
    }
    box.appendChild(d);
  });
}
function renderMap(anim){
  const m=MAPS[setup.map], pv=$q('#pv'); pv.src=ASSETS.preview; pv.style.filter=m.f; $q('#mapName').textContent=m.n;
  if(anim){pv.classList.remove('swap'); void pv.offsetWidth; pv.classList.add('swap')}
}
function renderRules(){
  $q('#money').textContent='Rp '+setup.money.toLocaleString('id-ID');
  const mi=MONEYS.indexOf(setup.money); $q('#mMin').disabled=mi<=0; $q('#mPlus').disabled=mi>=MONEYS.length-1;
  $q('#spN').classList.toggle('on',setup.speed==='normal'); $q('#spC').classList.toggle('on',setup.speed==='cepat');
}
$q('#mpL').onclick=()=>{setup.map=(setup.map+MAPS.length-1)%MAPS.length; sfx(500); renderMap(true)};
$q('#mpR').onclick=()=>{setup.map=(setup.map+1)%MAPS.length; sfx(560); renderMap(true)};
$q('#mPlus').onclick=()=>{setup.money=MONEYS[Math.min(MONEYS.length-1,MONEYS.indexOf(setup.money)+1)]; sfx(640); renderRules()};
$q('#mMin').onclick=()=>{setup.money=MONEYS[Math.max(0,MONEYS.indexOf(setup.money)-1)]; sfx(420); renderRules()};
$q('#spN').onclick=()=>{setup.speed='normal'; sfx(520); renderRules()};
$q('#spC').onclick=()=>{setup.speed='cepat'; sfx(680); renderRules()};
function openSetup(){ ROOT.classList.add('setup'); $q('#ui').classList.add('off'); $q('#setup').classList.add('on'); }
function closeSetup(){ ROOT.classList.remove('setup'); $q('#ui').classList.remove('off'); $q('#setup').classList.remove('on'); }
$q('#bkBtn').onclick=()=>{ sfx(380); closeSetup(); window.dispatchEvent(new CustomEvent('menu:back')); };
$q('#go').onclick=()=>{
  sfx(760); if(GameMenu.settings.vibrate&&navigator.vibrate)try{navigator.vibrate(20)}catch(e){}
  const c=getSetup(); window.dispatchEvent(new CustomEvent('menu:start',{detail:c}));
  (GameMenu._h.start||(()=>toast('Memulai game: '+c.players.length+' pemain · '+c.mapName)))(c);
};
addEventListener('keydown',e=>{ if(e.key==='Escape'){ if($q('#opt').classList.contains('on'))$q('#optClose').click(); else if($q('#setup').classList.contains('on'))$q('#bkBtn').click(); }});
document.querySelectorAll('#setup [data-s]').forEach(i=>i.src=ASSETS[i.dataset.s]);
function fit(){ $q('#stage').style.setProperty('--s',Math.min(innerWidth/1600,innerHeight/900)); }
addEventListener('resize',fit); fit(); renderSlots(); renderMap(); renderRules();


