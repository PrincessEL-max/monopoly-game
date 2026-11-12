// ============================================================
// PlayerCard.jsx — Kartu info satu pemain.
// ============================================================

import React from 'react';
import { SQUARES } from '../../constants/squares';
import { calcNetWorth } from '../../logic/rentLogic';

const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';

const PLAYER_SKINS = [
  { color: '#f3bb2e', from: '#6b4a12', to: '#3a2708', name: '#f4d7b4', avatar: 'avatar_gold', hue: 0 },
  { color: '#4aa8ff', from: '#2a4580', to: '#172a52', name: '#c3d4ec', avatar: 'avatar_blue', hue: 0 },
  { color: '#43d46a', from: '#215c37', to: '#123a22', name: '#c3edc9', avatar: 'avatar_green', hue: 0 },
  { color: '#b78bff', from: '#4d3182', to: '#2c1a50', name: '#e0d0f6', avatar: 'avatar_blue', hue: 75 },
  { color: '#ff9a3c', from: '#7d4817', to: '#482709', name: '#ffdcb4', avatar: 'avatar_green', hue: -95 },
  { color: '#ff6b6b', from: '#7d2c30', to: '#4a1519', name: '#ffcdcd', avatar: 'avatar_blue', hue: 150 },
];

export default function PlayerCard({ player, game, isCurrent }) {
  const owners = game?.owners ?? {};
  const skin = PLAYER_SKINS[player.id % PLAYER_SKINS.length];
  const propCount = SQUARES.filter((square) => owners[square.id] === player.id).length;
  const netWorth = game ? calcNetWorth(player, game) : player.money;
  const cls = [
    'pcard',
    isCurrent ? 'pcard--current' : '',
    player.bankrupt ? 'pcard--bankrupt' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      style={{
        '--pc': skin.color,
        '--g1': skin.from,
        '--g2': skin.to,
        '--nc': skin.name,
      }}
    >
      <div className="pcard-body" />
      <span className="pcard-piece" style={{ '--token-color': skin.color }}>
        <img
          className="pcard-avatar"
          src={`/millionaire-game/assets/ui/${skin.avatar}.png`}
          alt=""
          draggable={false}
          style={{ filter: `hue-rotate(${skin.hue}deg)` }}
        />
      </span>
      <span className="pcard-name">
        {player.name}
        {player.isAI ? ' 🤖' : ''}
      </span>
      {player.inJail && <span className="pcard-jail" title="Di penjara">🔒</span>}
      <div className="pcard-money">Rp {fmt(player.money)}</div>
      <div className="pcard-stats">
        <span>{propCount} properti</span>
        <span className="pcard-networth" title="Total kekayaan (kas + properti + bangunan)">
          NW Rp {fmt(netWorth)}
        </span>
        {player.bankrupt && <span className="pcard-bk">BANGKRUT</span>}
      </div>
      {isCurrent && (
        <div className="pcard-turn">
          GILIRAN {player.isAI ? 'BOT' : 'ANDA'}
        </div>
      )}
    </div>
  );
}
