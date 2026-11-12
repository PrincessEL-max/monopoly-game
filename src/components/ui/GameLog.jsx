// ============================================================
// GameLog.jsx — Daftar log kejadian (terbaru di atas).
// Props: log = [{ text, ts }]
// ============================================================

import React from 'react';

export default function GameLog({ log = [], onClose }) {
  return (
    <div className="glog">
      <div className="glog-heading">
        <div className="glog-title">Log Permainan</div>
        <button
          className="glog-close"
          onClick={onClose}
          aria-label="Tutup log"
          title="Tutup log"
        >
          ✕
        </button>
      </div>
      <div className="glog-list">
        {log.length === 0 ? (
          <div className="glog-empty">Belum ada kejadian.</div>
        ) : (
          log.map((entry, i) => (
            <div className="glog-item" key={entry.ts ? `${entry.ts}-${i}` : i}>
              {entry.text}
            </div>
          ))
        )}
      </div>
    </div>
  );
}