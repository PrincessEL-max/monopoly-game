// ============================================================
// useSound.js — Efek suara ringan via Web Audio API (tanpa file).
//
// Menghasilkan nada sederhana dengan OscillatorNode sehingga tidak
// perlu aset audio. Mengembalikan { play, enabled, toggle }.
//   play('dice' | 'buy' | 'money' | 'rent' | 'jail' | 'win' | 'lose' | 'click')
//
// AudioContext dibuat lazy pada interaksi pertama (kebijakan autoplay
// browser). Preferensi on/off disimpan di localStorage.
// ============================================================

import { useRef, useState, useCallback } from 'react';

const PREF_KEY = 'monopoli:sound:v1';
const VOLUME_KEY = 'monopoli:sound-volume:v1';

const readPref = () => {
  try {
    const v = window.localStorage.getItem(PREF_KEY);
    return v == null ? true : v === '1';
  } catch { return true; }
};

const readVolume = () => {
  try {
    const stored = window.localStorage.getItem(VOLUME_KEY);
    if (stored == null) return 0.7;
    const volume = Number(stored);
    return Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.7;
  } catch { return 0.7; }
};

// Definisi nada: urutan [frekuensi Hz, durasi detik, tipe]
const TONES = {
  click: [[440, 0.05, 'square']],
  dice:  [[220, 0.06, 'square'], [180, 0.06, 'square'], [260, 0.08, 'square']],
  buy:   [[523, 0.1, 'sine'], [659, 0.1, 'sine'], [784, 0.14, 'sine']],
  money: [[784, 0.08, 'sine'], [988, 0.12, 'sine']],
  rent:  [[330, 0.12, 'triangle'], [247, 0.16, 'triangle']],
  jail:  [[200, 0.18, 'sawtooth'], [150, 0.22, 'sawtooth']],
  win:   [[523, 0.12, 'sine'], [659, 0.12, 'sine'], [784, 0.12, 'sine'], [1047, 0.26, 'sine']],
  lose:  [[392, 0.16, 'sawtooth'], [294, 0.16, 'sawtooth'], [196, 0.3, 'sawtooth']],
};

export const useSound = () => {
  const ctxRef = useRef(null);
  const [enabled, setEnabled] = useState(readPref);
  const [volume, setVolume] = useState(readVolume);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctxRef.current = new AC();
    }
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const play = useCallback((name) => {
    if (!enabled || volume <= 0) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const seq = TONES[name] || TONES.click;

    let t = ctx.currentTime;
    for (const [freq, dur, type] of seq) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      // Envelope sederhana agar tidak "klik"
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18 * volume, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
      t += dur;
    }
  }, [enabled, ensureCtx, volume]);

  const setSoundEnabled = useCallback((value) => {
    setEnabled((prev) => {
      const next = typeof value === 'function' ? value(prev) : Boolean(value);
      try { window.localStorage.setItem(PREF_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const toggle = useCallback(() => setSoundEnabled((prev) => !prev), [setSoundEnabled]);

  const setSoundVolume = useCallback((value) => {
    const next = Math.min(1, Math.max(0, Number(value) || 0));
    try { window.localStorage.setItem(VOLUME_KEY, String(next)); } catch { /* ignore */ }
    setVolume(next);
  }, []);

  return {
    play,
    enabled,
    toggle,
    setEnabled: setSoundEnabled,
    volume,
    setVolume: setSoundVolume,
  };
};