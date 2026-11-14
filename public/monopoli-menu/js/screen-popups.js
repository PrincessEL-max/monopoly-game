/* screen-popups.js — Main Cepat, Buat Kamar, Lobi Kamar, Tambah Teman */
/* ===== POPUP: Main Cepat, Buat Kamar, Lobi Kamar, Tambah Teman ===== */
const POPS=['pQ','pC','pR','pF']; let hideT;
function showPop(id){ clearTimeout(hideT); POPS.forEach(p=>$q('#'+p).classList.toggle('on',p===id)); $q('#pop').classList.add('on'); }
function hidePop(){ $q('#pop').classList.remove('on'); clearTimeout(hideT); hideT=setTimeout(()=>{ if(!$q('#pop').classList.contains('on')) POPS.forEach(p=>$q('#'+p).classList.remove('on')); },280); }
function emit(n,d){ window.dispatchEvent(new CustomEvent('menu:'+n,{detail:d})); const h=GameMenu._h[n]; if(h){h(d);return true} return false; }
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const AVK={p1:'p_av1',andi:'p_av2',sari:'p_av3',budi:'p_av4',bot:'p_bot'}, AVN={andi:'Andi',sari:'Sari',budi:'Budi'};
const avSrc=p=>p.avatar||ASSETS[AVK[p.av]||'p_av1'];
const PEOPLE=[{id:'482015',name:'Sari',av:'sari'},{id:'902847',name:'Budi',av:'budi'},{id:'317264',name:'Andi',av:'andi'},{id:'558120',name:'Citra',av:'sari'},
  {id:'640913',name:'Dewi',av:'sari'},{id:'275906',name:'Eko',av:'budi'},{id:'731548',name:'Fajar',av:'andi'},{id:'194380',name:'Gita',av:'sari'}];
const mkBtn=(cls,txt,b,fn)=>{ const e=document.createElement('button'); e.className=cls; e.textContent=txt; e.style.cssText=`left:${b[0]}px;top:${b[1]}px;width:${b[2]}px;height:${b[3]}px`; e.onclick=fn; return e; };

