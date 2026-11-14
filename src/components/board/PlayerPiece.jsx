// ============================================================
// PlayerPiece.jsx — Bidak pemain yang bergerak di atas board.
//
// Upgrade P2: animasi LANGKAH-DEMI-LANGKAH.
//   Dulu: satu transisi transform langsung ke posisi akhir.
//   Kini: bidak melompati tiap petak antara (searah jarum jam),
//   satu per satu, sehingga terlihat "berjalan" mengelilingi papan.
//
// Props dari Board.jsx:
//   player        — { id, name, piece, inJail, money, position }
//   resolveCenter — (squareId) => { x, y } koordinat px tengah petak
//   offset        — { dx, dy } geser saat berbagi petak
//   color         — hex warna pemain
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { ANIMATION } from '../../constants/config';
import PieceModel from './PieceModel';

const PIECE_SIZE = 46;          // diameter bidak (px)
const STEP_MS = ANIMATION.PIECE_MOVE_DURATION; // ms per petak
const PlayerPiece = ({ player, resolveCenter, routeIds, offset = { dx: 0, dy: 0 }, color }) => {
  const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';

  // Posisi yang sedang DITAMPILKAN (bisa tertinggal dari player.position saat animasi)
  const [shownPos, setShownPos] = useState(player.position);
  const [hopping, setHopping] = useState(false);
  const prevPosRef = useRef(player.position);
  const timerRef = useRef(null);

  useEffect(() => {
    const target = player.position;
    const from = prevPosRef.current;
    if (target === from) return;

    const fromIndex = routeIds.indexOf(from);
    const targetIndex = routeIds.indexOf(target);
    const forwardSteps = fromIndex < 0 || targetIndex < 0
      ? Infinity
      : (targetIndex - fromIndex + routeIds.length) % routeIds.length;
    const isNormalMove = forwardSteps > 0 && forwardSteps <= 12;

    clearTimeout(timerRef.current);

    if (!isNormalMove) {
      // Teleport (kartu/penjara) → langsung, tanpa hop antar petak
      setShownPos(target);
      prevPosRef.current = target;
      return;
    }

    // Animasi melangkah satu petak setiap STEP_MS
    let currentIndex = fromIndex;
    setHopping(true);
    const stepOnce = () => {
      currentIndex = (currentIndex + 1) % routeIds.length;
      const current = routeIds[currentIndex];
      setShownPos(current);
      if (current === target) {
        setHopping(false);
        prevPosRef.current = target;
        return;
      }
      timerRef.current = setTimeout(stepOnce, STEP_MS);
    };
    timerRef.current = setTimeout(stepOnce, STEP_MS);

    return () => clearTimeout(timerRef.current);
  }, [player.position, routeIds]);

  const center = resolveCenter(shownPos);
  const cx = center.x + offset.dx;
  const cy = center.y + offset.dy;

  const tooltip = [
    `${player.name} (${player.piece})`,
    `Uang: Rp ${fmt(player.money)}`,
    player.inJail ? '🔒 Di penjara' : null,
  ].filter(Boolean).join(' — ');

  return (
    <div
      className={`player-piece${player.inJail ? ' player-piece--jailed' : ''}${hopping ? ' player-piece--hopping' : ''}`}
      style={{
        '--cx': cx,
        '--cy': cy,
        '--clr': color,
        '--sz': `${PIECE_SIZE}px`,
        '--dur': `${STEP_MS}ms`,
      }}
      title={tooltip}
    >
      <div className="piece-inner">
        <PieceModel piece={player.piece} color={color} />
        {player.inJail && (
          <span className="piece-jail-badge" aria-label="Di penjara">🔒</span>
        )}
        <div className="piece-label" aria-hidden="true">{player.name}</div>
      </div>
    </div>
  );
};

export default PlayerPiece;