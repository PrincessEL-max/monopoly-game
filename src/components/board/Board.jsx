// ============================================================
// Board.jsx — Papan utama Monopoli Internasional
//
// The active route determines the number of grid rows; tile IDs stay stable.
//
// Import dari file yang ada:
//   squares.js  → getSquaresForMap
//   config.js   → BOARD, COLORS
//   images.js   → (via BoardCenter)
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSquaresForMap } from '../../constants/squares';
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

const buildSquareLayout = (squares) => {
  const layout = {};
  const leftSquares = squares.filter((square) => square.id >= 11 && square.id <= 19);
  const rightSquares = squares.filter((square) => square.id >= 31 && square.id <= 39);
  const sideCount = leftSquares.length;
  const topCornerRow = 1;
  const bottomCornerRow = sideCount + 2;

  layout[0] = { row: bottomCornerRow, col: 11, side: 'corner' };
  layout[10] = { row: bottomCornerRow, col: 1, side: 'corner' };
  layout[20] = { row: topCornerRow, col: 1, side: 'corner' };
  layout[30] = { row: topCornerRow, col: 11, side: 'corner' };

  for (const square of squares) {
    const { id } = square;
    if (id >= 1 && id <= 9) {
      layout[id] = { row: bottomCornerRow, col: 11 - id, side: 'bottom' };
    } else if (id >= 11 && id <= 19) {
      const index = leftSquares.findIndex((candidate) => candidate.id === id);
      layout[id] = { row: bottomCornerRow - 1 - index, col: 1, side: 'left' };
    } else if (id >= 21 && id <= 29) {
      layout[id] = { row: topCornerRow, col: id - 19, side: 'top' };
    } else if (id >= 31 && id <= 39) {
      const index = rightSquares.findIndex((candidate) => candidate.id === id);
      layout[id] = { row: topCornerRow + 1 + index, col: 11, side: 'right' };
    }
  }

  return { layout, sideCount };
};

const SSQW = (BOARD.SIZE - 2 * BOARD.CORNER_SIZE) / BOARD.SQUARES_PER_SIDE; // ≈62.22
const C    = BOARD.CORNER_SIZE;                                               // 100
const BOARD_OUTER_WIDTH = BOARD.SIZE + 48;
const BOARD_RIGHT_EDGE = 676;

