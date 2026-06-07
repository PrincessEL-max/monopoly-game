// ============================================================
// GameLog.jsx — Daftar log kejadian (terbaru di atas).
// Props: log = [{ text, ts }]
// ============================================================

import React from 'react';

export default function GameLog({ log = [] }) {
  return (
    <div className="glog">
      <div className="glog-title">Log Permainan</div>
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