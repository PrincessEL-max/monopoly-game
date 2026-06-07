// ============================================================
// TradeModal.jsx — Negosiasi antar pemain.
//
// Dua tampilan dalam satu modal:
//   1) COMPOSE  (dibuka dari ControlPanel via prop `open`)
//      Pemain manusia memilih lawan, properti yang ditawarkan &
//      diminta, plus uang dua arah, lalu mengajukan tawaran.
//   2) RESPONSE (digerakkan state: waitingFor === 'TRADE_RESPONSE')
//      Menampilkan ringkasan tawaran. Bila lawan AI, modal otomatis
//      mengevaluasi dengan aiEvaluateTrade. Bila lawan manusia
//      (mode hotseat), tampilkan tombol Terima / Tolak.
//
// Memakai aksi yang sudah ada: proposeTrade / acceptTrade / rejectTrade.
// Properti yang sudah ada bangunannya tidak bisa ditradekan (mencegah
// bangunan "yatim"), sesuai aturan Monopoli.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { SQUARES, KOMPLEX_COLORS } from '../../constants/squares';
import { PLAYER_COLORS } from '../board/Board';
import { aiEvaluateTrade } from '../../logic/aiLogic';

const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';
const TYPE_BAR = { airport: '#37474f', utility: '#00838f' };

const propColor = (sq) =>
  sq.komplex ? KOMPLEX_COLORS[sq.komplex] : (TYPE_BAR[sq.type] ?? '#999');

// Properti milik `playerId` yang boleh ditradekan (tanpa bangunan)
const tradableProps = (playerId, game) =>
  SQUARES.filter(
    (s) =>
      game.owners[s.id] === playerId &&
      !(game.houses[s.id] > 0) &&
      !(game.hotels[s.id] > 0)
  );

