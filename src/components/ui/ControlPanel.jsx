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
import { PLAYER_COLORS } from '../board/Board';
import PieceModel from '../board/PieceModel';
import { RULES } from '../../constants/config';
import {
  getPropertyCardImage,
  MILLIONAIRE_UI_ASSETS,
} from '../../constants/millionaireAssets';
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
    usePowerUp, acceptReroll, keepReroll,
  } = game;

  const [manageOpen, setManageOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(true);
  const [diceRolling, setDiceRolling] = useState(false);
  const isAI = !!currentPlayer?.isAI;
  const raising = waitingFor === 'RAISE_FUNDS';
  const playerRows = players.length <= 3
    ? [players]
    : players.length === 4
      ? [players.slice(0, 2), players.slice(2)]
      : [players.slice(0, 3), players.slice(3)];

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
    if (waitingFor === 'REROLL_DECISION') {
      return (
        <div className="act-block">
          <div className="act-text">Pilih hasil lemparan dadu.</div>
          <button className="btn btn-gold" onClick={acceptReroll}>Lempar Ulang</button>
          <button className="btn btn-ghost" onClick={keepReroll}>Gunakan Hasil Ini</button>
        </div>
      );
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
              <>Saldo kamu <strong>Rp {fmt(currentPlayer.money)}</strong> (minus). Jual atau
              gadai aset di panel <strong>Kelola Properti</strong> hingga saldo ≥ 0.</>
            ) : (
              <>Kamu harus membayar <strong>Rp {fmt(target)}</strong> tapi uangmu hanya{' '}
              <strong>Rp {fmt(currentPlayer.money)}</strong>. Jual/gadai aset di panel{' '}
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
            Bayar sewa <strong>Rp {fmt(landResult.rentAmount)}</strong> ke {owner?.name}.
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
            Bayar pajak <strong>Rp {fmt(landResult.taxAmount)}</strong>.
          </div>
          <button className="btn btn-danger" onClick={payTax}>
            {currentPlayer.powerUpEffects?.insurance ? 'Gunakan Asuransi' : 'Bayar Pajak'}
          </button>
        </div>
      );
    }

    // Tombol utama memakai tombol dadu yang sama untuk mengakhiri giliran.
    if (
      !waitingFor &&
      ((canRoll && !currentPlayer.inJail) || (!canRoll && lastRoll))
    ) {
      const endingTurn = !canRoll && !diceRolling;
      return (
        <div className="act-block act-block--roll">
          <button
            className={`btn btn-gold btn-roll${diceRolling ? ' btn-roll--rolling' : ''}${endingTurn ? ' btn-roll--end' : ''}`}
            onClick={() => {
              if (canRoll) {
                setDiceRolling(true);
                rollDice();
              } else {
                endTurn();
              }
            }}
            disabled={diceRolling}
            aria-label={endingTurn ? 'Akhiri giliran' : 'Kocok dadu'}
          >
            <img
              className="game-ui-icon game-ui-icon--roll"
              src={MILLIONAIRE_UI_ASSETS.roll}
              alt=""
              draggable={false}
            />
            {endingTurn && <span className="btn-roll-label">Akhiri Giliran</span>}
          </button>
          {endingTurn && currentPlayer.money < 0 && (
            <button className="btn btn-danger btn-bankruptcy" onClick={declareBankruptcy}>
              Menyerah (Bangkrut)
            </button>
          )}
        </div>
      );
    }

    return null;
  }

  return (
    <aside className={`panel ${players.length > 3 ? 'panel--many-players' : ''}`}>
      <img
        className="panel-control-base"
        src={MILLIONAIRE_UI_ASSETS.controlBase}
        alt=""
        draggable={false}
      />
      <div className="panel-head">
        <div className="panel-turn">
          <span className="panel-turn-label">Giliran</span>
          <strong>
            <PieceModel piece={currentPlayer?.piece} color={PLAYER_COLORS[currentPlayer?.id] ?? '#999'} />
            {currentPlayer?.name}
          </strong>
          {isAI && <span className="panel-aiflag">AI · {difficulty}</span>}
        </div>
        {sound && (
          <button
            className="btn btn-ghost btn-sm panel-settings-button"
            onClick={sound.toggle}
            title={sound.enabled ? 'Matikan suara' : 'Nyalakan suara'}
            aria-label={sound.enabled ? 'Matikan suara' : 'Nyalakan suara'}
          >
            <img
              className="panel-settings-icon"
              src={MILLIONAIRE_UI_ASSETS.settings}
              alt=""
              draggable={false}
            />
            <span className="sr-only">{sound.enabled ? 'Matikan suara' : 'Nyalakan suara'}</span>
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onQuit}>Keluar</button>
      </div>

      <DiceDisplay
        roll={lastRoll}
        rollDuration={game.settings?.speed === 'cepat' ? 500 : 1000}
        onRollingChange={setDiceRolling}
      />

      <div className="panel-actions">{actions}</div>

      {cardsOpen && (
        <PowerUpPanel
          player={currentPlayer}
          game={game}
          onUse={usePowerUp}
          disabled={isAI}
        />
      )}

      {/* ── TOOLS: Kelola & Trade ─────────────────────────────── */}
      {!isAI && (
        <div className="panel-tools">
          <button
            className={`btn btn-ghost btn-sm panel-tool-cards ${cardsOpen ? 'btn-tool--on' : ''}`}
            disabled={!toolsEnabled}
            onClick={() => setCardsOpen((v) => !v)}
            aria-label="Kartu Saya"
            title="Kartu Saya"
          >
            <img
              className="panel-tool-image"
              src={MILLIONAIRE_UI_ASSETS.cards}
              alt=""
              draggable={false}
            />
            {!!currentPlayer.powerUps?.length && (
              <span className="panel-tool-count">{currentPlayer.powerUps.length}</span>
            )}
          </button>
          <button
            className={`btn btn-ghost btn-sm panel-tool-assets ${manageOpen ? 'btn-tool--on' : ''}`}
            disabled={!toolsEnabled}
            onClick={() => setManageOpen((v) => !v)}
            aria-label="Aset Saya"
            title="Aset Saya"
          >
            <img
              className="panel-tool-image"
              src={MILLIONAIRE_UI_ASSETS.assets}
              alt=""
              draggable={false}
            />
          </button>
          <button
            className="btn btn-ghost btn-sm panel-tool-trade"
            disabled={!toolsEnabled || raising}
            onClick={onOpenTrade}
          >
            🤝
          </button>
        </div>
      )}

      {manageOpen && !isAI && (
        <ManagePanel
          player={currentPlayer}
          game={game}
          onClose={() => setManageOpen(false)}
          onBuyHouse={buyHouse}
          onBuyHotel={buyHotel}
          onSellHouse={sellHouse}
          onSellHotel={sellHotel}
          onMortgage={mortgage}
          onUnmortgage={unmortgage}
        />
      )}

      <div className="panel-players">
        {playerRows.map((row, rowIndex) => (
          <div className="panel-player-row" key={`row-${rowIndex}`}>
            {row.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                game={game}
                isCurrent={p.id === players[currentPlayerIndex]?.id}
              />
            ))}
          </div>
        ))}
      </div>

      {logOpen ? (
        <GameLog log={log} onClose={() => setLogOpen(false)} />
      ) : (
        <button
          className="panel-log-reopen"
          onClick={() => setLogOpen(true)}
          aria-label="Buka log"
          title="Buka log permainan"
        >
          📜
        </button>
      )}
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// PANEL KELOLA — bangun rumah/hotel & gadai/tebus
// ─────────────────────────────────────────────────────────────

