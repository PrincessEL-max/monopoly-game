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
const BOARD_LEFT_SAFE_PADDING = 32;
const BOARD_BACKGROUND_WIDTH = 1024;
const BOARD_BACKGROUND_HEIGHT = 572;
const BOARD_TABLE_CENTER_X = 545;
const BOARD_TABLE_CENTER_Y = 365;
const BOARD_TABLE_WIDTH = 800;
const BOARD_TABLE_HEIGHT = 330;
const BOARD_TABLE_FILL_RATIO = 0.82;
const BOARD_2D_FILL_RATIO = 1;
const BOARD_TILT_DEGREES = 68;
const BOARD_TILT_RADIANS = BOARD_TILT_DEGREES * Math.PI / 180;
const BOARD_HEIGHT_PROJECTION = Math.cos(BOARD_TILT_RADIANS);
const BOARD_ROTATION_Z_DEGREES = 0;
const BOARD_ROTATION_Z_RADIANS = BOARD_ROTATION_Z_DEGREES * Math.PI / 180;
const BOARD_ROTATION_Z_COS = Math.cos(BOARD_ROTATION_Z_RADIANS);
const BOARD_ROTATION_Z_SIN = Math.sin(BOARD_ROTATION_Z_RADIANS);
const BOARD_PERSPECTIVE_GUARD = 1.1;
const getBackgroundCoverScale = (width, height) =>
  Math.max(width / BOARD_BACKGROUND_WIDTH, height / BOARD_BACKGROUND_HEIGHT);
