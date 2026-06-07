// ============================================================
// PlayerCard.jsx — Kartu info satu pemain.
//
// Upgrade P2: tampilkan NET WORTH (total kekayaan: kas + nilai
// properti + bangunan) memakai calcNetWorth, di samping kas.
// ============================================================

import React from 'react';
import { PLAYER_COLORS } from '../board/Board';
import { SQUARES } from '../../constants/squares';
import { calcNetWorth } from '../../logic/rentLogic';

const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';

export default function PlayerCard({ player, game, isCurrent }) {
  const owners = game?.owners ?? {};
  const color = PLAYER_COLORS[player.id] ?? '#999';
  const propCount = SQUARES.filter((s) => owners[s.id] === player.id).length;
  const netWorth = game ? calcNetWorth(player, game) : player.money;

  const cls = [
    'pcard',
    isCurrent ? 'pcard--current' : '',
    player.bankrupt ? 'pcard--bankrupt' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} style={{ '--pc': color }}>
      <div className="pcard-head">
        <span className="pcard-piece" style={{ background: color }}>
          {player.piece}
        </span>
        <span className="pcard-name">
          {player.name}
          {player.isAI ? ' 🤖' : ''}
        </span>
        {player.inJail && <span className="pcard-jail" title="Di penjara">🔒</span>}
      </div>

      <div className="pcard-money">${fmt(player.money)}</div>

      <div className="pcard-stats">
        <span>{propCount} properti</span>
        <span className="pcard-networth" title="Total kekayaan (kas + properti + bangunan)">
          NW ${fmt(netWorth)}
        </span>
        {player.bankrupt && <span className="pcard-bk">BANGKRUT</span>}
      </div>
    </div>
  );
}