// ============================================================
// DiceDisplay.jsx — Tampilan dua dadu dengan titik (pip).
// Props: roll = { d1, d2, total, isDouble } | null
//
// Upgrade P2: animasi "menggelinding" — saat nilai roll berubah,
// dadu menampilkan angka acak yang berganti cepat selama
// ANIMATION.DICE_ROLL_DURATION sebelum mengunci nilai final.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { ANIMATION } from '../../constants/config';

// Indeks titik aktif pada grid 3×3 (0–8) untuk tiap angka 1–6
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value, rolling }) {
  const active = new Set(PIPS[value] || []);
  return (
    <div className={`die${rolling ? ' die--rolling' : ''}`} aria-label={`Dadu ${value}`}>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className={`die-pip${active.has(i) ? ' die-pip--on' : ''}`} />
      ))}
    </div>
  );
}

export default function DiceDisplay({ roll }) {
  const [display, setDisplay] = useState({ d1: 1, d2: 1 });
  const [rolling, setRolling] = useState(false);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  // Tandai roll yang sudah dianimasikan agar tidak mengulang
  const lastKeyRef = useRef(null);

  useEffect(() => {
    if (!roll) {
      lastKeyRef.current = null;
      return;
    }
    // Kunci unik per lemparan: pakai referensi objek roll (selalu baru tiap dispatch)
    const key = `${roll.d1}-${roll.d2}-${roll.total}-${Math.random()}`;
    // Hanya animasikan saat roll benar-benar berganti
    if (roll === lastKeyRef.current) return;
    lastKeyRef.current = roll;

    setRolling(true);
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);

    // Ganti angka acak tiap 70ms selama durasi
    intervalRef.current = setInterval(() => {
      setDisplay({
        d1: 1 + Math.floor(Math.random() * 6),
        d2: 1 + Math.floor(Math.random() * 6),
      });
    }, 70);

    // Kunci nilai final
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      setDisplay({ d1: roll.d1, d2: roll.d2 });
      setRolling(false);
    }, ANIMATION.DICE_ROLL_DURATION);

    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, [roll]);

  if (!roll) {
    return (
      <div className="dice-wrap">
        <div className="die die--empty">?</div>
        <div className="die die--empty">?</div>
      </div>
    );
  }

  return (
    <div className="dice-wrap">
      <Die value={display.d1} rolling={rolling} />
      <Die value={display.d2} rolling={rolling} />
      <div className="dice-total">
        {rolling ? '…' : <>= {roll.total}</>}
        {!rolling && roll.isDouble && <span className="dice-double">DOUBLE!</span>}
      </div>
    </div>
  );
}