/* ---------- 1 & 2. MAIN CEPAT ---------- */
const Q={phase:'idle',t0:0,found:[],timer:0,cdT:0,sim:[],cd:3,est:null};
const mmss=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
function qReset(){ clearInterval(Q.timer); clearInterval(Q.cdT); Q.sim.forEach(clearTimeout); Q.sim=[]; Q.found=[]; Q.est=null; Q.phase='idle'; }
function qTick(){
  const el=Math.floor((Date.now()-Q.t0)/1000), k=Q.found.length;
  let est=Q.est!=null?Q.est:el+(3-k)*(k?Math.max(4,Math.round(el/k)):15); est=Math.max(est,el+(k<3?2:0));
  $q('#qT').innerHTML='Waktu Berjalan: <b>'+mmss(el)+'</b>'; $q('#qE').innerHTML='Estimasi: <b>~'+mmss(est)+'</b>';
  $q('#qLeft').textContent='Mencari '+(3-k)+' pemain lain';
}
function qSlots(){
  const box=$q('#qSl'); box.innerHTML=''; const fnd=Q.phase==='found';
  const list=[{name:fnd?'Pemain 1 (Anda)':'Pemain 1',av:'p1'},...Q.found];
  for(let i=0;i<4;i++){
    const d=document.createElement('div'), p=list[i]; d.className='qs'; d.style.left=(239+140*i)+'px';
    if(p){ d.classList.add('gold'); if(p.pop){d.classList.add('pop2'); p.pop=0}
      d.innerHTML='<img class="av" src="'+avSrc(p)+'" alt=""><div class="nm">'+esc(p.name)+'</div><div class="pl g" style="left:30px;top:112px;width:60px;height:24px;font-size:14px;line-height:20px;text-align:center;pointer-events:none">SIAP!</div>'; }
    else d.innerHTML='<img class="av" src="'+ASSETS.p_unk+'" style="top:10px" alt=""><i class="sk"></i><div class="mc">Mencari…</div>';
    box.appendChild(d);
  }
}
function qStart(){
  qReset(); Q.phase='search'; Q.t0=Date.now();
  $q('#pQ').classList.remove('fnd'); $q('#qb1').classList.add('on'); $q('#qb2').classList.remove('on');
  showPop('pQ'); qSlots(); qTick(); Q.timer=setInterval(qTick,500); emit('quick',null);
  if(!GameMenu._liveMatch){ let t=0; ['andi','sari','budi'].forEach(k=>{ t+=3000+Math.random()*4500; Q.sim.push(setTimeout(()=>qAdd({name:AVN[k],av:k}),t)); }); }
}
function qAdd(p){ if(Q.phase!=='search') return; Q.found.push(Object.assign({pop:1},p)); sfx(640+Q.found.length*60); qSlots(); qTick(); if(Q.found.length>=3) qAllFound(); }
function qAllFound(){
  Q.phase='found'; clearInterval(Q.timer); $q('#pQ').classList.add('fnd'); $q('#qb1').classList.remove('on'); $q('#qb2').classList.add('on'); qSlots();
  Q.cd=3; $q('#qCd').textContent='MULAI DALAM '+Q.cd+'…'; sfx(760);
  emit('quickfound',{players:Q.found.map(p=>({name:p.name,id:p.id||null}))});
  Q.cdT=setInterval(()=>{ Q.cd--; if(Q.cd<=0){ clearInterval(Q.cdT); qGo(); } else { $q('#qCd').textContent='MULAI DALAM '+Q.cd+'…'; sfx(700); } },1000);
}
function qGo(){
  const cfg={mode:'quick',players:[{slot:1,type:'human',name:'Pemain 1'},...Q.found.map((p,i)=>({slot:i+2,type:'online',name:p.name,id:p.id||null}))]};
  qReset(); hidePop(); if(!emit('start',cfg)) toast('Memulai game online…');
}
$q('#qCancel').onclick=()=>{ sfx(380); qReset(); hidePop(); emit('quickcancel',null); };

/* ---------- 3. BUAT KAMAR ---------- */
const R={type:'Publik',max:4,map:0,money:250000,turn:30,id:'',slots:[],ready:true,creating:false};
const MONEYS3=[200000,250000,300000], TURNS=[15,30,45], kfmt=n=>'Rp '+(n/1000)+'k';
function cRender(){
  const box=$q('#cChips'); box.innerHTML='';
  const add=(b,c,t,on,fn)=>{ const e=mkBtn('ch '+c+(on?' on':''),t,b,()=>{sfx(520);fn();cRender()}); box.appendChild(e); };
  box.insertAdjacentHTML('beforeend','<i class="seg" style="left:676px;top:351px;width:208px;height:38px"></i><i class="seg" style="left:676px;top:398px;width:208px;height:38px"></i>');
  ['Publik','Privat'].forEach((t,i)=>add([658+108*i,171,98,35],'',t,R.type===t,()=>R.type=t));
  [2,3,4].forEach((n,i)=>add([712+57*i,251,48,38],'gy',n,R.max===n,()=>R.max=n));
  MONEYS3.forEach((m,i)=>add([692+65*i,355,62,30],'sg',kfmt(m),R.money===m,()=>R.money=m));
  TURNS.forEach((m,i)=>add([692+65*i,402,62,30],'sg',m+'d',R.turn===m,()=>R.turn=m));
  $q('#cType').innerHTML='Tipe: <b class="'+(R.type==='Publik'?'gr':'or')+'">'+R.type+'</b>';
  $q('#cMapT').textContent=$q('#cMapB').textContent=MAPS[R.map].n; $q('#cMapImg').style.filter=MAPS[R.map].f;
}
function cOpen(){ R.map=L.mi; R.max=L.pls[L.pi]; showPop('pC'); cRender(); }
$q('#cL').onclick=()=>{R.map=(R.map+MAPS.length-1)%MAPS.length; sfx(500); cRender()};
$q('#cR').onclick=()=>{R.map=(R.map+1)%MAPS.length; sfx(560); cRender()};
$q('#cBack').onclick=$q('#cX').onclick=()=>{ sfx(380); hidePop(); };
$q('#cOk').onclick=()=>{
  if(R.creating) return;
  sfx(700); R.creating=true; $q('#cOk').disabled=true;
  emit('create',roomCfg());
};
function roomCfg(){ return {roomId:R.id,type:R.type,maxPlayers:R.max,map:MAPS[R.map].id,mapName:MAPS[R.map].n,startMoney:R.money,turnSeconds:R.turn}; }