export default function TradeModal({ game, open, onClose, difficulty = 'medium' }) {
  const { phase, players, currentPlayer, waitingFor, pendingTrade,
          proposeTrade, acceptTrade, rejectTrade } = game;

  // ── RESPONSE VIEW ────────────────────────────────────────────
  if (phase === 'playing' && waitingFor === 'TRADE_RESPONSE' && pendingTrade) {
    return (
      <TradeResponse
        game={game}
        difficulty={difficulty}
        onAccept={acceptTrade}
        onReject={rejectTrade}
      />
    );
  }

  // ── COMPOSE VIEW ─────────────────────────────────────────────
  if (!open) return null;
  return (
    <TradeCompose
      game={game}
      onClose={onClose}
      onPropose={(offer) => { proposeTrade(offer); onClose(); }}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// RESPONSE
// ─────────────────────────────────────────────────────────────

function TradeResponse({ game, difficulty, onAccept, onReject }) {
  const { players, pendingTrade } = game;
  const from = players.find((p) => p.id === pendingTrade.from);
  const to   = players.find((p) => p.id === pendingTrade.to);
  const aiDeciding = !!to?.isAI;
  const timer = useRef(null);

  // Lawan AI → evaluasi otomatis
  useEffect(() => {
    if (!aiDeciding) return;
    timer.current = setTimeout(() => {
      const accept = aiEvaluateTrade(to, pendingTrade, game, difficulty);
      accept ? onAccept() : onReject();
    }, 1100);
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const offeredNames = pendingTrade.offeredProps
    .map((id) => SQUARES.find((s) => s.id === id)?.name).filter(Boolean);
  const requestedNames = pendingTrade.requestedProps
    .map((id) => SQUARES.find((s) => s.id === id)?.name).filter(Boolean);

  return (
    <div className="modal-overlay">
      <div className="modal tradem">
        <div className="modal-head">
          <h3 className="modal-title">Tawaran Trade</h3>
        </div>

        <div className="modal-body trade-incoming">
          <div className="trade-incoming-who">
            <strong>{from?.name}</strong> menawarkan trade kepada{' '}
            <strong>{to?.name}</strong>.
          </div>

          <div className="trade-deal">
            <div className="trade-deal-box">
              <div className="trade-deal-title">{from?.name} memberi</div>
              <DealList names={offeredNames} money={pendingTrade.offeredMoney} />
            </div>
            <div className="trade-deal-arrow">⇄</div>
            <div className="trade-deal-box">
              <div className="trade-deal-title">{to?.name} memberi</div>
              <DealList names={requestedNames} money={pendingTrade.requestedMoney} />
            </div>
          </div>

          {aiDeciding && (
            <p className="modal-note" style={{ marginTop: 16 }}>
              🤖 {to?.name} sedang mempertimbangkan tawaran…
            </p>
          )}
        </div>

        {!aiDeciding && (
          <div className="modal-foot">
            <button className="btn btn-danger" onClick={onReject}>Tolak</button>
            <button className="btn btn-success" onClick={onAccept}>Terima</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DealList({ names, money }) {
  if (names.length === 0 && !money) {
    return <div className="trade-prop-empty">— tidak ada —</div>;
  }
  return (
    <ul className="rent-table" style={{ margin: 0, color: '#d6ddf2' }}>
      {names.map((n, i) => (
        <li key={i} className="rent-row" style={{ borderColor: 'rgba(255,255,255,.1)' }}>
          <span className="rent-label" style={{ color: '#d6ddf2' }}>🏠 {n}</span>
        </li>
      ))}
      {money > 0 && (
        <li className="rent-row" style={{ borderColor: 'rgba(255,255,255,.1)' }}>
          <span className="rent-label" style={{ color: 'var(--gold-2)' }}>
            💰 ${fmt(money)}
          </span>
        </li>
      )}
    </ul>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPOSE
// ─────────────────────────────────────────────────────────────

function TradeCompose({ game, onClose, onPropose }) {
  const { players, currentPlayer } = game;
  const me = currentPlayer;

  const partners = players.filter((p) => p.id !== me.id && !p.bankrupt);

  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? null);
  const [offeredProps, setOfferedProps] = useState([]);
  const [requestedProps, setRequestedProps] = useState([]);
  const [offeredMoney, setOfferedMoney] = useState(0);
  const [requestedMoney, setRequestedMoney] = useState(0);

  // Reset pilihan ketika ganti lawan
  useEffect(() => {
    setOfferedProps([]);
    setRequestedProps([]);
    setOfferedMoney(0);
    setRequestedMoney(0);
  }, [partnerId]);

  const partner = players.find((p) => p.id === partnerId);
  const myProps = tradableProps(me.id, game);
  const theirProps = partner ? tradableProps(partner.id, game) : [];

  const toggle = (list, setList, id) =>
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

  const clampMoney = (val, max) => {
    const n = Math.max(0, Math.floor(Number(val) || 0));
    return Math.min(n, max);
  };

  const hasSomething =
    offeredProps.length || requestedProps.length || offeredMoney || requestedMoney;
  const canPropose = !!partner && hasSomething;

  const submit = () => {
    onPropose({
      from: me.id,
      to: partner.id,
      offeredProps,
      requestedProps,
      offeredMoney,
      requestedMoney,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal tradem">
        <div className="modal-head">
          <h3 className="modal-title">Ajukan Trade</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">✕</button>
        </div>

        <div className="modal-body">
          {partners.length === 0 ? (
            <p className="trade-prop-empty">Tidak ada pemain lain untuk diajak trade.</p>
          ) : (
            <>
              {/* Pilih lawan */}
              <div className="trade-partner-row">
                {partners.map((p) => (
                  <button
                    key={p.id}
                    className={`trade-partner ${p.id === partnerId ? 'trade-partner--active' : ''}`}
                    onClick={() => setPartnerId(p.id)}
                  >
                    <span
                      className="trade-partner-dot"
                      style={{ background: PLAYER_COLORS[p.id] ?? '#999' }}
                    />
                    {p.piece} {p.name}{p.isAI ? ' 🤖' : ''}
                  </button>
                ))}
              </div>

              <div className="trade-cols">
                {/* Sisi saya */}
                <div className="trade-col">
                  <div className="trade-col-title">
                    Kamu beri <b>({me.name})</b>
                  </div>
                  <PropPicker
                    props={myProps}
                    selected={offeredProps}
                    onToggle={(id) => toggle(offeredProps, setOfferedProps, id)}
                  />
                  <label className="trade-money-label">+ Uang ($)</label>
                  <input
                    className="trade-money-input"
                    type="number"
                    min={0}
                    max={me.money}
                    value={offeredMoney || ''}
                    placeholder="0"
                    onChange={(e) => setOfferedMoney(clampMoney(e.target.value, me.money))}
                  />
                </div>

                {/* Sisi lawan */}
                <div className="trade-col">
                  <div className="trade-col-title">
                    Kamu minta <b>({partner?.name})</b>
                  </div>
                  <PropPicker
                    props={theirProps}
                    selected={requestedProps}
                    onToggle={(id) => toggle(requestedProps, setRequestedProps, id)}
                  />
                  <label className="trade-money-label">+ Uang ($)</label>
                  <input
                    className="trade-money-input"
                    type="number"
                    min={0}
                    max={partner?.money ?? 0}
                    value={requestedMoney || ''}
                    placeholder="0"
                    onChange={(e) =>
                      setRequestedMoney(clampMoney(e.target.value, partner?.money ?? 0))
                    }
                  />
                </div>
              </div>

              <div className="trade-summary">
                Kamu memberi <b>{offeredProps.length}</b> properti
                {offeredMoney ? <> + <b>${fmt(offeredMoney)}</b></> : null},
                menerima <b>{requestedProps.length}</b> properti
                {requestedMoney ? <> + <b>${fmt(requestedMoney)}</b></> : null}.
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-gold" disabled={!canPropose} onClick={submit}>
            Ajukan Tawaran
          </button>
        </div>
      </div>
    </div>
  );
}

function PropPicker({ props, selected, onToggle }) {
  if (props.length === 0) {
    return <div className="trade-props"><div className="trade-prop-empty">Tidak ada properti (tanpa bangunan).</div></div>;
  }
  return (
    <div className="trade-props">
      {props.map((sq) => {
        const sel = selected.includes(sq.id);
        return (
          <button
            key={sq.id}
            className={`trade-prop ${sel ? 'trade-prop--sel' : ''}`}
            style={{ '--pc': propColor(sq) }}
            onClick={() => onToggle(sq.id)}
          >
            <span className="trade-prop-check">{sel ? '✓' : ''}</span>
            <span className="trade-prop-name">{sq.name}</span>
          </button>
        );
      })}
    </div>
  );
}