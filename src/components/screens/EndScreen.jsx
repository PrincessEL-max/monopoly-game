// ============================================================
// EndScreen.jsx — Layar akhir: pemenang + peringkat kekayaan.
// ============================================================

import React from 'react';
import { calcNetWorth } from '../../logic/rentLogic';
import { PLAYER_COLORS } from '../board/Board';

const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';

export default function EndScreen({ game, onRestart }) {
  const { players, winner, turnCount, startedAt } = game;

  const ranked = [...players]
    .map((p) => ({ ...p, worth: calcNetWorth(p, game) }))
    .sort((a, b) => {
      if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1; // aktif di atas
      return b.worth - a.worth;
    });

  const champ = players.find((p) => p.id === winner) ?? ranked[0];

  // ── Statistik ringkas (Prioritas 3) ──────────────────────────
  const durationMs = startedAt ? Date.now() - startedAt : 0;
  const mins = Math.floor(durationMs / 60000);
  const secs = Math.floor((durationMs % 60000) / 1000);
  const durLabel = startedAt ? `${mins}m ${secs}d` : '—';

  const richest = [...players].sort(
    (a, b) => (b.stats?.peakMoney ?? 0) - (a.stats?.peakMoney ?? 0)
  )[0];
  const tycoon = [...players].sort(
    (a, b) => (b.stats?.maxProps ?? 0) - (a.stats?.maxProps ?? 0)
  )[0];

  return (
    <div className="end-screen">
      <div className="end-card">
        <div className="end-crown">👑</div>
        <h1 className="end-title">{champ?.name} Menang!</h1>
        <div
          className="end-piece"
          style={{ background: PLAYER_COLORS[champ?.id] ?? '#999' }}
        >
          {champ?.piece}
        </div>

        <div className="end-rank">
          {ranked.map((p, i) => (
            <div className="end-rank-row" key={p.id}>
              <span className="end-rank-pos">#{i + 1}</span>
              <span
                className="end-rank-dot"
                style={{ background: PLAYER_COLORS[p.id] ?? '#999' }}
              />
              <span className="end-rank-name">
                {p.piece} {p.name}
                {p.isAI ? ' 🤖' : ''}
                {p.bankrupt ? ' (bangkrut)' : ''}
              </span>
              <span className="end-rank-worth">${fmt(p.worth)}</span>
            </div>
          ))}
        </div>

        <div className="end-stats">
          <div className="end-stat">
            <span className="end-stat-label">Durasi</span>
            <span className="end-stat-val">{durLabel}</span>
          </div>
          <div className="end-stat">
            <span className="end-stat-label">Total Giliran</span>
            <span className="end-stat-val">{turnCount ?? 0}</span>
          </div>
          <div className="end-stat">
            <span className="end-stat-label">💰 Kas Puncak</span>
            <span className="end-stat-val">
              {richest?.name} (${fmt(richest?.stats?.peakMoney ?? 0)})
            </span>
          </div>
          <div className="end-stat">
            <span className="end-stat-label">🏘 Properti Terbanyak</span>
            <span className="end-stat-val">
              {tycoon?.name} ({tycoon?.stats?.maxProps ?? 0})
            </span>
          </div>
        </div>

        <button className="btn btn-gold" onClick={onRestart}>
          Main Lagi
        </button>
      </div>
    </div>
  );
}