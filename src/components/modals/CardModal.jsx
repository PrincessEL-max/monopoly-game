// ============================================================
// CardModal.jsx — Modal kartu Kesempatan & Dana Umum.
// Dua fase memakai komponen yang sama supaya animasi FLIP jalan:
//   • waitingFor === 'DRAW_CARD'  → kartu tertutup, tombol "Ambil Kartu"
//   • waitingFor === 'APPLY_CARD' → kartu terbuka (flip), tombol "Terapkan"
//
// Karena modal tetap ter-mount saat berpindah fase, kelas .is-flipped
// memicu transisi rotateY 180° dari sisi belakang ke sisi depan.
// ============================================================

import React from 'react';
import { useLandingDelay } from '../../hooks/useLandingDelay';

const DECKS = {
  chance: { label: 'Kesempatan', emblem: '❓', color: '#e0801b' },
  chest:  { label: 'Dana Umum',  emblem: '🎁', color: '#2f7d8a' },
};

export default function CardModal({ game }) {
  const { waitingFor, landResult, activeCard, currentPlayer, drawCard, applyCard } = game;

  const active = waitingFor === 'DRAW_CARD' || waitingFor === 'APPLY_CARD';
  const isHuman = !currentPlayer?.isAI;

  // Tunda hanya saat baru mendarat (DRAW_CARD) supaya animasi jalan terlihat.
  // APPLY_CARD (setelah ambil kartu) tidak perlu menunggu.
  const gateActive = active && isHuman && waitingFor === 'DRAW_CARD';
  const ready = useLandingDelay(game, gateActive);

  if (!active || !isHuman) return null;
  if (waitingFor === 'DRAW_CARD' && !ready) return null;

  // Tentukan deck (chance / chest) dari kartu aktif atau dari petak
  const isChance = activeCard
    ? String(activeCard.id).startsWith('c')
    : landResult?.square?.type === 'chance';
  const deck = isChance ? DECKS.chance : DECKS.chest;

  const revealed = waitingFor === 'APPLY_CARD' && !!activeCard;

  return (
    <div className="modal-overlay">
      <div className="modal cardm">
        <div className="modal-head">
          <h3 className="modal-title">{deck.label}</h3>
        </div>

        <div className="modal-body">
          <div className="flip-scene">
            <div
              className={`flip-card ${revealed ? 'is-flipped' : ''}`}
              style={{ '--deck': deck.color }}
            >
              {/* Sisi belakang (tertutup) */}
              <div className="flip-face flip-back" style={{ '--deck': deck.color }}>
                <span className="flip-back-emblem">{deck.emblem}</span>
                <span className="flip-back-label">{deck.label}</span>
              </div>

              {/* Sisi depan (terbuka) */}
              <div className="flip-face flip-front" style={{ '--deck': deck.color }}>
                <div className="flip-front-head">{deck.label}</div>
                <div className="flip-front-emblem">{deck.emblem}</div>
                <p className="flip-front-text">
                  {activeCard ? activeCard.text : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="cardm-hint">
            {revealed ? 'Efek kartu akan diterapkan.' : 'Ambil satu kartu dari tumpukan.'}
          </div>
        </div>

        <div className="modal-foot">
          {revealed ? (
            <button className="btn btn-gold" onClick={applyCard}>
              Terapkan Kartu
            </button>
          ) : (
            <button className="btn btn-gold" onClick={drawCard}>
              Ambil Kartu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}