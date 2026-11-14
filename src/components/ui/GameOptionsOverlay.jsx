import React, { useEffect, useState } from 'react';
import {
  peekSaveSlots,
  saveGameToSlot,
} from '../../utils/saveGame';
import '../../styles/game-options.css';

const OPTIONS_ART = { src: '/assets/game-options-reference.png', width: 1373, height: 768 };
const SAVES_ART = { src: '/assets/game-save-reference.png', width: 1375, height: 768 };
const SAVE_CARDS = [
  { x: 159, y: 194, width: 349, height: 435 },
  { x: 520, y: 194, width: 337, height: 435 },
  { x: 869, y: 194, width: 348, height: 435 },
];
const CONTACT = () => window.GameMenuContact || {};

const percentageBox = (x, y, width, height, art) => ({
  left: `${(x / art.width) * 100}%`,
  top: `${(y / art.height) * 100}%`,
  width: `${(width / art.width) * 100}%`,
  height: `${(height / art.height) * 100}%`,
});

const readStoredValue = (key, fallback) => {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

const writeStoredValue = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Keep the current selection for this session if storage is unavailable.
  }
};

const formatMoney = (value) => new Intl.NumberFormat('id-ID').format(value || 0);

const formatSavedAt = (timestamp) => {
  if (!timestamp) return '';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(timestamp) + ' WIB';
};

