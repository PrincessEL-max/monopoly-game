const BASE = '/millionaire-game/assets';

const SPECIAL_SQUARE_NAMES = {
  'RRC (China)': 'rrc_china',
};

export const getPropertyCardImage = (square) => {
  if (!square || !['property', 'airport', 'utility'].includes(square.type)) return '';

  const prefix = square.type === 'airport'
    ? 'stn'
    : square.type === 'utility'
      ? 'utl'
      : 'prop';
  const name = SPECIAL_SQUARE_NAMES[square.name] || square.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return `${BASE}/cards/${prefix}_${name}.webp`;
};

export const MILLIONAIRE_UI_ASSETS = {
  controlBase: `${BASE}/ui/ctl_base.png`,
  settings: `${BASE}/ui/btn_pengaturan.png`,
  cards: `${BASE}/ui/btn_kartu.png`,
  assets: `${BASE}/ui/btn_aset.png`,
  roll: `${BASE}/ui/btn_kocok.png`,
  endTurn: `${BASE}/ui/btn_akhiri.png`,
  assetFrame: `${BASE}/ui/aset_frame.png`,
  assetEmpty: `${BASE}/ui/aset_kosong.png`,
  assetMortgage: `${BASE}/ui/aset_gadai.png`,
  assetBuild: `${BASE}/ui/aset_bangun.png`,
  cardBackChance: `${BASE}/cards/back_ch.webp`,
  cardBackChest: `${BASE}/cards/back_cc.webp`,
};