/* ---------- 4. LOBI KAMAR ---------- */
const RL=[357,490,617,741], fmtId=s=>s.replace(/(\d{3})(?=\d)/,'$1 ');
const pill=(c,t,b,fn)=>{ const e=mkBtn('pl '+c,t,b,()=>{sfx(560);fn()}); e.style.fontSize='15px'; return e; };
function rRender(){
  $q('#rId').textContent='ID KAMAR: '+fmtId(R.id); $q('#rMapL').textContent=MAPS[R.map].n.toUpperCase(); $q('#rMapImg').style.filter=MAPS[R.map].f;
  const row=(y,t)=>'<div class="t2 a" style="left:222px;top:'+y+'px;width:109px;height:20px;font-size:15px;line-height:20px;text-align:right">'+t+'</div>';
  $q('#rInfo').innerHTML=row(326,'<b class="'+(R.type==='Publik'?'gr':'or')+'">'+R.type+'</b>')+row(356,'<b>Maks. '+R.max+'</b>')+row(389,kfmt(R.money))+row(421,R.turn+'d');
  const box=$q('#rSl'); box.innerHTML=''; const cnt=R.slots.slice(0,R.max).filter(Boolean).length;
  for(let i=0;i<4;i++){
    const p=R.slots[i], d=document.createElement('div'), closed=i>=R.max; d.style.left=RL[i]+'px';
    d.className='rs '+(closed?'emp off':p?(p.t==='host'?'host':'mem'):'emp');
    if(closed||!p){ d.innerHTML='<img class="av" src="'+ASSETS.p_sil+'" alt=""><div class="rn">'+(closed?'[ TUTUP ]':'[ KOSONG ]')+'</div>';
      if(!closed){ d.appendChild(pill('b','+ UNDANG',[9,148,94,32],()=>rInvite(i))); d.appendChild(pill('g','+ BOT',[9,188,94,32],()=>rBot(i))); } }
    else {
      d.innerHTML='<img class="av" src="'+avSrc(p)+'" alt=""><div class="rn">'+esc(p.name)+'</div><div class="rn sb">'+(p.t==='host'?'(Anda)':p.t==='bot'?'(Bot)':'(Teman)')+'</div>'+(p.t==='host'?'<div class="hb">HOST</div>':'');
      if(p.t==='host') d.appendChild(pill(R.ready?'g':'gy',R.ready?'SIAP!':'BELUM',[11,176,90,32],()=>{R.ready=!R.ready; rRender()}));
      else { d.insertAdjacentHTML('beforeend','<div class="pl g" style="left:11px;top:176px;width:90px;height:32px;font-size:15px;line-height:28px;text-align:center;pointer-events:none">SIAP!</div>');
        const x=document.createElement('button'); x.className='x2'; x.textContent='×'; x.setAttribute('aria-label','Keluarkan '+p.name); x.onclick=()=>{sfx(260); emit('roomremove',{roomId:R.id,slot:i+1}); if(!GameMenu._liveRoom){R.slots[i]=null;rRender()}}; d.appendChild(x); }
    }
    box.appendChild(d);
  }
  const all=R.slots.slice(0,R.max).filter(Boolean);
  $q('#rHint').textContent=cnt<2?'Menunggu pemain lain bergabung atau tambah BOT untuk mulai bermain.':(R.ready?'Semua pemain siap! Tekan MULAI GAME untuk bermain.':'Tekan SIAP! lalu MULAI GAME.');
}
function rJoin(slot,p){ const i=slot-1; if(i<0||i>=R.max||R.slots[i]) return; R.slots[i]=Object.assign({t:'player'},p); sfx(700); rRender(); }
function rInvite(i){
  emit('roominvite',{roomId:R.id,slot:i+1});
  if(!GameMenu._liveRoom) setTimeout(()=>{ if(R.slots[i]||!$q('#pR').classList.contains('on')) return;
    const pp=PEOPLE.find(x=>!R.slots.some(s=>s&&s.name===x.name)); if(pp) rJoin(i+1,{name:pp.name,av:pp.av,id:pp.id}); },2500);
}
function rBot(i){
  emit('roombot',{roomId:R.id,slot:i+1});
  if(!GameMenu._liveRoom){ const n=R.slots.filter(s=>s&&s.t==='bot').length+1; R.slots[i]={t:'bot',name:'BOT '+n,av:'bot'}; rRender(); }
}
function rCopy(){
  const t=R.id, ok=()=>toast('ID kamar '+fmtId(t)+' disalin');
  try{ navigator.clipboard.writeText(t).then(ok,()=>{rCopyOld(t);ok()}); }catch(e){ rCopyOld(t); ok(); }
}
function rCopyOld(t){ const a=document.createElement('textarea'); a.value=t; a.style.cssText='position:fixed;opacity:0'; document.body.appendChild(a); a.select(); try{document.execCommand('copy')}catch(e){} a.remove(); }
$q('#rCopy').onclick=()=>{sfx(660); rCopy()};
$q('#rDis').onclick=$q('#rX').onclick=()=>{ sfx(380); emit('disband',{roomId:R.id}); if(!GameMenu._liveRoom){hidePop();toast('Kamar dibubarkan')} };
$q('#rGo').onclick=()=>{
  const ps=R.slots.slice(0,R.max).filter(Boolean);
  if(ps.length<2){ sfx(220); toast('Tambah pemain atau BOT dulu'); return; }
  if(!R.ready){ sfx(220); toast('Tekan SIAP! dulu'); return; }
  sfx(760); const cfg=Object.assign(roomCfg(),{mode:'room',players:ps.map((p,i)=>({slot:R.slots.indexOf(p)+1,type:p.t==='host'?'human':p.t,name:p.name,id:p.id||null}))});
  hidePop(); if(!emit('start',cfg)) toast('Memulai game: '+ps.length+' pemain');
};