const getBoardCenterX = (width, height, viewMode) => {
  if (viewMode === '2d') return width / 2;
  const backgroundScale = getBackgroundCoverScale(width, height);
  return width / 2 + (BOARD_TABLE_CENTER_X - BOARD_BACKGROUND_WIDTH / 2) * backgroundScale;
};
const getBoardCenterY = (width, height, viewMode) => {
  if (viewMode === '2d') return height / 2;
  const backgroundScale = getBackgroundCoverScale(width, height);
  return height / 2 + (BOARD_TABLE_CENTER_Y - BOARD_BACKGROUND_HEIGHT / 2) * backgroundScale;
};
const getProjectedBoardSize = (width, height, viewMode) => {
  const isTopDown = viewMode === '2d';
  const heightProjection = isTopDown ? 1 : BOARD_HEIGHT_PROJECTION;
  const perspectiveGuard = isTopDown ? 1 : BOARD_PERSPECTIVE_GUARD;
  return {
    width: (
      width * BOARD_ROTATION_Z_COS +
      height * BOARD_ROTATION_Z_SIN
    ) * perspectiveGuard,
    height: (
      width * BOARD_ROTATION_Z_SIN +
      height * BOARD_ROTATION_Z_COS
    ) * heightProjection * perspectiveGuard,
  };
};

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
const Board = ({ gameState, zoom: controlledZoom, onZoomChange, onCameraChange, onDrawCard }) => {
  const viewportRef = useRef(null);
  const [fitScale, setFitScale] = useState(1);
  const [localZoom, setLocalZoom] = useState(1);
  const [viewMode, setViewMode] = useState('3d');
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const cameraOffsetRef = useRef(cameraOffset);
  const zoomRef = useRef(controlledZoom ?? localZoom);
  const suppressClickRef = useRef(false);
  const zoom = controlledZoom ?? localZoom;
  cameraOffsetRef.current = cameraOffset;
  zoomRef.current = zoom;
  useEffect(() => {
    onCameraChange?.({ offset: cameraOffset, viewMode });
  }, [cameraOffset, viewMode, onCameraChange]);

  const map = gameState?.settings?.map ?? 'nusantara';
  const squares = getSquaresForMap(map);
  const { layout: squareLayout, sideCount } = useMemo(
    () => buildSquareLayout(squares),
    [squares]
  );
  const routeIds = useMemo(() => squares.map((square) => square.id), [squares]);
  const boardHeight = 2 * C + sideCount * SSQW;
  const boardOuterHeight = boardHeight + 48;
  const clampCameraOffset = (offset, scale, viewport) => {
    const projectedBoard = getProjectedBoardSize(BOARD_OUTER_WIDTH, boardOuterHeight, viewMode);
    const boardWidth = projectedBoard.width * scale;
    const boardScaledHeight = projectedBoard.height * scale;
    const boardCenterX = getBoardCenterX(viewport.clientWidth, viewport.clientHeight, viewMode);
    const boardLeft = boardCenterX - boardWidth / 2;
    const boardRight = boardCenterX + boardWidth / 2;
    const boardCenterY = getBoardCenterY(viewport.clientWidth, viewport.clientHeight, viewMode);
    const boardTop = boardCenterY - boardScaledHeight / 2;
    const boardBottom = boardTop + boardScaledHeight;
    const horizontalMin = boardWidth >= viewport.clientWidth
      ? viewport.clientWidth - boardRight
      : -boardLeft;
    const horizontalMax = boardWidth >= viewport.clientWidth
      ? -boardLeft
      : viewport.clientWidth - boardRight;
    const verticalMin = boardScaledHeight >= viewport.clientHeight
      ? viewport.clientHeight - boardBottom
      : -boardTop;
    const verticalMax = boardScaledHeight >= viewport.clientHeight
      ? -boardTop
      : viewport.clientHeight - boardBottom;

    return {
      x: Math.min(horizontalMax, Math.max(horizontalMin, offset.x)),
      y: Math.min(verticalMax, Math.max(verticalMin, offset.y)),
    };
  };
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
      const projectedBoard = getProjectedBoardSize(BOARD_OUTER_WIDTH, boardOuterHeight, viewMode);
      const boardCenterX = getBoardCenterX(viewport.clientWidth, viewport.clientHeight, viewMode);
      const boardCenterY = getBoardCenterY(viewport.clientWidth, viewport.clientHeight, viewMode);
      if (viewMode === '2d') {
        const availableWidth = Math.max(0, viewport.clientWidth - 64);
        const availableHeight = viewport.clientHeight;
        setFitScale(Math.min(
          availableWidth / projectedBoard.width,
          availableHeight / projectedBoard.height
        ) * BOARD_2D_FILL_RATIO);
        return;
      }

      const coverScale = getBackgroundCoverScale(viewport.clientWidth, viewport.clientHeight);
      const centeredWidth = Math.max(
        0,
        2 * Math.min(boardCenterX, viewport.clientWidth - boardCenterX) -
          2 * BOARD_LEFT_SAFE_PADDING
      );
      const centeredHeight = Math.max(
        0,
        2 * Math.min(boardCenterY, viewport.clientHeight - boardCenterY)
      );
      const tableWidth = Math.min(BOARD_TABLE_WIDTH * coverScale, centeredWidth);
      const tableHeight = Math.min(BOARD_TABLE_HEIGHT * coverScale, centeredHeight);
      setFitScale(Math.min(
        (tableWidth * BOARD_TABLE_FILL_RATIO) / projectedBoard.width,
        (tableHeight * BOARD_TABLE_FILL_RATIO) / projectedBoard.height
      ));
    };
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    updateScale();
    return () => observer.disconnect();
  }, [boardOuterHeight, viewMode]);

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

    if (nextZoom === 1) {
      moveCamera({ x: 0, y: 0 });
      updateZoom(1);
      return;
    }

    const currentScale = fitScale * currentZoom;
    const nextScale = fitScale * nextZoom;
    const boardCenterX = getBoardCenterX(viewport.clientWidth, viewport.clientHeight, viewMode);
    const boardCenterY = getBoardCenterY(viewport.clientWidth, viewport.clientHeight, viewMode);
    const heightProjection = viewMode === '2d' ? 1 : BOARD_HEIGHT_PROJECTION;
    const perspectiveGuard = viewMode === '2d' ? 1 : BOARD_PERSPECTIVE_GUARD;
    const currentCenterX = boardCenterX + cameraOffsetRef.current.x;
    const currentCenterY = boardCenterY + cameraOffsetRef.current.y;
    const projectedX =
      (point.x - currentCenterX) / (currentScale * perspectiveGuard);
    const projectedY =
      (point.y - currentCenterY) /
      (currentScale * heightProjection * perspectiveGuard);
    const worldX =
      projectedX * BOARD_ROTATION_Z_COS + projectedY * BOARD_ROTATION_Z_SIN;
    const worldY =
      -projectedX * BOARD_ROTATION_Z_SIN + projectedY * BOARD_ROTATION_Z_COS;
    const nextProjectedX =
      worldX * BOARD_ROTATION_Z_COS - worldY * BOARD_ROTATION_Z_SIN;
    const nextProjectedY =
      worldX * BOARD_ROTATION_Z_SIN + worldY * BOARD_ROTATION_Z_COS;
    const nextCameraOffset = {
      x: point.x -
        nextProjectedX * nextScale * perspectiveGuard -
        boardCenterX,
      y: point.y -
        nextProjectedY * nextScale * heightProjection * perspectiveGuard -
        boardCenterY,
    };

    moveCamera(clampCameraOffset(nextCameraOffset, nextScale, viewport));
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

    if (pointersRef.current.size === 1) {
      if (zoomRef.current > 1) {
        gestureRef.current = {
          type: 'pan',
          startPoint: point,
          startOffset: cameraOffsetRef.current,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      return;
    }

    const points = getPinchPoints();
    const { center, distance } = getPinchMetrics(points);
    gestureRef.current = {
      type: 'pinch',
      lastCenter: center,
      lastDistance: Math.max(1, distance),
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
      const { center, distance } = getPinchMetrics(points);
      const nextDistance = Math.max(1, distance);
      const viewport = viewportRef.current;
      const centerDelta = {
        x: center.x - gesture.lastCenter.x,
        y: center.y - gesture.lastCenter.y,
      };
      if (centerDelta.x || centerDelta.y) {
        moveCamera(clampCameraOffset({
          x: cameraOffsetRef.current.x + centerDelta.x,
          y: cameraOffsetRef.current.y + centerDelta.y,
        }, fitScale * zoomRef.current, viewport));
      }
      zoomAtPoint(center, nextDistance / gesture.lastDistance);
      gesture.lastCenter = center;
      gesture.lastDistance = nextDistance;
      event.preventDefault();
      return;
    }

    if (gesture?.type === 'pan' && pointersRef.current.size === 1) {
      const delta = {
        x: point.x - gesture.startPoint.x,
        y: point.y - gesture.startPoint.y,
      };
      if (!gesture.moved && Math.hypot(delta.x, delta.y) < 6) return;

      gesture.moved = true;
      suppressClickRef.current = true;
      event.preventDefault();
      moveCamera(clampCameraOffset({
        x: gesture.startOffset.x + delta.x,
        y: gesture.startOffset.y + delta.y,
      }, fitScale * zoomRef.current, viewportRef.current));
    }
  };
  const handlePointerUp = (event) => {
    const gesture = gestureRef.current;
    if (gesture?.type === 'pinch' || (gesture?.type === 'pan' && gesture.moved)) {
      suppressClickRef.current = true;
    }
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
  };
  const handleClickCapture = (event) => {
    if (event.target.closest('.board-view-toggle')) return;
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
  const toggleViewMode = () => {
    setViewMode((current) => current === '3d' ? '2d' : '3d');
    moveCamera({ x: 0, y: 0 });
    updateZoom(1);
  };

  return (
    <div
      className={`board2d-viewport board-view--${viewMode}`}
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
    <button
      type="button"
      className="board-view-toggle"
      aria-pressed={viewMode === '2d'}
      aria-label={`Beralih ke tampilan ${viewMode === '3d' ? '2D' : '3D'}`}
      title={`Beralih ke tampilan ${viewMode === '3d' ? '2D' : '3D'}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        toggleViewMode();
      }}
    >
      {viewMode === '3d' ? '2D' : '3D'}
    </button>
    <div
      className="board-camera"
      style={{
        transform: `translate3d(${cameraOffset.x}px, ${cameraOffset.y}px, 0)`,
      }}
    >
    <div
      className="board-outer"
      style={{
        left: `${getBoardCenterX(
          viewportRef.current?.clientWidth || 0,
          viewportRef.current?.clientHeight || 0,
          viewMode
        )}px`,
        top: `${getBoardCenterY(
          viewportRef.current?.clientWidth || 0,
          viewportRef.current?.clientHeight || 0,
          viewMode
        )}px`,
        width: `${BOARD_OUTER_WIDTH}px`,
        height: `${boardOuterHeight}px`,
        marginLeft: `${-BOARD_OUTER_WIDTH / 2}px`,
        marginTop: `${-boardOuterHeight / 2}px`,
        transform: `${viewMode === '2d' ? '' : `rotateX(${BOARD_TILT_DEGREES}deg) `}rotateZ(${BOARD_ROTATION_Z_DEGREES}deg) scale(${fitScale * zoom})`,
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
            <BoardCenter gameState={gameState} onDrawCard={onDrawCard} />
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