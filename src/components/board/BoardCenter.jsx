// ============================================================
// BoardCenter.jsx — Globe + logo di tengah board.
// Versi dirapikan: memakai class dari styles/board.css
// (.bc-root, .bc-globe-wrap, .bc-logo-text, dll) — bukan
// inline style seperti versi lama.
//
// Struktur (sesuai board.css):
//   .bc-root
//     .bc-glow                        ← glow kuning radial
//     .bc-badge--chance / --chest     ← label sudut
//     .bc-logo-text                   ← logo M.O.N.O.P.O.L.Y (atas)
//     .bc-globe-wrap
//        .bc-globe-css (fallback) + .bc-globe-img + .bc-globe-shine
//     .bc-logo-wrap
//        .bc-logo-text + .bc-subtitle
//
// Globe: pakai gambar aset (LANDMARK_IMAGES.globe_center).
// Jika gagal dimuat, fallback CSS globe (🌍) di belakangnya muncul.
// ============================================================

import React from 'react';
import { LANDMARK_IMAGES } from '../../constants/images';
import '../../styles/board.css';

const LOGO_LETTERS = ['M', 'O', 'N', 'O', 'P', 'O', 'L', 'Y'];

export default function BoardCenter() {
  const globeSrc = LANDMARK_IMAGES.globe_center;

  return (
    <div className="bc-root">
      {/* Glow kuning radial */}
      <div className="bc-glow" aria-hidden="true" />

      {/* Label sudut */}
      <span className="bc-badge bc-badge--chance">Kesempatan</span>
      <span className="bc-badge bc-badge--chest">Dana Umum</span>

      {/* Logo atas */}
      <Logo />

      {/* Globe */}
      <div className="bc-globe-wrap">
        {/* Fallback CSS globe di belakang — terlihat jika gambar gagal */}
        <div className="bc-globe-css" style={{ position: 'absolute', inset: 0 }}>
          <span className="bc-globe-core" aria-hidden="true">🌍</span>
        </div>

        {/* Gambar globe aset */}
        <img
          className="bc-globe-img"
          src={globeSrc}
          alt="Globe dunia"
          draggable={false}
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />

        {/* Kilau kiri atas */}
        <div className="bc-globe-shine" aria-hidden="true" />
      </div>

      {/* Logo bawah + subtitle */}
      <div className="bc-logo-wrap">
        <Logo />
        <p className="bc-subtitle">All New International</p>
      </div>
    </div>
  );
}

// ─── Logo teks M.O.N.O.P.O.L.Y (huruf emas + titik oranye) ───
function Logo() {
  return (
    <div className="bc-logo-text" aria-label="Monopoly">
      {LOGO_LETTERS.map((ch, i) => (
        <React.Fragment key={i}>
          <span className="bc-logo-letter">{ch}</span>
          {i < LOGO_LETTERS.length - 1 && (
            <span className="bc-logo-dot">•</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}