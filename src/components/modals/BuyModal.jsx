// ============================================================
// BuyModal.jsx — Modal tawaran beli properti.
// Muncul saat waitingFor === 'BUY_DECISION'.
// Menampilkan kartu hak milik asli dari aset Millionaire Indonesia ZIP.
// Aksi Beli / Lewati tetap menggunakan reducer game yang sudah ada.
//
// Tidak menyentuh logic — hanya memanggil aksi buyProperty / declineBuy
// yang sudah ada di useGameState.
// ============================================================

import React from 'react';
import { getPropertyCardImage } from '../../constants/millionaireAssets';
import { useLandingDelay } from '../../hooks/useLandingDelay';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('id-ID') : n);

export default function BuyModal({ game }) {
  const { waitingFor, landResult, currentPlayer, buyProperty, declineBuy, usePowerUp } = game;

  const active = waitingFor === 'BUY_DECISION' && !!landResult?.square && !currentPlayer?.isAI;
  // Tunggu animasi jalan bidak selesai sebelum modal muncul
  const ready = useLandingDelay(game, active);

  // Hanya tampil untuk keputusan beli oleh pemain manusia, setelah bidak tiba
  if (!active || !ready) return null;

  const sq = landResult.square;
  const cardImage = getPropertyCardImage(sq);
  const discountCard = currentPlayer.powerUps?.find(
    (card) => card.action === 'power_discount_next_buy'
  );
  const discountedPrice = currentPlayer.powerUpEffects?.discountNextBuy
    ? Math.floor(sq.price / 2)
    : sq.price;
  const canAfford = currentPlayer.money >= discountedPrice;

  return (
    <div className="modal-overlay property-card-overlay">
      <div className="property-offer">
        <div className="property-offer-caption">
          <strong>{sq.name}</strong>
          <span>Kartu hak milik</span>
        </div>
        <img
          className="property-card-art"
          src={cardImage}
          alt={`Kartu properti ${sq.name}`}
          draggable={false}
        />
        <div className="property-offer-summary">
          <span>Harga beli: <strong>Rp {fmt(discountedPrice)}</strong></span>
          <span>Uangmu: <strong>Rp {fmt(currentPlayer.money)}</strong></span>
        </div>
        {discountCard && !currentPlayer.powerUpEffects?.discountNextBuy && (
          <button
            className="btn property-discount"
            onClick={() => usePowerUp({ cardId: discountCard.id })}
          >
            Aktifkan diskon 50%
          </button>
        )}
        <div className="property-offer-actions">
          <button className="btn btn-ghost" onClick={declineBuy}>
            Lewati
          </button>
          <button
            className="btn btn-success"
            disabled={!canAfford}
            onClick={() => buyProperty(sq.id)}
          >
            Beli · Rp {fmt(discountedPrice)}
          </button>
        </div>
      </div>
    </div>
  );
}