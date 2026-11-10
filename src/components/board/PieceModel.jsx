import React, { useEffect, useState } from 'react';
import '../../styles/piece-model.css';

const PIECE_TYPES = {
  '🚀': 'rocket',
  '🚗': 'car',
  '⚓': 'anchor',
  '🎩': 'hat',
  '🐶': 'dog',
  '💎': 'gem',
};

export default function PieceModel({ piece, color = '#f0c84b', className = '' }) {
  const type = PIECE_TYPES[piece] ?? 'gem';
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    import('../../logic/pieceModels3D')
      .then(({ startPieceRenderer }) => startPieceRenderer())
      .then(() => { if (active) setReady(true); })
      .catch((error) => {
        console.error('Gagal memuat model bidak 3D:', error);
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, []);

  return (
    <span
      className={`piece-model piece-model--${type} ${className}`}
      style={{ '--token-color': color }}
      data-piece={piece}
      data-color={color}
      aria-label={failed ? piece : undefined}
      role={failed ? 'img' : undefined}
    >
      {!ready && <span className="piece-model__fallback">{piece}</span>}
    </span>
  );
}
