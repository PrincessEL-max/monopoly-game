// ============================================================
// SetupScreen.jsx — Layar awal: pilih jumlah pemain, nama,
// bidak, status AI, dan tingkat kesulitan AI.
// onStart(setups) → setups: [{ name, piece, isAI }]
// ============================================================

import React, { useState } from 'react';
import { PLAYER_CONFIG } from '../../constants/config';

const { PIECE_ICONS, DEFAULT_NAMES, MIN_PLAYERS, MAX_PLAYERS } = PLAYER_CONFIG;

const DIFF_LABEL = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' };

export default function SetupScreen({ difficulty, onChangeDifficulty, onStart, savedInfo, onContinue }) {
  const [count, setCount] = useState(2);
  const [players, setPlayers] = useState(() =>
    DEFAULT_NAMES.map((name, i) => ({
      name,
      piece: PIECE_ICONS[i],
      isAI: i !== 0, // Pemain 1 = manusia, sisanya AI sebagai default
    }))
  );

  const update = (i, patch) =>
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const start = () => {
    const setups = players.slice(0, count).map((p, i) => ({
      name: p.name.trim() || DEFAULT_NAMES[i],
      piece: p.piece,
      isAI: p.isAI,
    }));
    onStart(setups);
  };

  const countOptions = Array.from(
    { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
    (_, k) => MIN_PLAYERS + k
  );

  return (
    <div className="setup-screen">
      <div className="setup-card">
        <h1 className="brand-logo">M·O·N·O·P·O·L·Y</h1>
        <p className="brand-sub">All New International</p>

        <div className="setup-section">
          <span className="setup-label">Jumlah Pemain</span>
          <div className="chip-row">
            {countOptions.map((n) => (
              <button
                key={n}
                className={`chip${count === n ? ' chip--active' : ''}`}
                onClick={() => setCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="setup-players">
          {players.slice(0, count).map((p, i) => (
            <div className="setup-player" key={i}>
              <input
                className="setup-name"
                value={p.name}
                maxLength={16}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder={DEFAULT_NAMES[i]}
              />
              <div className="setup-pieces">
                {PIECE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    className={`piece-pick${p.piece === ic ? ' piece-pick--active' : ''}`}
                    onClick={() => update(i, { piece: ic })}
                    title="Pilih bidak"
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <label className={`ai-toggle${p.isAI ? ' ai-toggle--on' : ''}`}>
                <input
                  type="checkbox"
                  checked={p.isAI}
                  onChange={(e) => update(i, { isAI: e.target.checked })}
                />
                {p.isAI ? '🤖 AI' : '👤 Manusia'}
              </label>
            </div>
          ))}
        </div>

        <div className="setup-section">
          <span className="setup-label">Tingkat AI</span>
          <div className="chip-row">
            {['easy', 'medium', 'hard'].map((d) => (
              <button
                key={d}
                className={`chip${difficulty === d ? ' chip--active' : ''}`}
                onClick={() => onChangeDifficulty(d)}
              >
                {DIFF_LABEL[d]}
              </button>
            ))}
          </div>
        </div>

        {savedInfo && (
          <div className="resume-banner">
            <div className="resume-info">
              <strong>Permainan tersimpan</strong>
              <span>
                {savedInfo.players.map((p) => `${p.piece} ${p.name}`).join(' · ')}
                {' '}— giliran ke-{savedInfo.turnCount}
              </span>
            </div>
            <button className="btn btn-success btn-resume" onClick={onContinue}>
              ▶ Lanjutkan
            </button>
          </div>
        )}

        <button className="btn btn-gold btn-start" onClick={start}>
          {savedInfo ? 'Mulai Permainan Baru' : 'Mulai Permainan'}
        </button>
      </div>
    </div>
  );
}