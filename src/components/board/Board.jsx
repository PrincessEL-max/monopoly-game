// ============================================================
// Board.jsx — Papan utama Monopoli Internasional
//
// Layout: CSS Grid 11×11
//   - Row/Col 1 = kiri/atas,  Row/Col 11 = kanan/bawah
//   - Kolom 1 & 11 = 100px (sudut), kolom 2–10 = 1fr (~62px)
//   - Pos 0 = START (sudut kanan bawah), searah jarum jam
//
// Import dari file yang ada:
//   squares.js  → SQUARES, KOMPLEX_COLORS
//   config.js   → BOARD, COLORS
//   images.js   → (via BoardCenter)
// ============================================================

import React, { useMemo } from 'react';
import { SQUARES } from '../../constants/squares';
import { BOARD, COLORS } from '../../constants/config';
import Square       from './Square';
import CornerSquare from './CornerSquare';
import BoardCenter  from './BoardCenter';
import PlayerPiece  from './PlayerPiece';
import '../../styles/board.css';

// ─────────────────────────────────────────────────────────────
// 1. SQUARE LAYOUT MAP
//    Petakan id petak → posisi grid (row, col) + sisi board
//
//    'side' menentukan orientasi strip warna komplex:
//      bottom → strip di atas (menghadap center = atas)
//      left   → strip di kanan (menghadap center = kanan)
//      top    → strip di bawah (menghadap center = bawah)
//      right  → strip di kiri (menghadap center = kiri)
// ─────────────────────────────────────────────────────────────

const buildSquareLayout = () => {
  const layout = {};

  for (const sq of SQUARES) {
    const { id } = sq;

    // ── Petak sudut ──────────────────────────────────────────
    if (id === 0)  { layout[id] = { row: 11, col: 11, side: 'corner' }; continue; } // GO       kanan bawah
    if (id === 10) { layout[id] = { row: 11, col: 1,  side: 'corner' }; continue; } // JAIL     kiri bawah
    if (id === 20) { layout[id] = { row: 1,  col: 1,  side: 'corner' }; continue; } // PARKING  kiri atas
    if (id === 30) { layout[id] = { row: 1,  col: 11, side: 'corner' }; continue; } // GOTOJAIL kanan atas

    // ── Sisi bawah (1–9): row 11, col 10→2 ──────────────────
    // id=1 → col 10, id=9 → col 2
    if (id >= 1  && id <= 9)  {
      layout[id] = { row: 11, col: 11 - id, side: 'bottom' };
      continue;
    }

    // ── Sisi kiri (11–19): col 1, row 10→2 ──────────────────
    // id=11 → row 10, id=19 → row 2
    if (id >= 11 && id <= 19) {
      layout[id] = { row: 11 - (id - 10), col: 1, side: 'left' };
      continue;
    }

    // ── Sisi atas (21–29): row 1, col 2→10 ──────────────────
    // id=21 → col 2, id=29 → col 10
    if (id >= 21 && id <= 29) {
      layout[id] = { row: 1, col: id - 19, side: 'top' };
      continue;
    }

    // ── Sisi kanan (31–39): col 11, row 2→10 ────────────────
    // id=31 → row 2, id=39 → row 10
    if (id >= 31 && id <= 39) {
      layout[id] = { row: id - 29, col: 11, side: 'right' };
      continue;
    }
  }

  return layout;
};

const SQUARE_LAYOUT = buildSquareLayout();

// ─────────────────────────────────────────────────────────────
// 2. PIXEL CENTER CALCULATOR
//    Hitung koordinat {x, y} tengah tiap petak dalam px
//    Dipakai PlayerPiece untuk posisi absolut bidak
//
//    Lebar cell sisi = (SIZE - 2×CORNER) / SQUARES_PER_SIDE
//                    = (760 - 200) / 9 ≈ 62.22 px
// ─────────────────────────────────────────────────────────────

const SSQW = (BOARD.SIZE - 2 * BOARD.CORNER_SIZE) / BOARD.SQUARES_PER_SIDE; // ≈62.22
const C    = BOARD.CORNER_SIZE;                                               // 100

export const getSquarePxCenter = (id) => {
  // Sudut
  if (id === 0)  return { x: BOARD.SIZE - C / 2, y: BOARD.SIZE - C / 2 }; // kanan bawah
  if (id === 10) return { x: C / 2,              y: BOARD.SIZE - C / 2 }; // kiri bawah
  if (id === 20) return { x: C / 2,              y: C / 2              }; // kiri atas
  if (id === 30) return { x: BOARD.SIZE - C / 2, y: C / 2              }; // kanan atas

  // Sisi bawah — y tetap (baris bawah), x bervariasi per kolom
  if (id >= 1 && id <= 9) {
    const col = 11 - id;                            // col 10→2
    return {
      x: C + (col - 2) * SSQW + SSQW / 2,
      y: BOARD.SIZE - C / 2,
    };
  }

  // Sisi kiri — x tetap (kolom kiri), y bervariasi per baris
  if (id >= 11 && id <= 19) {
    const row = 11 - (id - 10);                     // row 10→2
    return {
      x: C / 2,
      y: C + (row - 2) * SSQW + SSQW / 2,
    };
  }

  // Sisi atas — y tetap (baris atas), x bervariasi per kolom
  if (id >= 21 && id <= 29) {
    const col = id - 19;                            // col 2→10
    return {
      x: C + (col - 2) * SSQW + SSQW / 2,
      y: C / 2,
    };
  }

  // Sisi kanan — x tetap (kolom kanan), y bervariasi per baris
  if (id >= 31 && id <= 39) {
    const row = id - 29;                            // row 2→10
    return {
      x: BOARD.SIZE - C / 2,
      y: C + (row - 2) * SSQW + SSQW / 2,
    };
  }

  return { x: BOARD.SIZE / 2, y: BOARD.SIZE / 2 }; // fallback center
};

