// ============================================================
// ControlPanel.jsx — Panel kanan.
// Berisi: info giliran, dadu, AREA AKSI (roll / bayar sewa-pajak /
// akhiri giliran), TOOLS (Kelola properti & Trade), daftar
// PlayerCard, dan GameLog.
//
// Sejak modal ditambahkan, keputusan beli / kartu / penjara /
// tawaran-trade ditangani oleh komponen modal (BuyModal, CardModal,
// JailModal, TradeModal). Area aksi di sini hanya menyisakan langkah
// yang belum bermodal (lempar dadu, bayar sewa/pajak, akhiri giliran)
// plus menampilkan petunjuk saat modal sedang aktif.
//
// FITUR BARU: panel "Kelola Properti" untuk membangun rumah/hotel dan
// menggadai / menebus properti. Aturan build mengikuti Monopoli
// (komplex harus dikuasai penuh + bangun merata), selaras dgn AI.
// ============================================================

import React, { useState, useEffect } from 'react';
import DiceDisplay from './DiceDisplay';
import PlayerCard from './PlayerCard';
import GameLog from './GameLog';
import { RULES } from '../../constants/config';
import {
  SQUARES, KOMPLEX_COLORS, getKomplexSquares, ownsFullKomplex,
} from '../../constants/squares';

const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';
const TYPE_BAR = { airport: '#37474f', utility: '#00838f' };
const propColor = (sq) =>
  sq.komplex ? KOMPLEX_COLORS[sq.komplex] : (TYPE_BAR[sq.type] ?? '#999');

// Petunjuk singkat ketika sebuah modal sedang menangani aksi
const MODAL_HINT = {
  BUY_DECISION: 'Lihat tawaran properti di tengah layar.',
  DRAW_CARD:    'Ambil kartu di tengah layar.',
  APPLY_CARD:   'Terapkan kartu di tengah layar.',
  TRADE_RESPONSE: 'Menunggu jawaban tawaran trade…',
  AUCTION:      'Lelang sedang berlangsung di tengah layar.',
};

