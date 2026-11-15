// ============================================================
// App.jsx — Root aplikasi.
// Fase: setup → playing → ended. Menyambungkan menu, reducer,
// multiplayer, AI, lapisan modal, dan auto-save:
//   • Auto-save ke localStorage tiap state berubah (saat playing)
//   • Tombol "Lanjutkan" untuk memuat save
//   • Efek suara via useSound (dipicu dari perubahan state)
// ============================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAI } from './hooks/useAI';
import { useMultiplayer } from './hooks/useMultiplayer';
import { useSound } from './hooks/useSound';
import {
  clearSave,
  clearSaveSlot,
  loadGame as loadSaved,
  loadGameFromSlot,
  peekSave,
  peekSaveSlots,
  saveGame,
} from './utils/saveGame';
import { soundForLogText } from './utils/logSound';
import ControlPanel from './components/ui/ControlPanel';
import GameMenuFrame from './components/screens/GameMenuFrame';
import EndScreen from './components/screens/EndScreen';
import GameOptionsOverlay from './components/ui/GameOptionsOverlay';
import BuyModal from './components/modals/BuyModal';
import CardModal from './components/modals/CardModal';
import JailModal from './components/modals/JailModal';
import AuctionModal from './components/modals/AuctionModal';
import TradeModal from './components/modals/TradeModal';
import Board from './components/board/Board';
import CoinBurstEffect from './components/board/CoinBurstEffect';
import './styles/ui.css';
import './styles/modals.css';

export default function App() {
  const [runId, setRunId] = useState(0);
  return <GameRoot key={runId} onRestart={(clearSavedGame = true) => {
    if (clearSavedGame) clearSave();
    setRunId((r) => r + 1);
  }} />;
}