function ReferencePopup({ art, label, children }) {
  return (
    <div className="game-options-backdrop">
      <section
        className="game-reference-popup"
        style={{
          '--reference-ratio': `${art.width} / ${art.height}`,
          width: `min(100%, ${art.width}px, calc(var(--stage-height, 576px) * ${art.width / art.height}))`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <img className="game-reference-art" src={art.src} alt="" draggable="false" />
        <div className="game-reference-hotspots">{children}</div>
      </section>
    </div>
  );
}

function SaveCardArtwork({ slot, filled }) {
  const destination = SAVE_CARDS[slot - 1];
  const source = SAVE_CARDS[filled ? 0 : 1];
  const cropStyle = {
    ...percentageBox(destination.x, destination.y, destination.width, destination.height, SAVES_ART),
    '--crop-width': `${(SAVES_ART.width / destination.width) * 100}%`,
    '--crop-height': `${(SAVES_ART.height / destination.height) * 100}%`,
    '--crop-left': `${(source.x / destination.width) * -100}%`,
    '--crop-top': `${(source.y / destination.height) * -100}%`,
  };

  return (
    <div className="game-save-card-crop" style={cropStyle} aria-hidden="true">
      <img src={SAVES_ART.src} alt="" draggable="false" />
    </div>
  );
}

function SaveSlotDetails({ slot, save }) {
  const card = SAVE_CARDS[slot - 1];
  const filled = Boolean(save?.savedAt);
  const titleStyle = percentageBox(card.x + card.width * 0.18, card.y, card.width * 0.64, 61, SAVES_ART);

  return (
    <>
      <span className={`game-save-slot-title${filled ? ' is-filled' : ''}`} style={titleStyle}>
        SLOT {slot}
      </span>
      {filled && (
        <>
          <div
            className="game-save-slot-map"
            style={percentageBox(card.x + 38, card.y + 79, card.width - 76, 120, SAVES_ART)}
          >
            <img src="/monopoli-menu/assets/s_map.webp" alt="" draggable="false" />
            <strong>{save.mapName || save.map || 'Peta Nusantara'}</strong>
          </div>
          <div
            className="game-save-slot-info"
            style={percentageBox(card.x + 16, card.y + 205, card.width - 32, 92, SAVES_ART)}
          >
            <span>Babak: {save.round}</span>
            <span>Uang: Rp {formatMoney(save.money)}</span>
            <span>Pemain: {save.players} Orang</span>
          </div>
          <span
            className="game-save-slot-date"
            style={percentageBox(card.x + 14, card.y + 297, card.width - 28, 31, SAVES_ART)}
          >
            Tersimpan: {formatSavedAt(save.savedAt)}
          </span>
        </>
      )}
    </>
  );
}

function ContactPage({ onClose, sound }) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const config = CONTACT();

  const openMail = (body) => {
    window.location.href = `mailto:${config.email}?subject=${encodeURIComponent(config.emailSubject || 'Masukan')}&body=${encodeURIComponent(body || '')}`;
  };

  const sendMessage = async () => {
    const sender = email.trim();
    const content = message.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(sender)) {
      setNotice('Isi email yang valid dulu.');
      return;
    }
    if (content.length < 5) {
      setNotice('Tulis pesan atau masukanmu dulu.');
      return;
    }

    const payload = {
      email: sender,
      message: content,
      app: config.appName || 'Monopoli Indonesia',
      time: new Date().toISOString(),
    };
    sound.play('click');

    if (!config.endpoint) {
      if (!config.email) {
        setNotice('Tujuan pengiriman belum diatur.');
        return;
      }
      setNotice('Membuka aplikasi email…');
      openMail(`Email pengirim: ${sender}\n\n${content}`);
      return;
    }

    setBusy(true);
    setNotice('Mengirim…');
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setNotice('Terima kasih! Pesanmu terkirim.');
      setEmail('');
      setMessage('');
    } catch (error) {
      console.error('Gagal mengirim pesan hubungi kami:', error);
      setNotice('Gagal mengirim. Coba lagi nanti.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="game-options-backdrop">
      <section className="game-contact-art" role="dialog" aria-modal="true" aria-label="Hubungi kami">
        <img src="/monopoli-menu/assets/k_dlg.webp" alt="" draggable="false" />
        <button
          className="game-contact-close"
          type="button"
          aria-label="Kembali ke pengaturan"
          onClick={() => { sound.play('click'); onClose(); }}
        />
        <input
          className="game-contact-email"
          type="email"
          maxLength={80}
          autoComplete="email"
          aria-label="Email Anda"
          placeholder="Tulis email Anda…"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <textarea
          className="game-contact-message"
          aria-label="Pesan"
          placeholder="Tulis pesan atau masukanmu…"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <button
          className="game-contact-hit game-contact-hit--whatsapp"
          type="button"
          aria-label="Hubungi melalui WhatsApp"
          onClick={() => {
            const number = String(config.whatsapp || '').replace(/\D/g, '');
            sound.play('click');
            if (!number) {
              setNotice('Nomor WhatsApp belum diatur.');
              return;
            }
            window.open(
              `https://wa.me/${number}?text=${encodeURIComponent(config.whatsappText || '')}`,
              '_blank',
              'noopener',
            );
          }}
        />
        <button
          className="game-contact-hit game-contact-hit--email"
          type="button"
          aria-label="Hubungi melalui email"
          onClick={() => {
            sound.play('click');
            if (!config.email) {
              setNotice('Email tujuan belum diatur.');
              return;
            }
            openMail(message);
          }}
        />
        <button
          className="game-contact-hit game-contact-hit--send"
          type="button"
          aria-label="Kirim pesan"
          disabled={busy}
          onClick={sendMessage}
        />
        {notice && <p className="game-contact-notice" role="status">{notice}</p>}
      </section>
    </div>
  );
}

export default function GameOptionsOverlay({ game, sound, onClose, onQuit }) {
  const [page, setPage] = useState('options');
  const [slots, setSlots] = useState(peekSaveSlots);
  const [notice, setNotice] = useState('');
  const [musicEnabled, setMusicEnabled] = useState(
    () => readStoredValue('monopoli:music-enabled', '1') === '1',
  );
  const [musicVolume, setMusicVolume] = useState(() => {
    const stored = Number(readStoredValue('monopoli:music-volume', '0.7'));
    return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 0.7;
  });
  const [quality, setQuality] = useState(() => {
    const stored = readStoredValue('monopoli:graphics-quality', 'medium');
    return ['low', 'medium', 'high'].includes(stored) ? stored : 'medium';
  });
  const [language, setLanguage] = useState(() => {
    const stored = readStoredValue('monopoli:language', 'id');
    return ['id', 'en'].includes(stored) ? stored : 'id';
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (page === 'contact' || page === 'saves') setPage('options');
        else onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, page]);

  const saveSlot = (slot) => {
    if (slots[slot - 1]?.savedAt && !window.confirm(`Timpa data simpanan di Slot ${slot}?`)) return;
    if (!saveGameToSlot(game, slot)) {
      setNotice('Game tidak dapat disimpan saat ini.');
      return;
    }
    setSlots(peekSaveSlots());
    setNotice(`Game berhasil disimpan di Slot ${slot}.`);
    sound.play('click');
  };

  if (page === 'contact') {
    return <ContactPage onClose={() => setPage('options')} sound={sound} />;
  }

  if (page === 'saves') {
    return (
      <ReferencePopup art={SAVES_ART} label="Simpan game">
        {slots.map((save, index) => {
          const slot = index + 1;
          const filled = Boolean(save?.savedAt);
          const button = slot === 1
            ? { x: 185, y: 529, width: 294, height: 86 }
            : slot === 2
              ? { x: 552, y: 529, width: 276, height: 86 }
              : { x: 900, y: 529, width: 284, height: 86 };
          return (
            <React.Fragment key={slot}>
              {(slot === 1 && !filled) || (slot > 1 && filled)
                ? <SaveCardArtwork slot={slot} filled={filled} />
                : null}
              <SaveSlotDetails slot={slot} save={save} />
              <button
                className="game-reference-hit"
                style={percentageBox(button.x, button.y, button.width, button.height, SAVES_ART)}
                type="button"
                aria-label={`${filled ? 'Timpa' : 'Simpan'} game di Slot ${slot}`}
                onClick={() => saveSlot(slot)}
              />
            </React.Fragment>
          );
        })}
        <button
          className="game-reference-hit"
          style={percentageBox(1168, 41, 101, 96, SAVES_ART)}
          type="button"
          aria-label="Tutup simpan game"
          onClick={onClose}
        />
        <button
          className="game-reference-hit"
          style={percentageBox(538, 641, 300, 112, SAVES_ART)}
          type="button"
          aria-label="Kembali ke pengaturan"
          onClick={() => setPage('options')}
        />
        {notice && <p className="game-reference-notice" role="status">{notice}</p>}
      </ReferencePopup>
    );
  }

  return (
    <ReferencePopup art={OPTIONS_ART} label="Pengaturan">
      <input
        className="game-reference-range"
        style={{
          ...percentageBox(266, 258, 254, 53, OPTIONS_ART),
          '--range-value': `${musicVolume * 100}%`,
        }}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={musicVolume}
        aria-label="Volume musik"
        onChange={(event) => {
          const value = Number(event.target.value);
          setMusicVolume(value);
          writeStoredValue('monopoli:music-volume', String(value));
        }}
      />
      <button
        className={`game-reference-hit game-reference-switch${musicEnabled ? '' : ' is-off'}`}
        style={percentageBox(530, 248, 127, 68, OPTIONS_ART)}
        type="button"
        aria-label={musicEnabled ? 'Matikan musik' : 'Nyalakan musik'}
        aria-pressed={musicEnabled}
        onClick={() => {
          const next = !musicEnabled;
          setMusicEnabled(next);
          writeStoredValue('monopoli:music-enabled', next ? '1' : '0');
        }}
      />
      <input
        className="game-reference-range"
        style={{
          ...percentageBox(266, 365, 254, 57, OPTIONS_ART),
          '--range-value': `${sound.volume * 100}%`,
        }}
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={sound.volume}
        aria-label="Volume efek suara"
        onChange={(event) => sound.setVolume(Number(event.target.value))}
      />
      <button
        className={`game-reference-hit game-reference-switch${sound.enabled ? '' : ' is-off'}`}
        style={percentageBox(530, 370, 127, 68, OPTIONS_ART)}
        type="button"
        aria-label={sound.enabled ? 'Matikan efek suara' : 'Nyalakan efek suara'}
        aria-pressed={sound.enabled}
        onClick={() => sound.setEnabled(!sound.enabled)}
      />
      {['low', 'medium', 'high'].map((level, index) => (
        <React.Fragment key={level}>
          {level === 'medium' && quality !== 'medium' && (
            <span
              className="game-reference-quality-reset"
              style={percentageBox(874, 242, 178, 78, OPTIONS_ART)}
              aria-hidden="true"
            >
              Sedang
            </span>
          )}
          <button
            className={`game-reference-hit game-reference-quality${quality === level ? ' is-selected' : ''}`}
            style={percentageBox(720 + index * 162, 248, index === 2 ? 160 : 162, 68, OPTIONS_ART)}
            type="button"
            aria-label={`Kualitas grafik ${['rendah', 'sedang', 'tinggi'][index]}`}
            aria-pressed={quality === level}
            onClick={() => {
              setQuality(level);
              writeStoredValue('monopoli:graphics-quality', level);
            }}
          />
        </React.Fragment>
      ))}
      {language === 'en' && (
        <span
          className="game-reference-language-label"
          style={percentageBox(765, 370, 398, 68, OPTIONS_ART)}
          aria-hidden="true"
        >
          🇬🇧 English
        </span>
      )}
      <select
        className="game-reference-language"
        style={percentageBox(765, 370, 398, 68, OPTIONS_ART)}
        aria-label="Bahasa"
        value={language}
        onChange={(event) => {
          setLanguage(event.target.value);
          writeStoredValue('monopoli:language', event.target.value);
        }}
      >
        <option value="id">Indonesia</option>
        <option value="en">English</option>
      </select>
      <button
        className="game-reference-hit"
        style={percentageBox(403, 505, 277, 75, OPTIONS_ART)}
        type="button"
        aria-label="Cara bermain (segera hadir)"
        disabled
      />
      <button
        className="game-reference-hit"
        style={percentageBox(698, 505, 278, 75, OPTIONS_ART)}
        type="button"
        aria-label="Hubungi kami"
        onClick={() => setPage('contact')}
      />
      <button
        className="game-reference-hit"
        style={percentageBox(163, 591, 359, 134, OPTIONS_ART)}
        type="button"
        aria-label="Keluar game"
        onClick={onQuit}
      />
      <button
        className="game-reference-hit"
        style={percentageBox(525, 591, 326, 134, OPTIONS_ART)}
        type="button"
        aria-label="Simpan game"
        onClick={() => { setSlots(peekSaveSlots()); setNotice(''); setPage('saves'); }}
      />
      <button
        className="game-reference-hit"
        style={percentageBox(852, 591, 358, 134, OPTIONS_ART)}
        type="button"
        aria-label="Lanjutkan permainan"
        onClick={onClose}
      />
      <button
        className="game-reference-hit"
        style={percentageBox(1190, 24, 108, 108, OPTIONS_ART)}
        type="button"
        aria-label="Tutup pengaturan"
        onClick={onClose}
      />
    </ReferencePopup>
  );
}