export default function ControlPanel({ game, difficulty, onQuit, onOpenTrade, sound }) {
  const {
    players, currentPlayer, currentPlayerIndex, owners, houses, hotels,
    lastRoll, log, landResult, waitingFor, canRoll, pendingDebt,
    rollDice, payRent, payTax, endTurn, declareBankruptcy,
    buyHouse, buyHotel, sellHouse, sellHotel, mortgage, unmortgage, settleDebt,
  } = game;

  const [manageOpen, setManageOpen] = useState(false);
  const isAI = !!currentPlayer?.isAI;
  const raising = waitingFor === 'RAISE_FUNDS';

  // Tools (kelola / trade) aktif saat giliran manusia & tidak menunggu
  // resolusi lain — KECUALI saat RAISE_FUNDS, di mana kelola wajib dibuka.
  const toolsEnabled = !isAI && (!waitingFor || raising);

  // Saat harus kumpulkan dana, paksa panel Kelola terbuka
  useEffect(() => {
    if (raising) setManageOpen(true);
  }, [raising]);

  const actions = renderActions();

  function renderActions() {
    if (isAI) {
      return <div className="act-hint">🤖 AI sedang bermain…</div>;
    }

    // Aksi yang kini ditangani modal → tampilkan petunjuk saja
    if (waitingFor && MODAL_HINT[waitingFor]) {
      return <div className="act-hint">{MODAL_HINT[waitingFor]}</div>;
    }
    // Penjara (manusia) ditangani JailModal
    if (currentPlayer?.inJail && canRoll && !waitingFor) {
      return <div className="act-hint">Pilih opsi penjara di tengah layar.</div>;
    }

    // Kumpulkan dana (uang tak cukup bayar) → jual/gadai lalu lunasi
    if (waitingFor === 'RAISE_FUNDS' && pendingDebt) {
      const target = pendingDebt.alreadyApplied ? 0 : pendingDebt.amount;
      const enough = pendingDebt.alreadyApplied
        ? currentPlayer.money >= 0
        : currentPlayer.money >= target;
      return (
        <div className="act-block act-danger">
          <div className="act-text">
            {pendingDebt.alreadyApplied ? (
              <>Saldo kamu <strong>${fmt(currentPlayer.money)}</strong> (minus). Jual atau
              gadai aset di panel <strong>Kelola Properti</strong> hingga saldo ≥ 0.</>
            ) : (
              <>Kamu harus membayar <strong>${fmt(target)}</strong> tapi uangmu hanya{' '}
              <strong>${fmt(currentPlayer.money)}</strong>. Jual/gadai aset di panel{' '}
              <strong>Kelola Properti</strong>.</>
            )}
          </div>
          <button className="btn btn-success" disabled={!enough} onClick={settleDebt}>
            Lunasi
          </button>
          <button className="btn btn-danger" onClick={declareBankruptcy}>
            Menyerah (Bangkrut)
          </button>
        </div>
      );
    }

    // Bayar sewa (tetap inline — tidak ada modal khusus)
    if (waitingFor === 'PAY_RENT' && landResult) {
      const owner = players.find((p) => p.id === landResult.ownerId);
      return (
        <div className="act-block">
          <div className="act-text">
            Bayar sewa <strong>${fmt(landResult.rentAmount)}</strong> ke {owner?.name}.
          </div>
          <button className="btn btn-danger" onClick={payRent}>Bayar Sewa</button>
        </div>
      );
    }

    // Bayar pajak (tetap inline)
    if (waitingFor === 'PAY_TAX' && landResult) {
      return (
        <div className="act-block">
          <div className="act-text">
            Bayar pajak <strong>${fmt(landResult.taxAmount)}</strong>.
          </div>
          <button className="btn btn-danger" onClick={payTax}>Bayar Pajak</button>
        </div>
      );
    }

    // Lempar dadu (di luar penjara — penjara via JailModal)
    if (canRoll && !waitingFor && !currentPlayer.inJail) {
      return (
        <div className="act-block">
          <button className="btn btn-gold btn-roll" onClick={rollDice}>
            🎲 Lempar Dadu
          </button>
        </div>
      );
    }

    // Selesai resolusi → akhiri giliran
    if (!waitingFor && !canRoll) {
      return (
        <div className="act-block">
          <button className="btn btn-primary" onClick={endTurn}>
            Akhiri Giliran ⏭
          </button>
          {currentPlayer.money < 0 && (
            <button className="btn btn-danger" onClick={declareBankruptcy}>
              Menyerah (Bangkrut)
            </button>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <aside className="panel">
      <div className="panel-head">
        <div className="panel-turn">
          <span className="panel-turn-label">Giliran</span>
          <strong>{currentPlayer?.piece} {currentPlayer?.name}</strong>
          {isAI && <span className="panel-aiflag">AI · {difficulty}</span>}
        </div>
        {sound && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={sound.toggle}
            title={sound.enabled ? 'Matikan suara' : 'Nyalakan suara'}
          >
            {sound.enabled ? '🔊' : '🔇'}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onQuit}>Keluar</button>
      </div>

      <DiceDisplay roll={lastRoll} />

      <div className="panel-actions">{actions}</div>

      {/* ── TOOLS: Kelola & Trade ─────────────────────────────── */}
      {!isAI && (
        <div className="panel-tools">
          <button
            className={`btn btn-ghost btn-sm ${manageOpen ? 'btn-tool--on' : ''}`}
            disabled={!toolsEnabled}
            onClick={() => setManageOpen((v) => !v)}
          >
            🏗 Kelola Properti
          </button>
          <button
            className="btn btn-ghost btn-sm"
            disabled={!toolsEnabled || raising}
            onClick={onOpenTrade}
          >
            🤝 Trade
          </button>
        </div>
      )}

      {manageOpen && !isAI && (
        <ManagePanel
          player={currentPlayer}
          game={game}
          onBuyHouse={buyHouse}
          onBuyHotel={buyHotel}
          onSellHouse={sellHouse}
          onSellHotel={sellHotel}
          onMortgage={mortgage}
          onUnmortgage={unmortgage}
        />
      )}

      <div className="panel-players">
        {players.map((p, i) => (
          <PlayerCard
            key={p.id}
            player={p}
            game={game}
            isCurrent={i === currentPlayerIndex}
          />
        ))}
      </div>

      <GameLog log={log} />
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// PANEL KELOLA — bangun rumah/hotel & gadai/tebus
// ─────────────────────────────────────────────────────────────

function ManagePanel({ player, game, onBuyHouse, onBuyHotel, onSellHouse, onSellHotel, onMortgage, onUnmortgage }) {
  const { owners, houses, hotels, housesLeft, hotelsLeft } = game;

  const myProps = SQUARES.filter((s) => owners[s.id] === player.id);
  if (myProps.length === 0) {
    return (
      <div className="manage">
        <div className="manage-title">Kelola Properti</div>
        <div className="manage-empty">Belum punya properti.</div>
      </div>
    );
  }

  // Apakah ada properti komplex yang sedang digadai (blokir build seluruh komplex)
  const komplexHasMortgage = (komplex) =>
    getKomplexSquares(komplex).some((s) => (player.mortgaged || []).includes(s.id));

  // Min/Max jumlah rumah dalam komplex (aturan bangun & jual merata)
  const minHousesInKomplex = (komplex) =>
    Math.min(...getKomplexSquares(komplex).map((s) => houses[s.id] || 0));
  const maxHousesInKomplex = (komplex) =>
    Math.max(...getKomplexSquares(komplex).map((s) => houses[s.id] || 0));

  // Semua properti komplex sudah siap hotel? (>=4 rumah / sudah hotel)
  const komplexReadyForHotel = (komplex) =>
    getKomplexSquares(komplex).every(
      (s) => (houses[s.id] || 0) >= RULES.MIN_HOUSES_FOR_HOTEL || (hotels[s.id] || 0) >= 1
    );

  const evalSquare = (sq) => {
    const h = houses[sq.id] || 0;
    const hasHotel = (hotels[sq.id] || 0) >= 1;
    const mortgaged = (player.mortgaged || []).includes(sq.id);
    const isBuildable = !!sq.komplex; // hanya properti komplex bisa dibangun
    const full = isBuildable && ownsFullKomplex(sq.komplex, player.id, owners);
    const safeKomplex = isBuildable && !komplexHasMortgage(sq.komplex);

    const canBuildHouse =
      isBuildable && full && safeKomplex && !mortgaged && !hasHotel &&
      h < 4 && h === minHousesInKomplex(sq.komplex) &&
      housesLeft > 0 && player.money >= sq.houseCost;

    const canBuildHotel =
      isBuildable && full && safeKomplex && !mortgaged && !hasHotel &&
      h === 4 && komplexReadyForHotel(sq.komplex) &&
      hotelsLeft > 0 && player.money >= sq.hotelCost;

    // Jual merata: hanya dari petak dengan rumah terbanyak dalam komplex
    const canSellHouse =
      isBuildable && !hasHotel && h > 0 && h === maxHousesInKomplex(sq.komplex);
    // Jual hotel butuh stok 4 rumah untuk dipecah
    const canSellHotel = isBuildable && hasHotel && housesLeft >= RULES.MIN_HOUSES_FOR_HOTEL;
    const houseRefund = Math.floor(sq.houseCost * RULES.SELL_REFUND_RATE);
    const hotelRefund = Math.floor(sq.hotelCost * RULES.SELL_REFUND_RATE);

    const canMortgage = !mortgaged && h === 0 && !hasHotel; // jual bangunan dulu
    const unmortgageCost = Math.floor(sq.price * RULES.UNMORTGAGE_RATE);
    const canUnmortgage = mortgaged && player.money >= unmortgageCost;
    const mortgageValue = Math.floor(sq.price * RULES.MORTGAGE_RATE);

    return {
      h, hasHotel, mortgaged, full, isBuildable,
      canBuildHouse, canBuildHotel, canSellHouse, canSellHotel,
      houseRefund, hotelRefund,
      canMortgage, canUnmortgage, unmortgageCost, mortgageValue,
    };
  };

  return (
    <div className="manage">
      <div className="manage-title">
        Kelola Properti
        <span className="manage-stock">🏠 {housesLeft} · 🏨 {hotelsLeft}</span>
      </div>

      <div className="manage-list">
        {myProps.map((sq) => {
          const e = evalSquare(sq);
          return (
            <div
              key={sq.id}
              className={`manage-row ${e.mortgaged ? 'manage-row--mortgaged' : ''}`}
              style={{ '--pc': propColor(sq) }}
            >
              <div className="manage-info">
                <span className="manage-name">{sq.name}</span>
                <span className="manage-tags">
                  {e.hasHotel ? '🏨'
                    : e.h > 0 ? '🏠'.repeat(e.h)
                    : e.mortgaged ? 'digadai'
                    : '—'}
                </span>
              </div>

              <div className="manage-btns">
                {e.isBuildable && !e.hasHotel && e.h > 0 && (
                  <button
                    className="btn-mini btn-mini-sell"
                    disabled={!e.canSellHouse}
                    title={`Jual rumah (+$${fmt(e.houseRefund)})`}
                    onClick={() => onSellHouse(sq.id)}
                  >
                    −🏠
                  </button>
                )}
                {e.isBuildable && e.hasHotel && (
                  <button
                    className="btn-mini btn-mini-sell"
                    disabled={!e.canSellHotel}
                    title={`Jual hotel → 4 rumah (+$${fmt(e.hotelRefund)})`}
                    onClick={() => onSellHotel(sq.id)}
                  >
                    −🏨
                  </button>
                )}
                {e.isBuildable && !e.hasHotel && e.h < 4 && (
                  <button
                    className="btn-mini btn-mini-build"
                    disabled={!e.canBuildHouse}
                    title={`Bangun rumah ($${fmt(sq.houseCost)})`}
                    onClick={() => onBuyHouse(sq.id)}
                  >
                    +🏠
                  </button>
                )}
                {e.isBuildable && !e.hasHotel && e.h === 4 && (
                  <button
                    className="btn-mini btn-mini-build"
                    disabled={!e.canBuildHotel}
                    title={`Bangun hotel ($${fmt(sq.hotelCost)})`}
                    onClick={() => onBuyHotel(sq.id)}
                  >
                    +🏨
                  </button>
                )}
                {e.mortgaged ? (
                  <button
                    className="btn-mini btn-mini-unmort"
                    disabled={!e.canUnmortgage}
                    title={`Tebus ($${fmt(e.unmortgageCost)})`}
                    onClick={() => onUnmortgage(sq.id)}
                  >
                    Tebus
                  </button>
                ) : (
                  <button
                    className="btn-mini btn-mini-mort"
                    disabled={!e.canMortgage}
                    title={`Gadai (+$${fmt(e.mortgageValue)})`}
                    onClick={() => onMortgage(sq.id)}
                  >
                    Gadai
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="manage-hint">
        Bangun hanya jika menguasai seluruh komplex (merata). Gadai harus tanpa bangunan.
      </div>
    </div>
  );
}