/* ---------- 5. TAMBAH TEMAN ---------- */
const FR={q:'',list:[],sent:new Set(),tm:0};
const fFilter=()=>{ const s=FR.q.trim().toLowerCase(); return PEOPLE.filter(p=>!s||p.name.toLowerCase().includes(s)||p.id.includes(s)); };
function fSearch(){ FR.q=$q('#fIn').value; emit('friendsearch',{query:FR.q}); if(!GameMenu._liveSearch) FR.list=fFilter(); fRender(); }
function fRender(){
  const box=$q('#fList'), st=box.scrollTop; box.innerHTML='';
  if(!FR.list.length){ box.innerHTML='<div class="emp2">Tidak ada hasil</div>'; return; }
  FR.list.forEach(p=>{
    const r=document.createElement('div'); r.className='fr2';
    r.innerHTML='<img src="'+avSrc(p)+'" alt=""><div class="n">'+esc(p.name)+'</div><div class="i">ID: '+esc(p.id)+'</div>';
    const sent=FR.sent.has(p.id), b=document.createElement('button'); b.className='pl '+(sent?'gy':'g'); b.textContent=sent?'TERKIRIM':'+ TAMBAH'; b.disabled=sent;
    b.onclick=()=>{ sfx(680); FR.sent.add(p.id); emit('addfriend',{id:p.id,name:p.name}); fRender(); };
    r.appendChild(b); box.appendChild(r);
  });
  box.scrollTop=st;
}
function fOpen(){ $q('#fIn').value=''; FR.q=''; showPop('pF'); fSearch(); setTimeout(()=>{ if($q('#pF').classList.contains('on')) $q('#fIn').focus(); },350); }
$q('#fIn').addEventListener('input',()=>{ clearTimeout(FR.tm); FR.tm=setTimeout(fSearch,180); });
$q('#fIn').addEventListener('keydown',e=>{ if(e.key==='Enter') fSearch(); });
$q('#fSearch').onclick=()=>{sfx(620); fSearch()};
$q('#fBack').onclick=$q('#fX').onclick=()=>{ sfx(380); hidePop(); };

