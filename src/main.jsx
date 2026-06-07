// ============================================================
// main.jsx — Entry React. Me-render <App/> ke #root.
//
// Catatan: sengaja TIDAK memakai <React.StrictMode>. StrictMode
// menjalankan effect dua kali di mode dev; karena useAI menjadwal
// aksi lewat setTimeout (mis. ROLL_DICE yang acak), double-invoke
// bisa memicu aksi AI ganda saat development. Tanpa StrictMode,
// perilaku dev = produksi.
// ============================================================

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);