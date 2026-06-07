import React from 'react';
import { KOMPLEX_COLORS } from '../../constants/squares';
import { LANDMARK_IMAGES } from '../../constants/images';
import { COLORS } from '../../constants/config';

const TYPE_ICON = {
  airport:         '✈️',
  utility:         '⚡',
  chance:          '❓',
  community_chest: '📦',
  tax:             '💸',
};

const TYPE_BG = {
  airport:         COLORS.AIRPORT_BG,
  utility:         COLORS.UTILITY_BG,
  chance:          COLORS.CHANCE_BG,
  community_chest: COLORS.CHEST_BG,
  tax:             COLORS.TAX_BG,
};

const PLAYER_COLORS = [
  COLORS.PLAYER_1, COLORS.PLAYER_2, COLORS.PLAYER_3,
  COLORS.PLAYER_4, COLORS.PLAYER_5, COLORS.PLAYER_6,
];

// Label komplex yang tampil di strip warna
const KOMPLEX_LABEL = {
  A: 'Komplek A', B: 'Komplek B', C: 'Komplek C', D: 'Komplek D',
  E: 'Komplek E', F: 'Komplek F', G: 'Komplek G', H: 'Komplek H',
};

// Negara (subtitle) → emoji bendera (Unicode regional indicator)
const COUNTRY_FLAG = {
  'Indonesia': '🇮🇩',
  'Malaysia': '🇲🇾',
  'Taiwan': '🇹🇼',
  'Singapore': '🇸🇬',
  'Singapura': '🇸🇬',
  'Korea Selatan': '🇰🇷',
  'Tiongkok': '🇨🇳',
  'Jepang': '🇯🇵',
  'India': '🇮🇳',
  'Australia': '🇦🇺',
  'Selandia Baru': '🇳🇿',
  'Rusia': '🇷🇺',
  'Italia': '🇮🇹',
  'Prancis': '🇫🇷',
  'Inggris': '🇬🇧',
  'Belanda': '🇳🇱',
  'Jerman': '🇩🇪',
  'Brasil': '🇧🇷',
  'Amerika Serikat': '🇺🇸',
  'Uni Emirat Arab': '🇦🇪',
};

const fmtMoney = (n) => n?.toLocaleString('id-ID') ?? '';

export default function Square({
  square, side = 'bottom', ownerId, houseCount, hasHotel,
  isMortgaged, isHighlighted, style,
}) {
  const { type, komplex, image, name, subtitle, price, amount } = square;
  const isProperty = type === 'property';
  const stripColor = isProperty ? KOMPLEX_COLORS[komplex] : null;
  const bg = TYPE_BG[type] ?? COLORS.SQUARE_BG;
  const imgSrc = image ? LANDMARK_IMAGES[image] : null;
  const priceLabel = price ? `$${fmtMoney(price)}` : (amount ? `-$${fmtMoney(amount)}` : '');
  const flag = subtitle ? COUNTRY_FLAG[subtitle] : null;

  return (
    <div
      className={`sq sq--${type} sq--side-${side}${isHighlighted ? ' sq--highlight' : ''}${isMortgaged ? ' sq--mortgaged' : ''}`}
      style={{ ...style, background: bg }}
    >
      {/* Konten yang diputar agar menghadap ke tengah papan */}
      <div className="sq__content">
        {isMortgaged && <div className="sq__mortgage-tag" aria-label="Digadai">GADAI</div>}

        {isProperty ? (
          <>
            {/* 1. Strip warna = label komplek */}
            <div className="sq__strip" style={{ background: stripColor }}>
              <span className="sq__komplex-label">{KOMPLEX_LABEL[komplex] ?? ''}</span>
            </div>

            {/* 2. Nama negara */}
            <div className="sq__country">{subtitle || name}</div>

            {/* 3. Bendera */}
            {flag && <div className="sq__flag" aria-hidden="true">{flag}</div>}

            {/* 4. Gambar landmark */}
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={name}
                className="sq__img"
                draggable={false}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="sq__img sq__img--empty" />
            )}

            {/* nama kota kecil di bawah gambar */}
            <div className="sq__city">{name}</div>

            {/* 5. Harga (paling dalam / bawah) */}
            {priceLabel && <div className="sq__price">{priceLabel}</div>}
          </>
        ) : (
          <>
            {/* Non-properti: ikon + nama + (gambar) + harga pajak */}
            <div className="sq__header--type">
              <span className="sq__type-icon">{TYPE_ICON[type]}</span>
              <span className="sq__name-type">{name}</span>
            </div>
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={name}
                className="sq__img"
                draggable={false}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="sq__img sq__img--empty" />
            )}
            {priceLabel && <div className="sq__price">{priceLabel}</div>}
          </>
        )}
      </div>

      {/* Rumah / hotel (tidak ikut diputar, selalu di tepi luar) */}
      {(houseCount > 0 || hasHotel) && (
        <div className={`sq__buildings sq__buildings--${side}`} aria-hidden="true">
          {hasHotel
            ? <span className="bld bld--hotel" title="Hotel" />
            : Array.from({ length: houseCount }).map((_, i) => (
                <span key={i} className="bld bld--house" title="Rumah" />
              ))
          }
        </div>
      )}

      {/* Titik warna pemilik */}
      {ownerId != null && (
        <div
          className="sq__owner-dot"
          style={{ background: PLAYER_COLORS[ownerId % PLAYER_COLORS.length] }}
        />
      )}
    </div>
  );
}