/* ---------- API server ---------- */
Object.assign(GameMenu,{
  roomCreateComplete(){ R.creating=false; $q('#cOk').disabled=false; },
  roomLeft(){ hidePop(); },
  friendAddResult(result){
    if(!result.success) FR.sent.delete(result.id);
    fRender();
  },
  matchPlayer(p){ GameMenu._liveMatch=true; Q.sim.forEach(clearTimeout); Q.sim=[]; qAdd(p); },
  matchEstimate(sec){ GameMenu._liveMatch=true; Q.est=sec; },
  setRoomId(id){ R.id=String(id); if($q('#pR').classList.contains('on')) rRender(); },
  roomPlayerJoined(slot,p){ GameMenu._liveRoom=true; rJoin(slot,p); },
  roomPlayerLeft(slot){ GameMenu._liveRoom=true; R.slots[slot-1]=null; rRender(); },
  setFriendResults(list){ GameMenu._liveSearch=true; FR.list=list; fRender(); },
  syncRoom(room){
    if(!room) return;
    const settings=room.settings||{};
    R.id=room.code||room.id||R.id;
    R.type=settings.type||room.type||'Publik';
    R.max=room.maxPlayers||settings.maxPlayers||4;
    R.map=Math.max(0,MAPS.findIndex(m=>m.id===(settings.map||room.map)));
    R.money=settings.startMoney||room.startMoney||250000;
    R.turn=settings.turnSeconds||room.turnSeconds||30;
    R.ready=true;
    R.slots=[null,null,null,null];
    (room.players||[]).forEach(p=>{
      const slot=Number.isInteger(p.seatIndex)?p.seatIndex:(p.slotIndex||0);
      if(slot<0||slot>=R.slots.length) return;
      R.slots[slot]={
        t:p.isBot?'bot':(p.playerId===room.hostPlayerId?'host':'player'),
        name:p.name,
        id:p.playerId,
        profileId:p.profileId,
        av:p.isBot?'bot':undefined,
      };
    });
    GameMenu._liveRoom=true;
    showPop('pR');
    rRender();
  },
  showRoomInvite(invite){
    const who=esc(invite.fromName||'Teman');
    if(!invite.roomCode){ toast(who+' mengajakmu bermain. Buat atau gabung kamar untuk bermain bersama.'); return; }
    if(window.confirm(who+' mengundangmu ke kamar '+invite.roomCode+'. Gabung sekarang?')){
      $q('#lbRoom').value=invite.roomCode;
      lbJoin();
    }
  }
});
addEventListener('keydown',e=>{ if(e.key!=='Escape'||!$q('#pop').classList.contains('on')) return;
  if($q('#pQ').classList.contains('on')){ if(Q.phase==='search') $q('#qCancel').click(); }
  else if($q('#pC').classList.contains('on')) $q('#cBack').click();
  else if($q('#pR').classList.contains('on')) $q('#rDis').click();
  else if($q('#pF').classList.contains('on')) $q('#fBack').click(); });
document.querySelectorAll('#pop [data-s]').forEach(i=>i.src=ASSETS[i.dataset.s]);
function fit3(){ $q('#stage3').style.setProperty('--s',Math.min(innerWidth/1600,innerHeight/900)); }
addEventListener('resize',fit3); fit3();

