import React, { useEffect, useRef, useState } from 'react';
import { ANIMATION } from '../../constants/config';

const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value }) {
  const visiblePips = PIPS[value] ?? PIPS[1];

  return (
    <div className="dice-face" aria-hidden="true">
      {Array.from({ length: 9 }, (_, index) => (
        <span
          className={`dice-pip${visiblePips.includes(index) ? ' dice-pip--visible' : ''}`}
          key={index}
        />
      ))}
    </div>
  );
}

export default function DiceDisplay({
  roll,
  rollDuration = ANIMATION.DICE_ROLL_DURATION,
  onRollingChange,
}) {
  const finishTimeoutRef = useRef(null);
  const landTimeoutRef = useRef(null);
  const rollIntervalRef = useRef(null);
  const lastRollRef = useRef(null);
  const [display, setDisplay] = useState({ d1: 1, d2: 1 });
  const [rolling, setRolling] = useState(false);
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    if (!roll) {
      lastRollRef.current = null;
      clearTimeout(finishTimeoutRef.current);
      clearTimeout(landTimeoutRef.current);
      clearInterval(rollIntervalRef.current);
      setRolling(false);
      setLanded(false);
      onRollingChange?.(false);
      return undefined;
    }

    if (roll === lastRollRef.current) return undefined;
    lastRollRef.current = roll;

    clearTimeout(finishTimeoutRef.current);
    clearTimeout(landTimeoutRef.current);
    clearInterval(rollIntervalRef.current);
    setRolling(true);
    setLanded(false);
    onRollingChange?.(true);

    rollIntervalRef.current = setInterval(() => {
      setDisplay({
        d1: Math.floor(Math.random() * 6) + 1,
        d2: Math.floor(Math.random() * 6) + 1,
      });
    }, 85);
    finishTimeoutRef.current = setTimeout(() => {
      clearInterval(rollIntervalRef.current);
      setDisplay({ d1: roll.d1, d2: roll.d2 });
      setRolling(false);
      setLanded(true);
      onRollingChange?.(false);
      landTimeoutRef.current = setTimeout(() => setLanded(false), 400);
    }, Math.max(0, rollDuration));

    return () => {
      clearTimeout(finishTimeoutRef.current);
      clearTimeout(landTimeoutRef.current);
      clearInterval(rollIntervalRef.current);
    };
  }, [roll, rollDuration, onRollingChange]);

  return (
    <div
      className={`dice-wrap${roll ? ' dice-wrap--active' : ' dice-wrap--idle'}${rolling ? ' dice-wrap--rolling' : ''}${landed ? ' dice-wrap--landed' : ''}`}
      role="group"
      aria-label={roll
        ? rolling
          ? 'Dadu sedang dilempar'
          : `Hasil dadu ${display.d1} dan ${display.d2}`
        : 'Dadu belum dilempar'}
    >
      <div className="dice-faces" aria-hidden="true">
        <Die value={display.d1} />
        <Die value={display.d2} />
      </div>
      {roll && (
        <>
          <span className="sr-only" aria-live="polite">
            {rolling
              ? 'Dadu sedang dikocok'
              : `Dadu ${roll.d1} dan ${roll.d2}, total ${roll.total}`}
          </span>
        </>
      )}
    </div>
  );
}
