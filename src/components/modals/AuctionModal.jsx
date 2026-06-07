// ============================================================
// AuctionModal.jsx — Lelang properti.
// Tampil setiap kali ada sesi lelang (game.auction), tak peduli
// siapa pemilik giliran — karena semua pemain aktif ikut menawar.
//
//   • Giliran penawar MANUSIA → input nominal + tombol Tawar / Pass.
//   • Giliran penawar AI       → otomatis memutuskan via aiDecideBid.
//
// Lelang dipicu saat pemain tak mampu membeli (auction_prompt) atau
// menolak membeli (DECLINE_BUY). Aksi: auctionBid / auctionPass.
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { SQUARES, KOMPLEX_COLORS } from '../../constants/squares';
import { PLAYER_COLORS } from '../board/Board';
import { aiDecideBid } from '../../logic/aiLogic';
import { RULES } from '../../constants/config';

const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';
const TYPE_BAR = { airport: '#37474f', utility: '#00838f' };
const propColor = (sq) =>
  sq?.komplex ? KOMPLEX_COLORS[sq.komplex] : (TYPE_BAR[sq?.type] ?? '#555');

export default function AuctionModal({ game, difficulty = 'medium' }) {
  const { auction, players } = game;
  const { auctionBid, auctionPass } = game;

  const actedKey = useRef(null);
  const [bid, setBid] = useState(0);

  // Default input = tawaran tertinggi + kelipatan
  useEffect(() => {
    if (auction) setBid(auction.highestBid + RULES.AUCTION_INCREMENT);
  }, [auction?.highestBid, auction?.squareId]);

  // Penawar AI → putuskan otomatis
  useEffect(() => {
    if (!auction) return;
    const bidder = players.find((p) => p.id === auction.currentBidderId);
    if (!bidder?.isAI) return;

    const key = `${auction.currentBidderId}:${auction.highestBid}:${auction.remaining.length}`;
    if (actedKey.current === key) return;
    actedKey.current = key;

    const sq = SQUARES.find((s) => s.id === auction.squareId);
    const t = setTimeout(() => {
      const amount = aiDecideBid(bidder, sq, auction.highestBid, game, difficulty);
      amount > 0 ? auctionBid(amount) : auctionPass();
    }, 950);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.currentBidderId, auction?.highestBid, auction?.remaining.length]);

  if (!auction) return null;

  const sq = SQUARES.find((s) => s.id === auction.squareId);
  const bidder = players.find((p) => p.id === auction.currentBidderId);
  const highBidder = auction.highestBidderId != null
    ? players.find((p) => p.id === auction.highestBidderId)
    : null;
  const isHumanTurn = bidder && !bidder.isAI;
  const minBid = auction.highestBid + RULES.AUCTION_INCREMENT;
  const validBid = bid >= minBid && bid <= (bidder?.money ?? 0);

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-head">
          <h3 className="modal-title">Lelang Properti</h3>
        </div>

        <div className="modal-body">
          <div className="deed" style={{ marginBottom: 14 }}>
            <div className="deed-bar" style={{ '--bar': propColor(sq) }}>
              <span className="deed-bar-name">{sq?.name}</span>
            </div>
            {sq?.subtitle && <div className="deed-sub">{sq.subtitle}</div>}
            <div className="deed-foot-info">
              <span>Harga normal: <b>${fmt(sq?.price)}</b></span>
            </div>
          </div>

          <div className="auc-high">
            {highBidder ? (
              <>Tawaran tertinggi: <strong>${fmt(auction.highestBid)}</strong> oleh {highBidder.name}</>
            ) : (
              <>Belum ada tawaran.</>
            )}
          </div>

          {/* Daftar penawar */}
          <div className="auc-bidders">
            {players.filter((p) => !p.bankrupt).map((p) => {
              const inAuction = auction.remaining.includes(p.id);
              const isCurrent = p.id === auction.currentBidderId;
              return (
                <span
                  key={p.id}
                  className={`auc-bidder ${isCurrent ? 'auc-bidder--cur' : ''} ${!inAuction ? 'auc-bidder--out' : ''}`}
                >
                  <span className="auc-bidder-dot" style={{ background: PLAYER_COLORS[p.id] ?? '#999' }} />
                  {p.name}{!inAuction ? ' (pass)' : ''}
                </span>
              );
            })}
          </div>

          <div className="auc-turn">
            {isHumanTurn ? (
              <>Giliran menawar: <strong>{bidder.name}</strong></>
            ) : (
              <>🤖 {bidder?.name} sedang menawar…</>
            )}
          </div>

          {isHumanTurn && (
            <div className="auc-bid-row">
              <input
                className="trade-money-input"
                type="number"
                min={minBid}
                max={bidder.money}
                step={RULES.AUCTION_INCREMENT}
                value={bid || ''}
                onChange={(e) => setBid(Math.floor(Number(e.target.value) || 0))}
              />
              <span className="auc-bid-hint">
                min ${fmt(minBid)} · uangmu ${fmt(bidder.money)}
              </span>
            </div>
          )}
        </div>

        {isHumanTurn && (
          <div className="modal-foot">
            <button className="btn btn-ghost" onClick={auctionPass}>Pass</button>
            <button
              className="btn btn-gold"
              disabled={!validBid}
              onClick={() => auctionBid(bid)}
            >
              Tawar ${fmt(bid || 0)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}