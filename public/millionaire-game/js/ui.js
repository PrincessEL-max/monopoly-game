/* ======================================================================
   ui.js — Millionaire Indonesia · lapisan UI (TANPA logika game)

   Semua interaksi dengan layar lewat satu objek global:  window.MUI
   Game kamu cukup memanggil method MUI.* dan mendengarkan event MUI.on(...).
   Dokumentasi lengkap ada di README.md.
   ====================================================================== */
(function (global) {
  "use strict";

  /* ---------- util ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var fmt = function (n) { return "Rp " + Math.round(n).toLocaleString("id-ID"); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var r6 = function () { return 1 + Math.floor(Math.random() * 6); };

  /* ---------- konfigurasi (boleh diubah lewat MUI.config) ---------- */
  var config = {
    minPlayers: 2,
    maxPlayers: 6,
    totalLabel: "/",                 // pemisah "3/28"
    emptyKartu: "Belum ada kartu tersimpan.<br>Kartu Dana Umum atau Kesempatan yang bisa disimpan akan muncul di sini.",
    emptyAset: "Belum ada properti.<br>Beli properti saat mendarat di petaknya,<br>kartunya akan tersimpan di sini.",
    img: {                           // jalur gambar yang dipakai dari JS
      avatarGold: "assets/ui/avatar_gold.png",
      avatarBlue: "assets/ui/avatar_blue.png",
      avatarGreen: "assets/ui/avatar_green.png",
      asetKosong: "assets/ui/aset_kosong.png",
      asetGadai: "assets/ui/aset_gadai.png",
      asetBangun: "assets/ui/aset_bangun.png"
    }
  };

  /* skin panel pemain (urutan = indeks pemain). a = avatar, h = hue-rotate avatar */
  var SKINS = [
    { a: "avatarGold", h: 0, c: "#f3bb2e", g1: "#6b4a12", g2: "#3a2708", nc: "#f4d7b4" },
    { a: "avatarBlue", h: 0, c: "#4aa8ff", g1: "#2a4580", g2: "#172a52", nc: "#c3d4ec" },
    { a: "avatarGreen", h: 0, c: "#43d46a", g1: "#215c37", g2: "#123a22", nc: "#c3edc9" },
    { a: "avatarBlue", h: 75, c: "#b78bff", g1: "#4d3182", g2: "#2c1a50", nc: "#e0d0f6" },
    { a: "avatarGreen", h: -95, c: "#ff9a3c", g1: "#7d4817", g2: "#482709", nc: "#ffdcb4" },
    { a: "avatarBlue", h: 150, c: "#ff6b6b", g1: "#7d2c30", g2: "#4a1519", nc: "#ffcdcd" }
  ];
  var PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  /* ---------- state ---------- */
  var settings = { sound: true, music: true, vibrate: true, fast: false };
  var listeners = {};
  var players = [], hand = [];
  var assets = { cash: 0, count: 0, total: 0, value: 0, items: [] };
  var asOpen = false, asKey = null, modal = null, NP = 3;
  var rollIv = null, rollToken = 0, toastTm = null, acx = null;

  function emit(ev) {
    var a = Array.prototype.slice.call(arguments, 1), L = (listeners[ev] || []).slice();
    L.forEach(function (f) { f.apply(null, a); });
    return L.length;
  }

  /* ---------- suara ---------- */
  function beep(f, t, v) {
    if (!settings.sound) return;
    f = f || 440; t = t || .08; v = v == null ? .05 : v;
    try {
      acx = acx || new (global.AudioContext || global.webkitAudioContext)();
      var o = acx.createOscillator(), g = acx.createGain();
      o.frequency.value = f; o.type = "triangle"; g.gain.value = v;
      o.connect(g); g.connect(acx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(.0001, acx.currentTime + t); o.stop(acx.currentTime + t);
    } catch (e) { /* audio belum diizinkan browser */ }
  }

  /* ---------- skala layar (stage 1024x576) ---------- */
  function fit() {
    var w = document.body.clientWidth, h = document.body.clientHeight, s = Math.min(w / 1024, h / 576);
    $("fit").style.transform = "translate(" + (-512 * s) + "px," + (-288 * s) + "px) scale(" + s + ")";
  }

  /* ---------- dadu ---------- */
  function face(d, n) { Array.prototype.forEach.call(d.children, function (p, i) { p.classList.toggle("on", PIPS[n].indexOf(i) >= 0); }); }
  function showDice(a, b) { face($("d1"), a); face($("d2"), b); }
  function diceEls() { return [$("d1"), $("d2")]; }

  /** Animasi lempar dadu → Promise (selesai setelah dadu berhenti). opts.label = teks hasil di atas dadu. */
  function rollDice(a, b, opts) {
    opts = opts || {};
    var tk = ++rollToken, dice = diceEls();
    dice.forEach(function (d) { d.classList.add("roll"); });
    $("bRoll").classList.add("shake"); $("res").classList.remove("show");
    clearInterval(rollIv);
    rollIv = setInterval(function () { showDice(r6(), r6()); beep(300 + Math.random() * 200, .04, .03); }, 90);
    return sleep(settings.fast ? 500 : 1000).then(function () {
      if (tk !== rollToken) return;                       // dibatalkan
      clearInterval(rollIv);
      $("bRoll").classList.remove("shake");
      dice.forEach(function (d) { d.classList.remove("roll"); d.classList.add("land"); setTimeout(function () { d.classList.remove("land"); }, 400); });
      showDice(a, b); beep(660, .15, .07);
      if (settings.vibrate && navigator.vibrate) navigator.vibrate(30);
      if (opts.label != null) { $("res").textContent = opts.label; $("res").classList.add("show"); }
    });
  }
  function cancelRoll() {
    rollToken++; clearInterval(rollIv);
    diceEls().forEach(function (d) { d.classList.remove("roll"); });
    $("bRoll").classList.remove("shake"); $("res").classList.remove("show");
  }

  /* ---------- pemain ---------- */
  function floatText(i, amt) {
    var pl = $("pl" + i); if (!pl) return;
    var e = document.createElement("div");
    e.className = "flt " + (amt >= 0 ? "up" : "dn");
    e.textContent = (amt >= 0 ? "+" : "−") + fmt(Math.abs(amt));
    pl.appendChild(e); setTimeout(function () { e.remove(); }, 1400);
  }

  /** list = [{name, money, skin?, avatar?}] — maks 6. skin = indeks 0–5 (warna panel), avatar = URL gambar custom. */
  function setPlayers(list) {
    players = list.map(function (p) { return { name: p.name, money: p.money }; });
    var n = players.length, rows = n <= 3 ? [n] : n === 4 ? [2, 2] : [3, n - 3], box = $("pills"), idx = 0;
    box.innerHTML = "";
    document.querySelector(".stage").classList.toggle("two", rows.length > 1);
    rows.forEach(function (cnt, ri) {
      var x = 512 - (cnt * 226 + (cnt - 1) * 10) / 2;
      for (var j = 0; j < cnt; j++) {
        var i = idx + j, p = list[i], q = SKINS[(p.skin != null ? p.skin : i) % SKINS.length], d = document.createElement("div");
        d.className = "pl"; d.id = "pl" + i;
        d.style.cssText = "left:" + x + "px;top:" + (42 + ri * 80) + "px;--c:" + q.c + ";--g1:" + q.g1 + ";--g2:" + q.g2 + ";--nc:" + q.nc;
        d.innerHTML = '<div class="b0"></div><div class="av"><img alt="" src="' + esc(p.avatar || config.img[q.a]) + '" style="filter:hue-rotate(' + (p.avatar ? 0 : q.h) + 'deg)"></div>' +
          '<span class="nm">' + esc(p.name) + '</span><span class="mo" id="m' + i + '">' + fmt(p.money) + '</span>' +
          '<div class="tg">' + (i ? "GILIRAN BOT" : "GILIRAN ANDA") + '</div>';
        box.appendChild(d); x += 236;
      }
      idx += cnt;
    });
    NP = n; if (modal === "setting") renderSettings();
  }
  /** Ubah saldo pemain i. Selisih tampil sebagai +/- melayang (opts.silent=true untuk menyembunyikan). */
  function setMoney(i, amount, opts) {
    var p = players[i]; if (!p) return;
    var diff = amount - p.money; p.money = amount;
    var el = $("m" + i); if (el) el.textContent = fmt(amount);
    if (diff && !(opts && opts.silent)) floatText(i, diff);
  }
  /** Tandai giliran pemain i (label opsional untuk lencana di bawah panel). */
  function setActive(i, label) {
    players.forEach(function (_, k) {
      var pl = $("pl" + k); if (!pl) return;
      pl.classList.toggle("on", k === i);
      if (k === i && label) pl.querySelector(".tg").textContent = label;
    });
  }
  function setBabak(n) { $("babak").textContent = n; }
  function setRollEnabled(on) { $("bRoll").disabled = !on; }

  /* ---------- log ---------- */
  function log(msg, player) {
    var d = document.createElement("div"), lb = $("lb");
    d.className = "l" + (player == null ? 9 : player); d.textContent = msg;
    lb.appendChild(d); lb.scrollTop = lb.scrollHeight;
  }
  function clearLog() { $("lb").innerHTML = ""; }
  function openLog() { $("log").classList.remove("hide"); $("bLog").classList.remove("show"); }
  function closeLog() { $("log").classList.add("hide"); $("bLog").classList.add("show"); }

  /* ---------- modal umum (Kartu Saya & Pengaturan) ---------- */
  function openModal(t) { $("mt").textContent = t; $("ov").classList.add("show"); beep(520, .08); }
  function closeModal() { modal = null; $("ov").classList.remove("show"); }

  /* ---------- Kartu Saya ---------- */
  /** cards = [{id, image, usable, note?, useLabel?}] — kartu simpanan pemain utama */
  function setHand(cards) {
    hand = cards || [];
    var c = $("cc"); c.textContent = hand.length; c.style.display = hand.length ? "grid" : "none";
    if (modal === "kartu") renderKartu();
  }
  function renderKartu() {
    var mb = $("mb");
    mb.innerHTML = hand.length
      ? '<div class="grid g2">' + hand.map(function (c, i) {
        return '<div class="kc"><img alt="" src="' + esc(c.image) + '" data-v="' + i + '"><button class="btn" data-i="' + i + '" ' + (c.usable ? "" : "disabled") + '>' +
          esc(c.usable ? (c.useLabel || "Pakai sekarang") : (c.note || "Disimpan")) + '</button></div>';
      }).join("") + "</div>"
      : '<div class="empty">' + config.emptyKartu + "</div>";
    Array.prototype.forEach.call(mb.querySelectorAll("[data-v]"), function (im) {
      im.onclick = function () { showCard({ front: hand[+im.dataset.v].image, cap: "Kartu tersimpan", btns: [["Tutup", 1]] }); };
    });
    Array.prototype.forEach.call(mb.querySelectorAll("[data-i]"), function (b) {
      b.onclick = function () { emit("useCard", +b.dataset.i, hand[+b.dataset.i]); };
    });
  }
  function openKartu() { modal = "kartu"; openModal("Kartu Saya"); renderKartu(); emit("kartuOpen"); }

  /* ---------- Pengaturan ---------- */
  function renderSettings() {
    var items = [["sound", "Efek suara", "🔊"], ["music", "Musik latar", "🎵"], ["vibrate", "Getar", "📳"], ["fast", "Animasi cepat", "⚡"]], mb = $("mb");
    mb.innerHTML = '<div class="row"><div class="ic">👥</div><div class="tx">Jumlah pemain<small>' + config.minPlayers + "–" + config.maxPlayers + ' pemain, permainan diulang</small></div>' +
      '<div class="st"><button class="btn" data-n="-1">−</button><b id="np">' + NP + '</b><button class="btn" data-n="1">+</button></div></div>' +
      items.map(function (it) {
        return '<div class="row"><div class="ic">' + it[2] + '</div><div class="tx">' + it[1] + '</div><button class="sw ' + (settings[it[0]] ? "on" : "") + '" data-k="' + it[0] + '" aria-label="' + it[1] + '"></button></div>';
      }).join("");
    Array.prototype.forEach.call(mb.querySelectorAll("[data-k]"), function (b) {
      b.onclick = function () { var k = b.dataset.k; settings[k] = !settings[k]; b.classList.toggle("on"); beep(600, .06); emit("setting", k, settings[k]); };
    });
    Array.prototype.forEach.call(mb.querySelectorAll("[data-n]"), function (b) {
      b.onclick = function () {
        var n = Math.min(config.maxPlayers, Math.max(config.minPlayers, NP + (+b.dataset.n)));
        if (n !== NP) { NP = n; $("np").textContent = n; beep(520, .06); emit("playerCount", n); }
      };
    });
  }
  function openSettings() { modal = "setting"; openModal("Pengaturan"); renderSettings(); emit("settingsOpen"); }
  function setPlayerCount(n) { NP = n; var e = $("np"); if (e) e.textContent = n; }

  /* ---------- popup kartu (ambil kartu / beli properti / zoom) ---------- */
  /** opts: {front, back?, cap, sub?, btns:[[label,value]...], auto?(ms), port?}  → Promise(value tombol) */
  function showCard(o) {
    return new Promise(function (res) {
      var cv = $("cv"), cb = $("cb"), done = false, btns = o.btns || [["OK", 1]];
      $("ccap").innerHTML = esc(o.cap || "") + (o.sub ? "<small>" + esc(o.sub) + "</small>" : "");
      $("cw").innerHTML = o.back
        ? '<div class="fl"><img class="bk" alt="" src="' + esc(o.back) + '"><img class="ft" alt="" src="' + esc(o.front) + '"></div>'
        : '<img class="pc" alt="" src="' + esc(o.front) + '">';
      cb.innerHTML = "";
      var end = function (v) { if (done) return; done = true; cv.classList.remove("show"); res(v); };
      cv._end = end;
      btns.forEach(function (b) {
        var el = document.createElement("button"); el.className = "btn"; el.textContent = b[0]; el.onclick = function () { end(b[1]); }; cb.appendChild(el);
      });
      cv.classList.add("show"); beep(700, .1);
      if (o.auto) setTimeout(function () { end(btns.length ? btns[0][1] : 1); }, settings.fast ? o.auto * .65 : o.auto);
    });
  }
  function closeCard(v) { var cv = $("cv"); if (cv._end) cv._end(v == null ? null : v); }

  /* ---------- popup Aset Saya ---------- */
  /** a = {cash, count, total, value, items:[{id, name, image}]} — dipanggil game setiap data berubah (realtime) */
  function setAssets(a) { assets = a; if (asOpen) refreshAssets(); }
  function refreshAssets() {
    $("asM").innerHTML = "Uang Anda: <b>" + fmt(assets.cash) + "</b>";
    $("asN").innerHTML = "Total Properti: <b>" + assets.count + config.totalLabel + assets.total + "</b>";
    $("asV").innerHTML = "Total Nilai Aset: <b>" + fmt(assets.value) + "</b>";
    var key = assets.items.map(function (t) { return t.id; }).join(",");
    if (key === asKey) return; asKey = key;                    // daftar tidak dibangun ulang kalau item sama (scroll tetap)
    $("asC").innerHTML = assets.items.length ? assets.items.map(function (t) {
      return '<div class="ai"><img class="cd" data-id="' + esc(t.id) + '" alt="' + esc(t.name) + '" draggable="false" src="' + esc(t.image) + '">' +
        '<img class="bx" alt="Tanah Kosong" draggable="false" src="' + config.img.asetKosong + '">' +
        '<div class="bt"><button data-a="gadai" data-id="' + esc(t.id) + '" aria-label="Gadai"><img alt="" src="' + config.img.asetGadai + '"></button>' +
        '<button data-a="bangun" data-id="' + esc(t.id) + '" aria-label="Bangun"><img alt="" src="' + config.img.asetBangun + '"></button></div></div>';
    }).join("") : '<div class="asempty">' + config.emptyAset + "</div>";
  }
  function openAssets() { asOpen = true; asKey = null; $("as").classList.add("show"); refreshAssets(); $("asC").scrollLeft = 0; beep(520, .08); emit("assetOpen"); }
  function closeAssets() { if (!asOpen) return; asOpen = false; $("as").classList.remove("show"); emit("assetClose"); }
  function findItem(id) { for (var i = 0; i < assets.items.length; i++) if (String(assets.items[i].id) === String(id)) return assets.items[i]; }

  /* ---------- toast ---------- */
  function toast(msg, ms) {
    var t = $("toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTm); toastTm = setTimeout(function () { t.classList.remove("on"); }, ms || 1800);
  }

  /* ---------- inisialisasi & pengikatan tombol ---------- */
  function init() {
    fit(); addEventListener("resize", fit);
    diceEls().forEach(function (d) { for (var i = 0; i < 9; i++) d.appendChild(document.createElement("i")); });
    showDice(3, 4);

    $("bRoll").onclick = function () { if (!this.disabled) emit("roll"); };
    $("bKartu").onclick = openKartu;
    $("bAset").onclick = openAssets;
    $("bSet").onclick = openSettings;
    $("xLog").onclick = closeLog; $("bLog").onclick = openLog;
    $("xMd").onclick = closeModal; $("ov").onclick = function (e) { if (e.target === this) closeModal(); };
    $("asX").onclick = closeAssets; $("as").onclick = function (e) { if (e.target === this) closeAssets(); };

    addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeModal(); closeAssets(); }
      if ((e.key === " " || e.key === "Enter") && !$("bRoll").disabled && !modal && !asOpen && !$("cv").classList.contains("show")) { e.preventDefault(); emit("roll"); }
    });

    /* daftar aset: scroll mendatar (roda mouse / drag), klik kartu, tombol Gadai & Bangun */
    var c = $("asC"), dn = false, sx = 0, sl = 0, mv = false, sc = 1;
    c.addEventListener("wheel", function (e) { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { c.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
    c.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse" || e.button) return; dn = true; mv = false; sx = e.clientX; sl = c.scrollLeft; sc = c.getBoundingClientRect().width / c.offsetWidth || 1; });
    addEventListener("pointermove", function (e) { if (!dn) return; var d = (e.clientX - sx) / sc; if (Math.abs(d) > 4) mv = true; if (mv) c.scrollLeft = sl - d; });
    addEventListener("pointerup", function () { dn = false; });
    c.addEventListener("click", function (e) {
      if (mv) { mv = false; return; }
      var cd = e.target.closest(".cd");
      if (cd) { var it = findItem(cd.dataset.id); if (it) showCard({ front: it.image, port: 1, cap: it.name, sub: it.sub || "", btns: [["Tutup", 1]] }); return; }
      var b = e.target.closest("[data-a]");
      if (b) {
        var n = emit(b.dataset.a, b.dataset.id, findItem(b.dataset.id));      // event: "gadai" / "bangun"
        if (!n) toast("Fitur " + (b.dataset.a === "gadai" ? "Gadai" : "Bangun") + " belum dihubungkan ke game");
      }
    });
  }

  /* ---------- API publik ---------- */
  global.MUI = {
    version: "1.0.0", config: config, settings: settings, SKINS: SKINS,
    fmt: fmt, beep: beep, toast: toast,
    /* event: roll, useCard(index,card), setting(key,value), playerCount(n), gadai(id,item), bangun(id,item),
              assetOpen, assetClose, kartuOpen, settingsOpen */
    on: function (ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); return this; },
    off: function (ev, fn) { listeners[ev] = (listeners[ev] || []).filter(function (f) { return f !== fn; }); return this; },
    /* pemain & status */
    setPlayers: setPlayers, setMoney: setMoney, setActive: setActive, setBabak: setBabak, setRollEnabled: setRollEnabled, setPlayerCount: setPlayerCount,
    /* dadu */
    rollDice: rollDice, cancelRoll: cancelRoll, showDice: showDice,
    /* log */
    log: log, clearLog: clearLog, openLog: openLog, closeLog: closeLog,
    /* kartu, aset, popup */
    setHand: setHand, openKartu: openKartu, setAssets: setAssets, openAssets: openAssets, closeAssets: closeAssets,
    showCard: showCard, closeCard: closeCard, openSettings: openSettings, closeModal: closeModal
  };

  init();
})(window);
