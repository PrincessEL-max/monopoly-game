// ============================================================
// CardModal.jsx — Modal kartu Kesempatan & Dana Umum.
// Dua fase memakai komponen yang sama supaya animasi FLIP jalan:
//   • waitingFor === 'DRAW_CARD'  → petunjuk non-blocking; kartu di papan diklik
//   • waitingFor === 'APPLY_CARD' → kartu terbang dari tumpukan lalu terbuka
// ============================================================

import React, { useLayoutEffect, useRef, useState } from 'react';
import { useLandingDelay } from '../../hooks/useLandingDelay';
import { LANDMARK_IMAGES } from '../../constants/images';

const DECKS = {
  chance: { label: 'Kesempatan', color: '#e0801b', back: LANDMARK_IMAGES.card_chance_back },
  chest:  { label: 'Dana Umum', color: '#2f7d8a', back: LANDMARK_IMAGES.card_chest_back },
};

export default function CardModal({ game, cardFlight, onCardFlightComplete }) {
  const {
    waitingFor, landResult, activeCard, currentPlayer, applyCard, usePowerUp,
  } = game;

  const active = waitingFor === 'DRAW_CARD' || waitingFor === 'APPLY_CARD';
  const isHuman = !currentPlayer?.isAI;

  // Tunda hanya saat baru mendarat (DRAW_CARD) supaya animasi jalan terlihat.
  // APPLY_CARD (setelah ambil kartu) tidak perlu menunggu.
  const gateActive = active && isHuman && waitingFor === 'DRAW_CARD';
  const ready = useLandingDelay(game, gateActive);

  // Tentukan deck (chance / chest) dari kartu aktif atau dari petak
  const isChance = activeCard
    ? String(activeCard.id).startsWith('kes_') || String(activeCard.id).startsWith('khusus_')
    : landResult?.square?.type === 'chance';
  const deck = isChance ? DECKS.chance : DECKS.chest;
  const deckType = isChance ? 'chance' : 'chest';
  const flightMatches = waitingFor === 'APPLY_CARD' &&
    !!activeCard &&
    cardFlight?.deck === deckType;
  const [flightStyle, setFlightStyle] = useState(null);
  const [completedFlightId, setCompletedFlightId] = useState(null);
  const sceneRef = useRef(null);

  useLayoutEffect(() => {
    if (!flightMatches || completedFlightId === cardFlight.id) {
      setFlightStyle(null);
      return undefined;
    }

    const target = sceneRef.current?.getBoundingClientRect();
    const source = cardFlight.rect;
    if (!target || !source) {
      setCompletedFlightId(cardFlight.id);
      onCardFlightComplete?.(cardFlight.id);
      return undefined;
    }

    const stage = sceneRef.current.closest('.game-stage');
    const stageScale = stage?.offsetWidth
      ? stage.getBoundingClientRect().width / stage.offsetWidth
      : 1;
    setFlightStyle({
      '--card-flight-x': `${(source.left + source.width / 2 - target.left - target.width / 2) / stageScale}px`,
      '--card-flight-y': `${(source.top + source.height / 2 - target.top - target.height / 2) / stageScale}px`,
      '--card-flight-scale-x': source.width / target.width,
      '--card-flight-scale-y': source.height / target.height,
    });

    const timeout = window.setTimeout(() => {
      setCompletedFlightId(cardFlight.id);
      setFlightStyle(null);
      onCardFlightComplete?.(cardFlight.id);
    }, 720);
    return () => window.clearTimeout(timeout);
  }, [flightMatches, cardFlight?.id, activeCard?.id, completedFlightId, onCardFlightComplete]);

  if (!active || !isHuman) return null;
  if (waitingFor === 'DRAW_CARD') {
    if (!ready) return null;
    return (
      <div className="card-draw-prompt" role="status">
        <strong>{deck.label}</strong>
        <span>Klik tumpukan kartu di papan untuk membuka.</span>
      </div>
    );
  }

  const isFlying = flightMatches && completedFlightId !== cardFlight.id;
  const revealed = waitingFor === 'APPLY_CARD' && !!activeCard && !isFlying;
  const insuranceCard = currentPlayer.powerUps?.find(
    (card) => card.action === 'power_insurance'
  );
  const insuranceCanCancel = ['pay', 'repairs'].includes(activeCard?.type);

  return (
    <div className="modal-overlay">
      <div className="modal cardm">
        <div className="modal-head">
          <h3 className="modal-title">{deck.label}</h3>
        </div>

        <div className="modal-body">
          <div
            className={`flip-scene${isFlying && flightStyle ? ' flip-scene--flying' : ''}`}
            ref={sceneRef}
            style={flightStyle || undefined}
          >
            <div
              className={`flip-card ${revealed ? 'is-flipped' : ''}`}
              style={{ '--deck': deck.color }}
            >
              {/* Sisi belakang (tertutup) */}
              <div className="flip-face flip-back" style={{ '--deck': deck.color }}>
                <img src={deck.back} alt="" draggable={false} />
              </div>

              {/* Sisi depan (terbuka) */}
              <div className="flip-face flip-front" style={{ '--deck': deck.color }}>
                <img
                  src={`/millionaire-game/assets/cards/${activeCard?.id}.webp`}
                  alt={activeCard?.text || deck.label}
                  draggable={false}
                />
              </div>
            </div>
          </div>

          <div className="cardm-hint">
            {isFlying ? 'Kartu sedang terbang ke layar…' : 'Efek kartu akan diterapkan.'}
          </div>
        </div>

        <div className="modal-foot">
          {revealed ? (
            <>
              {insuranceCanCancel && insuranceCard && (
                <button
                  className="btn btn-ghost"
                  onClick={() => usePowerUp({ cardId: insuranceCard.id })}
                >
                  Aktifkan Asuransi
                </button>
              )}
              <button className="btn btn-gold" onClick={applyCard}>Terapkan Kartu</button>
            </>
          ) : (
            <span className="cardm-opening">Membuka kartu…</span>
          )}
        </div>
      </div>
    </div>
  );
}