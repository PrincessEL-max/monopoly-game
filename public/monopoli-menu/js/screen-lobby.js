/* screen-lobby.js — Bermain Online: lobi multiplayer */
/* ================= LAYAR BERMAIN ONLINE (LOBI) ================= */
const L={srv:{name:'INDONESIA',ping:24},total:5842,active:2430,
  friends:[{id:'u1',name:'Andi',online:true},{id:'u2',name:'Budi',online:true},{id:'u3',name:'Sari',online:true}],
  maps:['Peta Nusantara','Peta Dunia','Peta Kota'],mi:0,pls:[2,3,4],pi:2};
const nf=n=>Number(n).toLocaleString('id-ID');
function fire(name,detail,msg){
  window.dispatchEvent(new CustomEvent('menu:'+name,{detail}));
  if(GameMenu._h[name]) GameMenu._h[name](detail); else toast(msg);
}
function lbRender(){
  $q('#lbActive').textContent=nf(L.active)+' Pemain Aktif';
  $q('#lbSrv').innerHTML='Status Server: <span class="y">'+L.srv.name+' (Ping: '+L.srv.ping+'ms)</span>';
  $q('#lbTot').innerHTML='Total Online: <span class="y">'+nf(L.total)+' Pemain</span>';
  $q('#lbMap').textContent=L.maps[L.mi]; $q('#lbPl').textContent=L.pls[L.pi]+' Pemain';
}
function lbFriends(){
  const on=L.friends.filter(f=>f.online!==false); $q('#lbFTitle').textContent='TEMAN ONLINE ('+on.length+')';
  const box=$q('#lbFriends'); box.innerHTML='';
  on.forEach((f,i)=>{
    const r=document.createElement('div'); r.className='fr';
    const av=new Image(); av.className='av'; av.alt=''; av.src=f.avatar||ASSETS['l_av'+(i%2+1)]; r.appendChild(av);
    const n=document.createElement('div'); n.className='tx fn'; n.textContent=f.name; r.appendChild(n);
    const s=document.createElement('div'); s.className='tx fs'; s.textContent='● Online'; r.appendChild(s);
    const b=document.createElement('button'); b.className='fa'; b.setAttribute('aria-label','Undang '+f.name); b.title='Undang '+f.name;
    const bi=new Image(); bi.alt=''; bi.src=ASSETS.l_act1; b.appendChild(bi);
    b.onclick=()=>{sfx(680); fire('invite',{id:f.id,name:f.name},'Undangan dikirim ke '+f.name)};
    r.appendChild(b); box.appendChild(r);
  });
}
/* API untuk server nanti */
Object.assign(GameMenu,{
  setServerStatus(o){GameMenu._live=true; Object.assign(L.srv,o); lbRender()},
  setTotalOnline(n){GameMenu._live=true; L.total=n; lbRender()},
  setActivePlayers(n){GameMenu._live=true; L.active=n; lbRender()},
  setFriends(a){GameMenu._live=true; L.friends=a; lbFriends()}
});
setInterval(()=>{ if(GameMenu._live||!$q('#lobby').classList.contains('on')) return;   // simulasi demo
  const r=(a,b)=>Math.round(a+Math.random()*(b-a)); L.srv.ping=r(18,40); L.total=Math.max(0,L.total+r(-25,30)); L.active=Math.max(0,L.active+r(-12,15)); lbRender(); },3000);
$q('#lbQuick').onclick=()=>{sfx(620); qStart()};
$q('#lbMapBtn').onclick=()=>{L.mi=(L.mi+1)%L.maps.length; sfx(520); lbRender()};
$q('#lbPlBtn').onclick=()=>{L.pi=(L.pi+1)%L.pls.length; sfx(560); lbRender()};
$q('#lbCreate').onclick=()=>{sfx(660); cOpen()};
function lbJoin(){
  const el=$q('#lbRoom'), id=el.value.trim().toUpperCase();
  if(!id){ el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); el.focus(); sfx(220); toast('Masukkan ID kamar dulu'); return; }
  sfx(700); fire('join',{roomId:id},'Bergabung ke kamar '+id+'…');
}
$q('#lbJoin').onclick=lbJoin;
$q('#lbRoom').addEventListener('keydown',e=>{ if(e.key==='Enter') lbJoin(); });
$q('#lbRoom').addEventListener('input',e=>{ e.target.value=e.target.value.replace(/[^a-zA-Z0-9]/g,'').toUpperCase(); });
$q('#lbAddF').onclick=()=>{sfx(600); fOpen()};
$q('#addfNo').onclick=()=>{sfx(380); $q('#addf').classList.remove('on')};
$q('#addfOk').onclick=()=>{ const v=$q('#addfIn').value.trim(); if(!v){toast('Isi ID atau username teman'); return}
  sfx(700); $q('#addf').classList.remove('on'); $q('#addfIn').value=''; fire('addfriend',{query:v},'Permintaan pertemanan dikirim ke '+v); };
function openLobby(){ ROOT.classList.add('setup'); $q('#ui').classList.add('off'); $q('#lobby').classList.add('on'); }
function closeLobby(){ ROOT.classList.remove('setup'); $q('#ui').classList.remove('off'); $q('#lobby').classList.remove('on'); }
$q('#lbBack').onclick=()=>{ sfx(380); closeLobby(); window.dispatchEvent(new CustomEvent('menu:back')); };
addEventListener('keydown',e=>{ if(e.key!=='Escape'||!$q('#lobby').classList.contains('on')||$q('#pop').classList.contains('on')) return;
  if($q('#addf').classList.contains('on')) $q('#addfNo').click(); else if(!$q('#opt').classList.contains('on')) $q('#lbBack').click(); });
document.querySelectorAll('#lobby [data-s]').forEach(i=>i.src=ASSETS[i.dataset.s]);
function fit2(){ $q('#stage2').style.setProperty('--s',Math.min(innerWidth/1600,innerHeight/900)); }
addEventListener('resize',fit2); fit2(); lbRender(); lbFriends();