function ManagePanel({ player, game, onClose, onBuyHouse, onBuyHotel, onSellHouse, onSellHotel, onMortgage, onUnmortgage }) {
  const { owners, houses, hotels, housesLeft, hotelsLeft } = game;
  const propertyTypes = ['property', 'airport', 'utility'];
  const allProperties = SQUARES.filter((square) => propertyTypes.includes(square.type));
  const myProps = allProperties.filter((square) => owners[square.id] === player.id);
  const assetValue = myProps.reduce((total, square) =>
    total +
      (square.price || 0) +
      (houses[square.id] || 0) * (square.houseCost || 0) +
      (hotels[square.id] || 0) * (square.hotelCost || 0), 0);
  const avatar = player.id === 0
    ? 'avatar_gold'
    : player.id % 2
      ? 'avatar_blue'
      : 'avatar_green';
  const [previewSquare, setPreviewSquare] = useState(null);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (previewSquare) setPreviewSquare(null);
      else onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, previewSquare]);

  // Apakah ada properti komplex yang sedang digadai (blokir build seluruh komplex)
  const komplexHasMortgage = (komplex) =>
    getKomplexSquares(komplex).some((s) => (player.mortgaged || []).includes(s.id));
  const komplexHasBuildings = (komplex) =>
    getKomplexSquares(komplex).some(
      (s) => (houses[s.id] || 0) > 0 || (hotels[s.id] || 0) > 0
    );

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
      housesLeft > 0 &&
      (player.money >= sq.houseCost || player.powerUpEffects?.freeHouse === true);

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

    const canMortgage =
      !mortgaged && h === 0 && !hasHotel &&
      (!sq.komplex || !komplexHasBuildings(sq.komplex));
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
    <div
      className="asset-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Aset saya"
      onClick={onClose}
    >
      <div className="asset-window" onClick={(event) => event.stopPropagation()}>
        <img
          className="asset-window-frame"
          src={MILLIONAIRE_UI_ASSETS.assetFrame}
          alt=""
          draggable={false}
        />
        <div className="asset-owner">
          <img
            src={`/millionaire-game/assets/ui/${avatar}.png`}
            alt=""
            draggable={false}
          />
          <span>{player.name}</span>
        </div>
        <button
          className="asset-window-close"
          onClick={onClose}
          aria-label="Tutup aset saya"
          title="Tutup"
        />
        <div className="asset-money">Uang Anda: <strong>Rp {fmt(player.money)}</strong></div>
        <div className="asset-count">
          Total Properti: <strong>{myProps.length}/{allProperties.length}</strong>
        </div>
        <div className="asset-value">
          Total Nilai Aset: <strong>Rp {fmt(assetValue)}</strong>
        </div>

        <div className="asset-list" aria-label="Daftar properti milik pemain">
          {myProps.length ? myProps.map((sq) => {
          const e = evalSquare(sq);
          return (
            <article
              key={sq.id}
              className={`asset-card${e.mortgaged ? ' asset-card--mortgaged' : ''}`}
              style={{ '--pc': propColor(sq) }}
            >
              <button
                className="asset-property-button"
                onClick={() => setPreviewSquare(sq)}
                aria-label={`Perbesar kartu ${sq.name}`}
                title={`Lihat kartu ${sq.name}`}
              >
                <img
                  className="asset-property-image"
                  src={getPropertyCardImage(sq)}
                  alt={sq.name}
                  draggable={false}
                />
              </button>
              <img className="asset-empty-image" src={MILLIONAIRE_UI_ASSETS.assetEmpty} alt="" draggable={false} />
              <div className="asset-actions">
                {e.isBuildable && !e.hasHotel && e.h > 0 && (
                  <button
                    className="asset-action asset-action--text"
                    disabled={!e.canSellHouse}
                    title={`Jual rumah (+Rp ${fmt(e.houseRefund)})`}
                    onClick={() => onSellHouse(sq.id)}
                  >
                    Jual Rumah
                  </button>
                )}
                {e.isBuildable && e.hasHotel && (
                  <button
                    className="asset-action asset-action--text"
                    disabled={!e.canSellHotel}
                    title={`Jual hotel → 4 rumah (+Rp ${fmt(e.hotelRefund)})`}
                    onClick={() => onSellHotel(sq.id)}
                  >
                    Jual Hotel
                  </button>
                )}
                {e.isBuildable && !e.hasHotel && e.h < 4 && (
                  <button
                    className="asset-action"
                    disabled={!e.canBuildHouse}
                    title={player.powerUpEffects?.freeHouse
                      ? 'Bangun rumah gratis'
                      : `Bangun rumah (Rp ${fmt(sq.houseCost)})`}
                    onClick={() => onBuyHouse(sq.id)}
                  >
                    <img src={MILLIONAIRE_UI_ASSETS.assetBuild} alt="Bangun" draggable={false} />
                  </button>
                )}
                {e.isBuildable && !e.hasHotel && e.h === 4 && (
                  <button
                    className="asset-action"
                    disabled={!e.canBuildHotel}
                    title={`Bangun hotel (Rp ${fmt(sq.hotelCost)})`}
                    onClick={() => onBuyHotel(sq.id)}
                  >
                    <img src={MILLIONAIRE_UI_ASSETS.assetBuild} alt="Bangun hotel" draggable={false} />
                  </button>
                )}
                {e.mortgaged ? (
                  <button
                    className="asset-action asset-action--text"
                    disabled={!e.canUnmortgage}
                    title={`Tebus (Rp ${fmt(e.unmortgageCost)})`}
                    onClick={() => onUnmortgage(sq.id)}
                  >
                    Tebus
                  </button>
                ) : (
                  <button
                    className="asset-action"
                    disabled={!e.canMortgage}
                    title={`Gadai (+Rp ${fmt(e.mortgageValue)})`}
                    onClick={() => onMortgage(sq.id)}
                  >
                    <img src={MILLIONAIRE_UI_ASSETS.assetMortgage} alt="Gadai" draggable={false} />
                  </button>
                )}
              </div>
            </article>
          );
          }) : (
            <div className="asset-empty-message">
              Belum ada properti.<br />
              Beli properti saat mendarat di petaknya,<br />
              kartunya akan tersimpan di sini.
            </div>
          )}
        </div>

        {previewSquare && (
          <div className="asset-card-preview" onClick={() => setPreviewSquare(null)}>
            <div className="asset-card-preview-content" onClick={(event) => event.stopPropagation()}>
              <strong>{previewSquare.name}</strong>
              <img src={getPropertyCardImage(previewSquare)} alt={previewSquare.name} draggable={false} />
              <button className="asset-preview-close" onClick={() => setPreviewSquare(null)}>Tutup</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const POWER_UP_LABELS = {
  power_discount_next_buy: 'Diskon properti',
  power_free_house: 'Gratis bangun',
  power_double_rent: 'Sewa ganda',
  power_insurance: 'Asuransi',
  power_golden_die: 'Dadu emas',
  power_reroll: 'Lempar ulang',
  power_extra_turn: 'Giliran ganda',
  power_ticket_station: 'Tiket perjalanan',
};

function PowerUpPanel({ player, game, onUse, disabled }) {
  const [dieChoice, setDieChoice] = useState('6');
  const [squareChoice, setSquareChoice] = useState('');
  const cards = player?.powerUps || [];
  if (!cards.length) return null;

  const destinations = SQUARES.filter((square) =>
    square.type === 'airport' || square.type === 'utility'
  );
  const canUse = (action) => {
    if (action === 'power_discount_next_buy') return game.waitingFor === 'BUY_DECISION';
    if (action === 'power_insurance') {
      return !game.waitingFor || game.waitingFor === 'PAY_TAX' ||
        (game.waitingFor === 'APPLY_CARD' && ['pay', 'repairs'].includes(game.activeCard?.type));
    }
    if (['power_golden_die', 'power_reroll'].includes(action)) {
      return game.canRoll && !game.waitingFor;
    }
    return [
      'power_free_house', 'power_double_rent', 'power_extra_turn', 'power_ticket_station',
    ].includes(action) && !game.waitingFor;
  };
  const activate = (card) => {
    const payload = { cardId: card.id };
    if (card.action === 'power_golden_die') payload.choice = Number(dieChoice);
    if (card.action === 'power_ticket_station') {
      payload.squareId = Number(squareChoice || destinations[0]?.id);
    }
    onUse(payload);
  };

  return (
    <section className="power-ups" aria-label="Power Up">
      <div className="power-ups-title">Power Up</div>
      {cards.map((card) => (
        <div className="power-up-row" key={card.id}>
          <div className="power-up-info">
            <strong>{card.name || POWER_UP_LABELS[card.action] || 'Power Up'}</strong>
            <span>{card.text}</span>
          </div>
          <div className="power-up-controls">
            {card.action === 'power_golden_die' && (
              <select
                aria-label="Pilih angka dadu emas"
                value={dieChoice}
                onChange={(event) => setDieChoice(event.target.value)}
              >
                {[1, 2, 3, 4, 5, 6].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            )}
            {card.action === 'power_ticket_station' && (
              <select
                aria-label="Pilih tujuan tiket"
                value={squareChoice || destinations[0]?.id || ''}
                onChange={(event) => setSquareChoice(event.target.value)}
              >
                {destinations.map((square) => (
                  <option key={square.id} value={square.id}>{square.name}</option>
                ))}
              </select>
            )}
            <button
              className="btn btn-gold btn-sm"
              disabled={disabled || !canUse(card.action)}
              onClick={() => activate(card)}
            >
              Gunakan
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}