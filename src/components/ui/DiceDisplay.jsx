// ============================================================
// DiceDisplay.jsx — Lemparan dua dadu 3D di atas papan.
// Props: roll = { d1, d2, total, isDouble } | null
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { ANIMATION } from '../../constants/config';

export default function DiceDisplay({
  roll,
  rollDuration = ANIMATION.DICE_ROLL_DURATION,
  onRollingChange,
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const pendingRollRef = useRef(null);
  const timeoutRef = useRef(null);
  const landTimeoutRef = useRef(null);
  const lastRollRef = useRef(null);
  const startRollRef = useRef(null);
  const finishRollRef = useRef(null);
  const [display, setDisplay] = useState({ d1: 1, d2: 1 });
  const [rolling, setRolling] = useState(false);
  const [landed, setLanded] = useState(false);
  const [rendererReady, setRendererReady] = useState(false);
  const [rendererError, setRendererError] = useState('');
  const hasRoll = Boolean(roll);

  finishRollRef.current = (result) => {
    rendererRef.current?.settle(result);
    setDisplay({ d1: result.d1, d2: result.d2 });
    setRolling(false);
    setLanded(true);
    onRollingChange?.(false);
    landTimeoutRef.current = setTimeout(() => setLanded(false), 400);
  };
  startRollRef.current = (result, duration) => {
    if (!rendererRef.current) {
      pendingRollRef.current = { result, duration };
      return;
    }
    rendererRef.current.roll(result, duration);
    timeoutRef.current = setTimeout(() => finishRollRef.current?.(result), duration);
  };

  useEffect(() => {
    if (!hasRoll || rendererRef.current) return undefined;
    let cancelled = false;
    let createdRenderer = null;

    import('../../logic/diceRenderer3D.js')
      .then(({ createDiceRenderer }) => {
        if (cancelled) return;
        createdRenderer = createDiceRenderer(canvasRef.current);
        rendererRef.current = createdRenderer;
        setRendererReady(true);

        const pending = pendingRollRef.current;
        if (pending) {
          pendingRollRef.current = null;
          startRollRef.current?.(pending.result, pending.duration);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Unable to load the 3D dice renderer.', error);
        setRendererError('Animasi 3D dadu tidak dapat dimuat di perangkat ini.');
        const pending = pendingRollRef.current;
        pendingRollRef.current = null;
        if (pending) finishRollRef.current?.(pending.result);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
      clearTimeout(landTimeoutRef.current);
      createdRenderer?.dispose();
      if (rendererRef.current === createdRenderer) rendererRef.current = null;
      setRendererReady(false);
    };
  }, [hasRoll]);

  useEffect(() => {
    if (!roll) {
      lastRollRef.current = null;
      pendingRollRef.current = null;
      setRolling(false);
      setLanded(false);
      onRollingChange?.(false);
      return undefined;
    }
    if (roll === lastRollRef.current) return undefined;
    lastRollRef.current = roll;

    clearTimeout(timeoutRef.current);
    clearTimeout(landTimeoutRef.current);
    setRolling(true);
    setLanded(false);
    onRollingChange?.(true);
    startRollRef.current?.(roll, rollDuration);

    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(landTimeoutRef.current);
    };
  }, [roll, rollDuration, onRollingChange]);

  return (
    <div
      className={`dice-wrap${hasRoll ? ' dice-wrap--active' : ' dice-wrap--idle'}${rendererReady ? ' dice-wrap--ready' : ''}${rolling ? ' dice-wrap--rolling' : ''}${landed ? ' dice-wrap--landed' : ''}`}
      role="group"
      aria-label={roll
        ? rolling
          ? 'Dadu sedang dilempar'
          : `Hasil dadu ${display.d1} dan ${display.d2}`
        : 'Dadu belum dilempar'}
    >
      <canvas className="dice-canvas" ref={canvasRef} aria-hidden="true" />
      {(!hasRoll || !rendererReady) && (
        <div className="dice-placeholder" aria-hidden="true">
          <div className="die die--empty">?</div>
          <div className="die die--empty">?</div>
        </div>
      )}
      {rendererError && <span className="dice-render-error" role="alert">{rendererError}</span>}
      {roll && (
        <>
          <span className="sr-only" aria-live="polite">
            Dadu {display.d1} dan {display.d2}, total {roll.total}
          </span>
          <div className="dice-total">
            {rolling ? '…' : <>= {roll.total}</>}
            {!rolling && roll.isDouble && <span className="dice-double">DOUBLE!</span>}
          </div>
        </>
      )}
    </div>
  );
}
