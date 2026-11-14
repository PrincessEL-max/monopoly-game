// ============================================================
// App.jsx — Root aplikasi.
// Fase: setup → playing → ended. Menyambungkan menu, reducer,
// multiplayer, AI, lapisan modal, dan auto-save:
//   • Auto-save ke localStorage tiap state berubah (saat playing)
//   • Tombol "Lanjutkan" untuk memuat save
//   • Efek suara via useSound (dipicu dari perubahan state)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAI } from './hooks/useAI';
import { useMultiplayer } from './hooks/useMultiplayer';
import { useSound } from './hooks/useSound';
import { saveGame, loadGame as loadSaved, peekSave, clearSave } from './utils/saveGame';
import ControlPanel from './components/ui/ControlPanel';
import GameMenuFrame from './components/screens/GameMenuFrame';
import EndScreen from './components/screens/EndScreen';
import BuyModal from './components/modals/BuyModal';
import CardModal from './components/modals/CardModal';
import JailModal from './components/modals/JailModal';
import AuctionModal from './components/modals/AuctionModal';
import TradeModal from './components/modals/TradeModal';
import Board from './components/board/Board';
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
  const [timerNow, setTimerNow] = useState(Date.now);
  const [boardZoom, setBoardZoom] = useState(1);
  const [stageMetrics, setStageMetrics] = useState({ scale: 1, height: 576 });
  const stageViewportRef = useRef(null);
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
  }, [game.players, game.currentPlayerIndex, game.waitingFor, game.phase, game.owners, multiplayer.room]);

  // ── SUARA: picu efek berdasar perubahan state ──────────────────
  const prevRef = useRef({ roll: null, waitingFor: null, phase: 'setup', logLen: 0 });
  useEffect(() => {
    const prev = prevRef.current;

    if (game.lastRoll && game.lastRoll !== prev.roll) sound.play('dice');

    if (game.waitingFor !== prev.waitingFor) {
      if (game.waitingFor === 'PAY_RENT') sound.play('rent');
      else if (game.waitingFor === 'DRAW_CARD') sound.play('click');
    }

    // Deteksi event tertentu dari baris log terbaru
    if (game.log.length > prev.logLen) {
      const latest = game.log[game.log.length - 1] || '';
      if (/membeli|memenangkan lelang/i.test(latest)) sound.play('buy');
      else if (/menerima|bonus|START/i.test(latest)) sound.play('money');
      else if (/penjara/i.test(latest)) sound.play('jail');
      else if (/bangkrut/i.test(latest)) sound.play('lose');
    }

    if (game.phase === 'ended' && prev.phase !== 'ended') sound.play('win');

    prevRef.current = {
      roll: game.lastRoll,
      waitingFor: game.waitingFor,
      phase: game.phase,
      logLen: game.log.length,
    };
  }, [game.lastRoll, game.waitingFor, game.phase, game.log, sound]);

  const restartGame = () => {
    if (multiplayer.room) multiplayer.leaveRoom().finally(() => onRestart(false));
    else onRestart();
  };

  // ── SETUP ──────────────────────────────────────────────────────
  if (game.phase === 'setup') {
    const saveSummary = peekSave();
    return (
      <GameMenuFrame
        multiplayer={multiplayer}
        sound={sound}
        saveSlots={saveSummary ? [{ slot: 1, ...saveSummary }] : []}
        onStartOffline={(setups, settings) => {
          clearSave();
          game.startGame(setups, settings);
        }}
        onContinue={() => {
          const snap = loadSaved();
          if (!snap) return false;
          game.loadGame(snap);
          return true;
        }}
        onDeleteSave={(slot) => {
          if (slot !== 1) return false;
          clearSave();
          return true;
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
            <Board gameState={gameView} zoom={boardZoom} onZoomChange={setBoardZoom} />
          </div>

          <ControlPanel
            game={gameView}
            difficulty={difficulty}
            onQuit={restartGame}
            sound={sound}
          />

          <BuyModal game={gameView} />
          <CardModal game={gameView} />
          <JailModal game={gameView} />
          <AuctionModal game={gameView} difficulty={difficulty} />
          <TradeModal
            game={gameView}
            difficulty={difficulty}
            open={tradeOpen}
            onClose={() => setTradeOpen(false)}
          />
        </div>
      </div>
      <div className="game-stage-rotate">
        <div>📱↻<br />Putar perangkat ke mode landscape</div>
      </div>
    </div>
  );
}