// ============================================================
// App.jsx — Root aplikasi.
// Fase: setup → playing → ended. Menyambungkan useGameState,
// useAI, lapisan modal, plus fitur Prioritas 3:
//   • Auto-save ke localStorage tiap state berubah (saat playing)
//   • Tombol "Lanjutkan" di SetupScreen untuk memuat save
//   • Efek suara via useSound (dipicu dari perubahan state)
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { useGameState } from './hooks/useGameState';
import { useAI } from './hooks/useAI';
import { useSound } from './hooks/useSound';
import { saveGame, loadGame as loadSaved, peekSave, clearSave } from './utils/saveGame';
import Board from './components/board/Board';
import ControlPanel from './components/ui/ControlPanel';
import SetupScreen from './components/screens/SetupScreen';
import EndScreen from './components/screens/EndScreen';
import BuyModal from './components/modals/BuyModal';
import CardModal from './components/modals/CardModal';
import JailModal from './components/modals/JailModal';
import AuctionModal from './components/modals/AuctionModal';
import TradeModal from './components/modals/TradeModal';
import './styles/ui.css';
import './styles/modals.css';

export default function App() {
  const [runId, setRunId] = useState(0);
  return <GameRoot key={runId} onRestart={() => { clearSave(); setRunId((r) => r + 1); }} />;
}

function GameRoot({ onRestart }) {
  const [difficulty, setDifficulty] = useState('medium');
  const [tradeOpen, setTradeOpen] = useState(false);
  const game = useGameState();
  const sound = useSound();

  useAI(game, game, difficulty);

  // ── AUTO-SAVE: simpan tiap state berubah saat bermain ──────────
  useEffect(() => {
    if (game.phase === 'playing') saveGame(game);
    if (game.phase === 'ended') clearSave();
  }, [game.players, game.currentPlayerIndex, game.waitingFor, game.phase, game.owners]);

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

  // ── SETUP ──────────────────────────────────────────────────────
  if (game.phase === 'setup') {
    return (
      <SetupScreen
        difficulty={difficulty}
        onChangeDifficulty={setDifficulty}
        onStart={(setups) => { clearSave(); game.startGame(setups); }}
        savedInfo={peekSave()}
        onContinue={() => {
          const snap = loadSaved();
          if (snap) game.loadGame(snap);
        }}
      />
    );
  }

  // ── ENDED ───────────────────────────────────────────────────────
  if (game.phase === 'ended') {
    return <EndScreen game={game} onRestart={onRestart} />;
  }

  // ── PLAYING ─────────────────────────────────────────────────────
  return (
    <div className="app-layout">
      <div className="app-board-area">
        <Board gameState={game} />
      </div>

      <ControlPanel
        game={game}
        difficulty={difficulty}
        onQuit={onRestart}
        onOpenTrade={() => setTradeOpen(true)}
        sound={sound}
      />

      <BuyModal game={game} />
      <CardModal game={game} />
      <JailModal game={game} />
      <AuctionModal game={game} difficulty={difficulty} />
      <TradeModal
        game={game}
        difficulty={difficulty}
        open={tradeOpen}
        onClose={() => setTradeOpen(false)}
      />
    </div>
  );
}