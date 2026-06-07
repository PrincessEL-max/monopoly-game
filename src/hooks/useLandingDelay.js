// ============================================================
// useLandingDelay.js — Tahan kemunculan modal "landing" (Buy/Card)
// sampai animasi jalan bidak selesai.
//
// Masalah: reducer langsung set waitingFor saat ROLL_DICE, padahal
// PlayerPiece masih melangkah petak-demi-petak. Hook ini menghitung
// durasi animasi dari jumlah langkah (lastRoll.total) lalu menahan
// `ready=false` selama itu, sehingga modal baru tampil setelah bidak
// tiba di tujuan.
//
// Hanya menunda untuk gerak NORMAL (1..12 langkah maju) — sama dengan
// ambang animasi di PlayerPiece. Lompatan kartu/penjara (teleport)
// tidak dianimasikan, jadi tidak ditunda.
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { ANIMATION } from '../constants/config';

const STEP_MS = ANIMATION.PIECE_MOVE_DURATION;
const SETTLE_MS = 120; // jeda kecil setelah langkah terakhir

/**
 * @param {Object} game — state dari useGameState
 * @param {boolean} active — apakah modal pemicu sedang relevan
 *        (mis. waitingFor === 'BUY_DECISION')
 * @returns {boolean} ready — true jika modal boleh tampil
 */
export const useLandingDelay = (game, active) => {
  const { lastRoll, waitingFor } = game;
  const [ready, setReady] = useState(false);
  const timerRef = useRef(null);
  // Kunci roll terakhir yang sudah kita tunda, agar tidak menunda ulang
  const handledRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }

    // Roll yang sama & sudah diproses → langsung tampilkan
    if (handledRef.current === lastRoll) {
      setReady(true);
      return;
    }
    handledRef.current = lastRoll;

    const steps = lastRoll?.total ?? 0;
    const isNormalMove = steps > 0 && steps <= 12;

    if (!isNormalMove) {
      setReady(true); // teleport / tak ada gerak → tanpa tunda
      return;
    }

    // Tahan selama durasi melangkah, lalu buka
    setReady(false);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setReady(true);
    }, steps * STEP_MS + SETTLE_MS);

    return () => clearTimeout(timerRef.current);
  }, [active, lastRoll, waitingFor]);

  return ready;
};