// ─────────────────────────────────────────────────────────────
// 3. PLAYER COLORS
//    Diekspor agar bisa dipakai Square, PlayerCard, dll.
//    Index sesuai player.id (0–5)
// ─────────────────────────────────────────────────────────────

export const PLAYER_COLORS = [
  COLORS.PLAYER_1, // 0 — merah
  COLORS.PLAYER_2, // 1 — biru
  COLORS.PLAYER_3, // 2 — hijau
  COLORS.PLAYER_4, // 3 — kuning
  COLORS.PLAYER_5, // 4 — ungu
  COLORS.PLAYER_6, // 5 — oranye
];

// ─────────────────────────────────────────────────────────────
// 4. OFFSET BIDAK (saat beberapa pemain di petak yang sama)
// ─────────────────────────────────────────────────────────────

const GROUP_OFFSETS = [
  { dx:  0,  dy:  0 },
  { dx: 10,  dy:  0 },
  { dx: -10, dy:  0 },
  { dx:  0,  dy: 10 },
  { dx: 10,  dy: 10 },
  { dx: -10, dy: 10 },
];

// ─────────────────────────────────────────────────────────────
// 5. BOARD COMPONENT
// ─────────────────────────────────────────────────────────────

/**
 * Props:
 *   gameState — full state dari useGameState():
 *     players, owners, houses, hotels, landResult, freeParkingPool
 */
const Board = ({ gameState }) => {
  const {
    players         = [],
    owners          = {},
    houses          = {},
    hotels          = {},
    landResult      = null,
    freeParkingPool = 0,
  } = gameState || {};

  // Kelompokkan pemain aktif per posisi (untuk offset bidak)
  const playersByPosition = useMemo(() => {
    const map = {};
    players
      .filter(p => !p.bankrupt)
      .forEach(player => {
        const pos = player.position;
        if (!map[pos]) map[pos] = [];
        map[pos].push(player);
      });
    return map;
  }, [players]);

  // ID petak yang sedang di-highlight (hasil landing)
  const highlightedId = landResult?.square?.id ?? null;

  return (
    <div className="board-outer">
      {/* Bingkai emas dekoratif */}
      <div className="board-frame">
        <div className="board-grid">

          {/* ── 40 Petak ──────────────────────────────────── */}
          {SQUARES.map(square => {
            const layout = SQUARE_LAYOUT[square.id];
            if (!layout) return null;

            const gridStyle = {
              gridRow:    layout.row,
              gridColumn: layout.col,
            };

            // ── Petak sudut ─────────────────────────────────
            if (layout.side === 'corner') {
              return (
                <CornerSquare
                  key={square.id}
                  square={square}
                  style={gridStyle}
                  players={players}
                  freeParkingPool={freeParkingPool}
                />
              );
            }

            // ── Petak biasa ─────────────────────────────────
            // Cari pemilik & status gadai
            const ownerId    = owners[square.id] ?? null;
            const ownerObj   = ownerId != null ? players.find(p => p.id === ownerId) : null;
            const isMortgaged = ownerObj?.mortgaged?.includes(square.id) ?? false;

            return (
              <Square
                key={square.id}
                square={square}
                side={layout.side}
                style={gridStyle}
                ownerId={ownerId}
                ownerColor={ownerId != null ? (PLAYER_COLORS[ownerId] ?? null) : null}
                players={players}
                houseCount={houses[square.id] || 0}
                hasHotel={(hotels[square.id] || 0) >= 1}
                isMortgaged={isMortgaged}
                isHighlighted={highlightedId === square.id}
              />
            );
          })}

          {/* ── Tengah Board ──────────────────────────────── */}
          <div className="board-center-area">
            <BoardCenter />
          </div>

          {/* ── Bidak Pemain (absolut overlay) ────────────── */}
          {/*
            Div ini position:absolute di dalam board-grid,
            pointer-events:none agar tidak block klik petak.
            Tiap PlayerPiece diposisikan via transform: translate.
          */}
          <div className="pieces-layer" aria-hidden="true">
            {players
              .filter(p => !p.bankrupt)
              .map(player => {
                const group        = playersByPosition[player.position] || [];
                const indexInGroup = group.findIndex(p => p.id === player.id);
                const offset       = GROUP_OFFSETS[Math.min(indexInGroup, GROUP_OFFSETS.length - 1)];

                return (
                  <PlayerPiece
                    key={player.id}
                    player={player}
                    resolveCenter={getSquarePxCenter}
                    offset={offset}
                    color={PLAYER_COLORS[player.id] ?? '#ffffff'}
                  />
                );
              })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Board;