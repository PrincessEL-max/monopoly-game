// ============================================================
// CornerSquare.jsx — Full version
//
// 4 petak sudut board, masing-masing 100×100px
// Props dari Board.jsx:
//   square          — { id, name, type, subtype, passReward? }
//   style           — { gridRow, gridColumn }
//   players         — array semua pemain (untuk badge jailed/visiting)
//   freeParkingPool — uang terkumpul di Parkir Gratis
//
// Import dari file yang ada:
//   config.js → COLORS (corner backgrounds), RULES (PASS_GO_REWARD)
//   images.js → getImage (corner_go, corner_jail, corner_parking, corner_gotojail)
// ============================================================

import React from 'react';
import { COLORS, RULES } from '../../constants/config';
import { getImage } from '../../constants/images';
import '../../styles/squares.css';

// ─── Helper format uang ──────────────────────────────────────
const fmt = (n) => n?.toLocaleString('id-ID') ?? '0';

// ─────────────────────────────────────────────────────────────
// GO CORNER (pos 0 — kanan bawah)
// Pemain mendapat PASS_GO_REWARD saat melewati
// ─────────────────────────────────────────────────────────────

const GoCorner = ({ style }) => {
  const imgSrc = getImage('corner_go');

  return (
    <div
      className="sq-corner sq-corner--go"
      style={{ ...style, background: COLORS.CORNER_GO_BG }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="Start" className="corner-img" draggable={false}
          onError={e => { e.target.style.display = 'none'; }} />
      ) : (
        <>
          {/* Panah arah gerak pemain */}
          <div className="go-arrows">
            <span className="go-arrow go-arrow--up">↑</span>
            <span className="go-arrow go-arrow--left">←</span>
          </div>

          {/* Label GO besar */}
          <div className="go-title">GO</div>

          {/* Kumpul bonus */}
          <div className="go-collect">
            <span className="go-collect-label">KUMPUL</span>
            <span className="go-collect-amount">${fmt(RULES.PASS_GO_REWARD)}</span>
            <span className="go-collect-sub">saat melewati</span>
          </div>

          {/* Icon */}
          <div className="go-icon">🚦</div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// JAIL CORNER (pos 10 — kiri bawah)
// Split diagonal: jail cell (kanan atas) + sekadar berkunjung (kiri bawah)
// Menampilkan badge jumlah pemain yang dipenjara vs berkunjung
// ─────────────────────────────────────────────────────────────

const JailCorner = ({ style, players }) => {
  const imgSrc = getImage('corner_jail');

  // Pisahkan pemain: benar-benar di penjara vs sekadar berkunjung
  const jailed   = players.filter(p => p.position === 10 && p.inJail  && !p.bankrupt);
  const visiting = players.filter(p => p.position === 10 && !p.inJail && !p.bankrupt);

  return (
    <div
      className="sq-corner sq-corner--jail"
      style={{ ...style, background: COLORS.CORNER_JAIL_BG }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="Penjara" className="corner-img" draggable={false}
          onError={e => { e.target.style.display = 'none'; }} />
      ) : (
        <>
          {/* Garis diagonal sebagai pembatas visual */}
          <div className="jail-diagonal" aria-hidden="true" />

          {/* Area kanan atas: sel penjara */}
          <div className="jail-cell-area">
            <span className="jail-cell-label">PENJARA</span>
            {/* Jeruji besi */}
            <div className="jail-bars">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="jail-bar" />
              ))}
            </div>
            <span className="jail-cell-icon">🔒</span>
            {/* Badge jumlah pemain yang benar-benar di penjara */}
            {jailed.length > 0 && (
              <span className="jail-badge jail-badge--jailed" title="Pemain dipenjara">
                {jailed.length}
              </span>
            )}
          </div>

          {/* Area kiri bawah: sekadar berkunjung */}
          <div className="jail-visiting-area">
            <span className="jail-visiting-line1">SEKADAR</span>
            <span className="jail-visiting-line2">BERKUNJUNG</span>
            {visiting.length > 0 && (
              <span className="jail-badge jail-badge--visiting" title="Pemain berkunjung">
                {visiting.length}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// FREE PARKING CORNER (pos 20 — kiri atas)
// Jika FREE_PARKING_COLLECT aktif, tampilkan uang terkumpul
// ─────────────────────────────────────────────────────────────

const FreeParkingCorner = ({ style, freeParkingPool }) => {
  const imgSrc = getImage('corner_parking');

  return (
    <div
      className="sq-corner sq-corner--free-parking"
      style={{ ...style, background: COLORS.CORNER_PARKING_BG }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="Parkir Gratis" className="corner-img" draggable={false}
          onError={e => { e.target.style.display = 'none'; }} />
      ) : (
        <>
          {/* Ikon parkir */}
          <div className="parking-icon-wrap">
            <span className="parking-p">P</span>
            <span className="parking-car">🚗</span>
          </div>

          <div className="parking-title">PARKIR<br />GRATIS</div>

          {/* Pool uang yang terkumpul */}
          {freeParkingPool > 0 ? (
            <div className="parking-pool">
              <span className="parking-pool-label">pool</span>
              <span className="parking-pool-amount">${fmt(freeParkingPool)}</span>
            </div>
          ) : (
            <div className="parking-empty">gratis!</div>
          )}
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// GO TO JAIL CORNER (pos 30 — kanan atas)
// Pemain yang mendarat di sini langsung ke penjara
// ─────────────────────────────────────────────────────────────

const GoToJailCorner = ({ style }) => {
  const imgSrc = getImage('corner_gotojail');

  return (
    <div
      className="sq-corner sq-corner--go-to-jail"
      style={{ ...style, background: COLORS.CORNER_GOTOJAIL_BG }}
    >
      {imgSrc ? (
        <img src={imgSrc} alt="Masuk Penjara" className="corner-img" draggable={false}
          onError={e => { e.target.style.display = 'none'; }} />
      ) : (
        <>
          {/* Ikon polisi */}
          <div className="gotojail-icon">👮</div>

          <div className="gotojail-title">MASUK<br />PENJARA!</div>

          <div className="gotojail-sub">
            langsung ke penjara
          </div>

          {/* Panah menuju pojok penjara */}
          <div className="gotojail-arrow">↙</div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT — switch per subtype
// ─────────────────────────────────────────────────────────────

const CornerSquare = ({ square, style, players = [], freeParkingPool = 0 }) => {
  switch (square.subtype) {
    case 'go':
      return <GoCorner style={style} />;

    case 'jail':
      return <JailCorner style={style} players={players} />;

    case 'free_parking':
      return <FreeParkingCorner style={style} freeParkingPool={freeParkingPool} />;

    case 'go_to_jail':
      return <GoToJailCorner style={style} />;

    default:
      // Fallback generic — tidak ada subtype yang dikenal
      return (
        <div
          className="sq-corner"
          style={{ ...style, background: '#f5f0e8', borderColor: '#999' }}
        >
          <span className="sq-corner-label">{square.name}</span>
        </div>
      );
  }
};

export default CornerSquare;