// ============================================================
// BuyModal.jsx — Modal tawaran beli properti.
// Muncul saat waitingFor === 'BUY_DECISION'.
// Menampilkan "kartu hak milik" (title deed): strip warna komplex,
// foto landmark, harga, dan tabel sewa lengkap. Tombol Beli / Lewati.
//
// Tidak menyentuh logic — hanya memanggil aksi buyProperty / declineBuy
// yang sudah ada di useGameState.
// ============================================================

import React from 'react';
import { KOMPLEX_COLORS } from '../../constants/squares';
import { getRentTable } from '../../logic/rentLogic';
import { getImage } from '../../constants/images';
import { useLandingDelay } from '../../hooks/useLandingDelay';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('id-ID') : n);

// Warna strip untuk tipe non-properti
const TYPE_BAR = {
  airport: '#37474f',
  utility: '#00838f',
};
const TYPE_TAG = {
  airport: 'Bandara',
  utility: 'Utilitas',
};

export default function BuyModal({ game }) {
  const { waitingFor, landResult, currentPlayer, buyProperty, declineBuy } = game;

  const active = waitingFor === 'BUY_DECISION' && !!landResult?.square && !currentPlayer?.isAI;
  // Tunggu animasi jalan bidak selesai sebelum modal muncul
  const ready = useLandingDelay(game, active);

  // Hanya tampil untuk keputusan beli oleh pemain manusia, setelah bidak tiba
  if (!active || !ready) return null;

  const sq = landResult.square;
  const bar = sq.komplex ? KOMPLEX_COLORS[sq.komplex] : (TYPE_BAR[sq.type] ?? '#555');
  const photo = getImage(sq.image, '');
  const rentTable = getRentTable(sq, game);
  const canAfford = currentPlayer.money >= sq.price;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-head">
          <h3 className="modal-title">Properti Tersedia</h3>
        </div>

        <div className="modal-body">
          <div className="deed">
            <div className="deed-bar" style={{ '--bar': bar }}>
              {photo && (
                <div
                  className="deed-bar-photo"
                  style={{ backgroundImage: `url(${photo})` }}
                />
              )}
              <span className="deed-bar-name">{sq.name}</span>
            </div>

            {sq.subtitle && <div className="deed-sub">{sq.subtitle}</div>}
            {!sq.komplex && TYPE_TAG[sq.type] && (
              <span className="deed-type-tag" style={{ '--bar': bar }}>
                {TYPE_TAG[sq.type]}
              </span>
            )}

            <ul className="rent-table">
              {rentTable.map((r, i) => (
                <li
                  key={i}
                  className={`rent-row ${r.highlight ? 'rent-row--hl' : ''}`}
                >
                  <span className="rent-label">{r.label}</span>
                  <span className="rent-amt">
                    {typeof r.amount === 'number' ? `$${fmt(r.amount)}` : r.amount}
                  </span>
                </li>
              ))}
            </ul>

            <div className="deed-foot-info">
              {sq.houseCost ? (
                <span>Bangun: <b>${fmt(sq.houseCost)}</b>/unit</span>
              ) : <span />}
              <span>Gadai: <b>${fmt(Math.floor(sq.price / 2))}</b></span>
            </div>
          </div>

          <div className="buy-price">
            Harga beli: <strong>${fmt(sq.price)}</strong>
          </div>
          <div className="modal-note">
            Uangmu saat ini: <strong>${fmt(currentPlayer.money)}</strong>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={declineBuy}>
            Lewati
          </button>
          <button
            className="btn btn-success"
            disabled={!canAfford}
            onClick={() => buyProperty(sq.id)}
          >
            Beli (${fmt(sq.price)})
          </button>
        </div>
      </div>
    </div>
  );
}