export const getSquarePxCenter = (id, map = 'nusantara') => {
  const squares = getSquaresForMap(map);
  const { layout, sideCount } = buildSquareLayout(squares);
  const squareLayout = layout[id];
  if (!squareLayout) return { x: BOARD.SIZE / 2, y: BOARD.SIZE / 2 };

  const boardHeight = 2 * C + sideCount * SSQW;
  if (squareLayout.side === 'corner') {
    return {
      x: squareLayout.col === 1 ? C / 2 : BOARD.SIZE - C / 2,
      y: squareLayout.row === 1 ? C / 2 : boardHeight - C / 2,
    };
  }
  if (squareLayout.side === 'bottom' || squareLayout.side === 'top') {
    return {
      x: C + (squareLayout.col - 2) * SSQW + SSQW / 2,
      y: squareLayout.side === 'top' ? C / 2 : boardHeight - C / 2,
    };
  }
  const sideIndex = squareLayout.row - 2;
  return {
    x: squareLayout.side === 'left' ? C / 2 : BOARD.SIZE - C / 2,
    y: C + (sideIndex + 0.5) * SSQW,
  };
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
const Board = ({ gameState, zoom: controlledZoom, onZoomChange }) => {
  const viewportRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const [localZoom, setLocalZoom] = useState(1);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const cameraOffsetRef = useRef(cameraOffset);
  const zoomRef = useRef(controlledZoom ?? localZoom);
  const suppressClickRef = useRef(false);
  const zoom = controlledZoom ?? localZoom;
  cameraOffsetRef.current = cameraOffset;
  zoomRef.current = zoom;
  const map = gameState?.settings?.map ?? 'nusantara';
  const squares = getSquaresForMap(map);
  const { layout: squareLayout, sideCount } = useMemo(
    () => buildSquareLayout(squares),
    [squares]
  );
  const routeIds = useMemo(() => squares.map((square) => square.id), [squares]);
  const boardHeight = 2 * C + sideCount * SSQW;
  const boardOuterHeight = boardHeight + 48;
  const {
    players         = [],
    owners          = {},
    houses          = {},
    hotels          = {},
    landResult      = null,
    freeParkingPool = 0,
  } = gameState || {};

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const updateScale = () => {
      setFitScale(Math.min(
        viewport.clientWidth / BOARD_OUTER_WIDTH,
        viewport.clientHeight / boardOuterHeight,
        BOARD_RIGHT_EDGE / BOARD_OUTER_WIDTH
      ));
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    updateScale();
    return () => observer.disconnect();
  }, [boardOuterHeight]);

  const moveCamera = (nextOffset) => {
    cameraOffsetRef.current = nextOffset;
    setCameraOffset(nextOffset);
  };
  const updateZoom = (nextZoom) => {
    zoomRef.current = nextZoom;
    if (onZoomChange) onZoomChange(nextZoom);
    else setLocalZoom(nextZoom);
  };
  const getViewportPoint = (clientX, clientY) => {
    const viewport = viewportRef.current;
    const rect = viewport.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (viewport.clientWidth / rect.width),
      y: (clientY - rect.top) * (viewport.clientHeight / rect.height),
    };
  };
  const zoomAtPoint = (point, factor) => {
    const viewport = viewportRef.current;
    const currentZoom = zoomRef.current;
    const nextZoom = Math.max(1, currentZoom * factor);
    if (nextZoom === currentZoom || fitScale <= 0) return;

    const currentScale = fitScale * currentZoom;
    const nextScale = fitScale * nextZoom;
    const currentCenterX =
      BOARD_RIGHT_EDGE - (BOARD_OUTER_WIDTH * currentScale) / 2 + cameraOffsetRef.current.x;
    const currentCenterY = viewport.clientHeight / 2 + cameraOffsetRef.current.y;
    const worldX = (point.x - currentCenterX) / currentScale;
    const worldY = (point.y - currentCenterY) / currentScale;
    const nextCameraOffset = {
      x: point.x - worldX * nextScale -
        (BOARD_RIGHT_EDGE - (BOARD_OUTER_WIDTH * nextScale) / 2),
      y: point.y - worldY * nextScale - viewport.clientHeight / 2,
    };

    moveCamera(nextCameraOffset);
    updateZoom(nextZoom);
  };
  const handleWheel = (event) => {
    const point = getViewportPoint(event.clientX, event.clientY);
    const delta = Math.max(-300, Math.min(300, event.deltaY));
    zoomAtPoint(point, Math.exp(-delta * 0.001));
  };
  const getPinchPoints = () => [...pointersRef.current.values()].slice(0, 2);
  const getPinchMetrics = (points) => {
    const [first, second] = points;
    return {
      center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
      distance: Math.hypot(second.x - first.x, second.y - first.y),
    };
  };
  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (pointersRef.current.size === 0) suppressClickRef.current = false;
    const point = getViewportPoint(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size < 2) return;
    const points = getPinchPoints();
    const { distance } = getPinchMetrics(points);
    const currentZoom = zoomRef.current;
    gestureRef.current = {
      type: 'pinch',
      startZoom: currentZoom,
      startDistance: Math.max(1, distance),
    };
    for (const [pointerId] of pointersRef.current) {
      if (!event.currentTarget.hasPointerCapture(pointerId)) {
        event.currentTarget.setPointerCapture(pointerId);
      }
    }
    suppressClickRef.current = true;
  };
  const handlePointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = getViewportPoint(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, point);

    const gesture = gestureRef.current;
    if (gesture?.type === 'pinch' && pointersRef.current.size >= 2) {
      const points = getPinchPoints();
      const { distance } = getPinchMetrics(points);
      const nextZoom = Math.max(1, gesture.startZoom * distance / gesture.startDistance);
      event.preventDefault();
      updateZoom(nextZoom);
    }
  };
  const handlePointerUp = (event) => {
    const gesture = gestureRef.current;
    if (gesture?.type === 'pinch') suppressClickRef.current = true;
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
  };
  const handleClickCapture = (event) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

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
  const boardSize = BOARD_OUTER_WIDTH * fitScale * zoom;

  return (
    <div
      className="board2d-viewport"
      ref={viewportRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => event.preventDefault()}
      style={{ aspectRatio: `${BOARD_OUTER_WIDTH} / ${boardOuterHeight}` }}
    >
    <div
      className="board-camera"
      style={{
        transform: `translate3d(${cameraOffset.x}px, ${cameraOffset.y}px, 0)`,
      }}
    >
    <div
      className="board-outer"
      style={{
        left: `${BOARD_RIGHT_EDGE - boardSize / 2}px`,
        top: '50%',
        width: `${BOARD_OUTER_WIDTH}px`,
        height: `${boardOuterHeight}px`,
        marginLeft: `${-BOARD_OUTER_WIDTH / 2}px`,
        marginTop: `${-boardOuterHeight / 2}px`,
        transform: `scale(${fitScale * zoom})`,
      }}
    >
      {/* Bingkai emas dekoratif */}
      <div className="board-frame">
        <div
          className="board-grid"
          style={{
            width: `${BOARD.SIZE}px`,
            height: `${boardHeight}px`,
            gridTemplateColumns: `${C}px repeat(${BOARD.SQUARES_PER_SIDE}, minmax(0, 1fr)) ${C}px`,
            gridTemplateRows: `${C}px repeat(${sideCount}, minmax(0, 1fr)) ${C}px`,
          }}
        >

          {squares.map(square => {
            const layout = squareLayout[square.id];
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
          <div
            className="board-center-area"
            style={{ gridRow: `2 / ${sideCount + 2}`, gridColumn: '2 / 11' }}
          >
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
                    resolveCenter={(id) => getSquarePxCenter(id, map)}
                    routeIds={routeIds}
                    offset={offset}
                    color={PLAYER_COLORS[player.id] ?? '#ffffff'}
                  />
                );
              })}
          </div>

        </div>
      </div>
    </div>
    </div>
    </div>
  );
};

export default Board;