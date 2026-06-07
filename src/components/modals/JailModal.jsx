// ============================================================
// JailModal.jsx — Modal opsi saat pemain berada di penjara.
// Muncul di awal giliran pemain manusia yang inJail (canRoll, belum
// ada waitingFor). Opsi: lempar (coba double), bayar denda, atau
// pakai Kartu Bebas Penjara bila punya.
// ============================================================

import React from 'react';
import { RULES } from '../../constants/config';

const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';

export default function JailModal({ game }) {
  const { phase, currentPlayer, canRoll, waitingFor,
          rollDice, payJailFine, useJailFreeCard } = game;

  if (phase !== 'playing') return null;
  if (!currentPlayer?.inJail || !canRoll || waitingFor) return null;
  if (currentPlayer.isAI) return null;

  const turn = currentPlayer.jailTurns; // 0..MAX
  const canPay = currentPlayer.money >= RULES.JAIL_FINE;
  const freeSource =
    currentPlayer.jailFreeCards.chance > 0 ? 'chance'
    : currentPlayer.jailFreeCards.community_chest > 0 ? 'community_chest'
    : null;
  const lastChance = turn >= RULES.JAIL_TURNS_MAX - 1;

  const dots = Array.from({ length: RULES.JAIL_TURNS_MAX }, (_, i) => i < turn);

  return (
    <div className="modal-overlay">
      <div className="modal jailm">
        <div className="modal-head">
          <h3 className="modal-title">Di Penjara</h3>
        </div>

        <div className="modal-body">
          <div className="jail-bars">🚔</div>
          <p className="jail-status">
            <strong>{currentPlayer.name}</strong> sedang ditahan.<br />
            Lempar <strong>double</strong> untuk bebas, atau bayar denda.
          </p>

          <div className="jail-turns" title="Percobaan terpakai">
            {dots.map((used, i) => (
              <span key={i} className={`jail-dot ${used ? 'jail-dot--used' : ''}`} />
            ))}
          </div>
          {lastChance && (
            <p className="modal-note">
              Ini percobaan terakhir — jika gagal double kamu wajib membayar
              denda <strong>${fmt(RULES.JAIL_FINE)}</strong>.
            </p>
          )}

          <div className="jail-opts" style={{ marginTop: 14 }}>
            <button className="btn btn-primary" onClick={rollDice}>
              🎲 Lempar Dadu (coba double)
            </button>
            <button
              className="btn btn-gold"
              disabled={!canPay}
              onClick={payJailFine}
            >
              Bayar Denda ${fmt(RULES.JAIL_FINE)}
            </button>
            {freeSource && (
              <button
                className="btn btn-success"
                onClick={() => useJailFreeCard(freeSource)}
              >
                Pakai Kartu Bebas Penjara 🎟️
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}