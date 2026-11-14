import React, { useMemo } from 'react';

const COIN_COUNT = 20;

export default function CoinBurstEffect() {
  const coins = useMemo(() => Array.from({ length: COIN_COUNT }, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 55 + Math.random() * 95;
    return {
      id: index,
      x: `${Math.cos(angle) * distance}px`,
      y: `${Math.sin(angle) * distance - 20}px`,
      delay: `${Math.random() * 130}ms`,
      spin: `${Math.random() * 540 - 270}deg`,
    };
  }), []);

  return (
    <div className="coin-burst-effect" aria-hidden="true">
      {coins.map((coin) => (
        <span
          className="coin-burst-effect__coin"
          key={coin.id}
          style={{
            '--coin-x': coin.x,
            '--coin-y': coin.y,
            '--coin-delay': coin.delay,
            '--coin-spin': coin.spin,
          }}
        >
          Rp
        </span>
      ))}
    </div>
  );
}