function GameRoot({ onRestart }) {
  const [difficulty] = useState('medium');
  const [tradeOpen, setTradeOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [timerNow, setTimerNow] = useState(Date.now);
  const [boardZoom, setBoardZoom] = useState(1);
  const [stageMetrics, setStageMetrics] = useState({ scale: 1, height: 576 });
  const [cardFlight, setCardFlight] = useState(null);
  const [coinBurstId, setCoinBurstId] = useState(0);
  const stageViewportRef = useRef(null);
  const cardFlightIdRef = useRef(0);
  const coinStateRef = useRef({ phase: 'setup', balances: new Map(), latestLog: null });
  const game = useGameState();
  const multiplayer = useMultiplayer(game);
  const gameView = multiplayer.room
    ? { ...game, ...multiplayer.actionHandlers }
    : game;
  const sound = useSound();
  const turnDeadline = game.turnStartedAt && game.settings?.turnSeconds
    ? game.turnStartedAt + game.settings.turnSeconds * 1000
    : null;
  const turnExpired = Boolean(
    multiplayer.room &&
    game.phase === 'playing' &&
    turnDeadline &&
    timerNow >= turnDeadline
  );
  const forceTimeoutAI = turnExpired && multiplayer.isHost && !game.currentPlayer?.isAI;
  const aiGame = forceTimeoutAI
    ? { ...game, currentPlayer: { ...game.currentPlayer, isAI: true } }
    : game;

  useEffect(() => {
    const viewport = stageViewportRef.current;
    if (!viewport) return undefined;

    const updateScale = () => {
      const { width, height } = viewport.getBoundingClientRect();
      if (!width || !height) return;

      const landscape = width >= height;
      const scale = landscape
        ? Math.min(width / 1024, height / 460)
        : Math.min(width / 1024, height / 576);
      const stageHeight = landscape ? height / scale : 576;
      setStageMetrics((current) =>
        Math.abs(current.scale - scale) > 0.001 ||
        Math.abs(current.height - stageHeight) > 0.5
          ? { scale, height: stageHeight }
          : current
      );
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    window.visualViewport?.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    updateScale();
    return () => {
      observer.disconnect();
      window.visualViewport?.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, [game.phase]);

  useEffect(() => {
    if (
      !multiplayer.room ||
      game.phase !== 'playing' ||
      !turnDeadline ||
      turnExpired
    ) return undefined;
    const updateTime = () => setTimerNow(Date.now());
    updateTime();
    const timer = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(timer);
  }, [game.phase, multiplayer.room?.id, turnDeadline, turnExpired]);

  useAI(
    aiGame,
    gameView,
    difficulty,
    !multiplayer.room || multiplayer.isHost,
    game.settings?.speed,
    forceTimeoutAI,
  );

  // ── AUTO-SAVE: simpan tiap state berubah saat bermain ──────────
  useEffect(() => {
    if (game.phase === 'playing' && !multiplayer.room) saveGame(game);
    if (game.phase === 'ended' && !multiplayer.room) clearSave();
  }, [
    game.players, game.currentPlayerIndex, game.waitingFor, game.phase, game.owners,
    game.houses, game.hotels, game.freeParkingPool, game.canRoll, game.landResult,
    game.activeCard, game.auction, game.pendingDebt, game.pendingTrade,
    multiplayer.room,
  ]);

  useEffect(() => {
    const previous = coinStateRef.current;
    const balances = new Map(game.players.map((player) => [player.id, player.money]));
    const gainedMoney = game.phase === 'playing' && previous.phase === 'playing' &&
      game.players.some((player) =>
        previous.balances.has(player.id) && player.money > previous.balances.get(player.id)
      );
    const latestLog = game.log[0];
    const latestLogKey = latestLog ? `${latestLog.ts}:${latestLog.text}` : null;
    const loggedCoinEvent = game.phase === 'playing' && previous.phase === 'playing' &&
      latestLogKey && latestLogKey !== previous.latestLog &&
      /membeli|membangun rumah|membangun hotel|memenangkan lelang|menarik kartu/i.test(latestLog.text);

    if (gainedMoney || loggedCoinEvent) setCoinBurstId((id) => id + 1);
    coinStateRef.current = {
      phase: game.phase,
      balances,
      latestLog: latestLogKey,
    };
  }, [game.players, game.phase, game.log]);

  // ── SUARA: picu efek berdasar perubahan state ──────────────────
  const prevRef = useRef({ roll: null, waitingFor: null, phase: 'setup', logKey: null });
  useEffect(() => {
    const prev = prevRef.current;

    if (game.lastRoll && game.lastRoll !== prev.roll) sound.play('dice');

    if (game.waitingFor !== prev.waitingFor) {
      if (game.waitingFor === 'PAY_RENT') sound.play('rent');
      else if (game.waitingFor === 'DRAW_CARD') sound.play('click');
    }

    // Deteksi event tertentu dari baris log terbaru. Entri baru ada di log[0]
    // (log dibatasi 50 baris, jadi panjang log tidak bisa dipakai sebagai penanda).
    const latestLog = game.log[0];
    const logKey = latestLog ? `${latestLog.ts}:${latestLog.text}` : null;
    if (logKey && logKey !== prev.logKey && prev.phase === 'playing' && game.phase === 'playing') {
      const logSound = soundForLogText(latestLog.text);
      if (logSound) sound.play(logSound);
    }

    if (game.phase === 'ended' && prev.phase !== 'ended') sound.play('win');

    prevRef.current = {
      roll: game.lastRoll,
      waitingFor: game.waitingFor,
      phase: game.phase,
      logKey,
    };
  }, [game.lastRoll, game.waitingFor, game.phase, game.log, sound]);

  const restartGame = () => {
    if (multiplayer.room) multiplayer.leaveRoom().finally(() => onRestart(false));
    else onRestart();
  };
  const exitToMenu = () => {
    if (multiplayer.room) multiplayer.leaveRoom().finally(() => onRestart(false));
    else onRestart(false);
  };
  const drawCardFromBoard = useCallback((deck, rect) => {
    setCardFlight({ id: ++cardFlightIdRef.current, deck, rect });
    gameView.drawCard();
  }, [gameView.drawCard]);
  const finishCardFlight = useCallback((id) => {
    setCardFlight((current) => current?.id === id ? null : current);
  }, []);

  // ── SETUP ──────────────────────────────────────────────────────
  if (game.phase === 'setup') {
    const saveSummary = peekSave();
    const menuSaveSlots = peekSaveSlots().map((slot) => {
      if (slot.savedAt) return slot;
      return slot.slot === 1 && saveSummary ? { slot: 1, ...saveSummary } : null;
    }).filter(Boolean);
    return (
      <GameMenuFrame
        multiplayer={multiplayer}
        sound={sound}
        saveSlots={menuSaveSlots}
        onStartOffline={(setups, settings) => {
          clearSave();
          game.startGame(setups, settings);
        }}
        onLoadSlot={(slot) => {
          const snap = loadGameFromSlot(slot) || (slot === 1 ? loadSaved() : null);
          if (!snap) return false;
          game.loadGame(snap);
          return true;
        }}
        onDeleteSave={(slot) => {
          const hadManualSave = peekSaveSlots().some((save) => save.slot === slot && save.savedAt);
          const clearedManualSave = clearSaveSlot(slot);
          if (slot === 1) clearSave();
          return hadManualSave || (slot === 1 && Boolean(saveSummary && clearedManualSave));
        }}
      />
    );
  }

  // ── ENDED ───────────────────────────────────────────────────────
  if (game.phase === 'ended') {
    return <EndScreen game={game} onRestart={restartGame} />;
  }

  // ── PLAYING ─────────────────────────────────────────────────────
  return (
    <div className="game-viewport" ref={stageViewportRef}>
      <div
        className={`game-stage${game.players.length > 3 ? ' game-stage--many-players' : ''}`}
        style={{
          '--stage-scale': stageMetrics.scale,
          '--stage-height': `${stageMetrics.height}px`,
        }}
      >
        <div className="game-stage-brand" aria-label="Millionaire Indonesia">
          <strong>MILLIONAIRE</strong>
          <span>INDONESIA</span>
        </div>
        <div className="game-stage-round" aria-hidden="true">
          <small>BABAK</small>
          <strong>{Math.floor((game.turnCount || 0) / Math.max(game.players.length, 1)) + 1}</strong>
        </div>
        {!gameView.currentPlayer?.isAI && (
          <button
            className="game-stage-trade"
            type="button"
            aria-label="Buka Trade"
            title="Trade"
            disabled={!!gameView.waitingFor}
            onClick={() => setTradeOpen(true)}
          >
            🤝
          </button>
        )}
        <div className="app-layout">
          {multiplayer.room && (
            <div className="online-hud">
              <span>Room <strong>{multiplayer.room.code}</strong></span>
              <span>{multiplayer.localPlayer?.name}</span>
              <span className="online-save-status">
                {turnExpired && !game.currentPlayer?.isAI
                  ? 'Waktu habis · AI mengambil alih'
                  : turnDeadline
                    ? `Sisa giliran: ${Math.max(0, Math.ceil((turnDeadline - timerNow) / 1000))} dtk`
                    : 'Tersimpan otomatis'}
              </span>
              {multiplayer.error && <span className="online-hud-error" role="alert">{multiplayer.error}</span>}
            </div>
          )}
          <div className="app-board-area">
            <Board
              gameState={gameView}
              zoom={boardZoom}
              onZoomChange={setBoardZoom}
              onDrawCard={drawCardFromBoard}
            />
            {coinBurstId > 0 && <CoinBurstEffect key={coinBurstId} />}
          </div>

          <ControlPanel
            game={gameView}
            difficulty={difficulty}
            sound={sound}
            onOpenOptions={() => setOptionsOpen(true)}
            optionsOpen={optionsOpen}
          />

          <BuyModal game={gameView} />
          <CardModal
            game={gameView}
            cardFlight={cardFlight}
            onCardFlightComplete={finishCardFlight}
          />
          <JailModal game={gameView} />
          <AuctionModal game={gameView} difficulty={difficulty} />
          <TradeModal
            game={gameView}
            difficulty={difficulty}
            open={tradeOpen}
            onClose={() => setTradeOpen(false)}
          />
          {optionsOpen && (
            <GameOptionsOverlay
              game={gameView}
              sound={sound}
              onClose={() => setOptionsOpen(false)}
              onQuit={exitToMenu}
            />
          )}
        </div>
      </div>
      <div className="game-stage-rotate">
        <div>📱↻<br />Putar perangkat ke mode landscape</div>
      </div>
    </div>
  );
}