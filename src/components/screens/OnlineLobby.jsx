import React, { useState } from 'react';
import { PLAYER_CONFIG } from '../../constants/config';
import PieceModel from '../board/PieceModel';
import '../../styles/online-lobby.css';

const { PIECE_ICONS } = PLAYER_CONFIG;

export default function OnlineLobby({
  multiplayer,
  defaultName,
  defaultPiece,
  onClose,
}) {
  const [name, setName] = useState(defaultName);
  const [piece, setPiece] = useState(defaultPiece);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roomCode, setRoomCode] = useState('');
  const [formMode, setFormMode] = useState('create');
  const [copyMessage, setCopyMessage] = useState('');
  const { room, isHost, localPlayer, busy, error } = multiplayer;

  const copyRoomCode = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard tidak tersedia.');
      await navigator.clipboard.writeText(room.code);
      setCopyMessage('Tersalin');
    } catch {
      setCopyMessage('Salin kode manual');
    }
  };

  const choosePiece = () => (
    <div className="setup-pieces online-piece-picker" aria-label="Pilih bidak">
      {PIECE_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          className={`piece-pick${piece === icon ? ' piece-pick--active' : ''}`}
          onClick={() => setPiece(icon)}
          title={`Pilih bidak ${icon}`}
          aria-label={`Pilih bidak ${icon}`}
          aria-pressed={piece === icon}
        >
          <PieceModel piece={icon} className="piece-model--setup" />
        </button>
      ))}
    </div>
  );

  return (
    <div className={`online-lobby${room ? ' online-lobby--room' : ''}`}>
      {room ? (
        <div className="online-art-popup online-room-popup">
          <img
            className="online-popup-art"
            src="/assets/ui-popup-online/popup_lobi_kamar.png"
            alt=""
            aria-hidden="true"
          />
          <button
            className="online-popup-close"
            type="button"
            onClick={multiplayer.leaveRoom}
            disabled={busy}
            aria-label="Keluar dari kamar"
            title="Keluar dari kamar"
          >×</button>
          <div className="online-room-code">
            <span>KODE KAMAR</span>
            <strong>{room.code}</strong>
            <button type="button" onClick={copyRoomCode} aria-live="polite">
              {copyMessage || 'Salin'}
            </button>
          </div>
          <div className="online-room-info">
            <img src="/assets/ui-popup-online/preview_peta.png" alt="Peta permainan" />
            <span>{room.players.length} / {room.maxPlayers} pemain</span>
            <small>Tersimpan otomatis</small>
          </div>
          <div className="online-player-list">
            {Array.from({ length: room.maxPlayers }, (_, index) => {
              const player = room.players[index];
              const avatars = ['avatar_pemain1.png', 'avatar_andi.png', 'avatar_budi.png', 'avatar_sari.png'];
              return (
                <div className={`online-player${player ? '' : ' online-player--empty'}`} key={player?.playerId ?? `empty-${index}`}>
                  <img
                    className="online-player-avatar"
                    src={`/assets/ui-popup-online/${player ? avatars[index % avatars.length] : 'slot_kosong.png'}`}
                    alt=""
                  />
                  <span className="online-player-name">
                    {player
                      ? `${player.name}${player.playerId === room.hostPlayerId ? ' · Host' : ''}`
                      : 'Menunggu pemain'}
                  </span>
                  {player && (
                    <>
                      <PieceModel piece={player.piece} className="piece-model--setup" />
                      <span className={player.connected ? 'online-indicator' : 'online-indicator offline'}>
                        {player.connected ? 'Online' : 'Terputus'}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {isHost ? (
            <button
              className="btn btn-gold online-room-start"
              onClick={multiplayer.startRoom}
              disabled={busy || room.players.length < 2 || room.players.some((player) => !player.connected)}
            >
              {busy ? 'Memulai...' : 'Mulai Permainan'}
            </button>
          ) : (
            <p className="online-waiting online-room-waiting">Menunggu host memulai permainan...</p>
          )}
          <button className="btn btn-danger online-room-leave" onClick={multiplayer.leaveRoom} disabled={busy}>
            Keluar kamar
          </button>
          {localPlayer && <p className="online-self online-room-self">Kamu bermain sebagai {localPlayer.name}.</p>}
        </div>
      ) : (
        <div className={`online-art-popup online-create-popup${formMode === 'join' ? ' online-create-popup--join' : ''}`}>
          <img
            className="online-popup-art"
            src="/assets/ui-popup-online/popup_buat_kamar.png"
            alt=""
            aria-hidden="true"
          />
          <h2 className="online-popup-title">{formMode === 'create' ? 'BUAT KAMAR' : 'GABUNG KAMAR'}</h2>
          <button
            className="online-popup-close"
            type="button"
            onClick={onClose}
            aria-label="Kembali ke permainan lokal"
            title="Kembali"
          >×</button>
          <div className="online-form-overlay">
            <div className="online-form-tabs" role="tablist" aria-label="Aksi multiplayer">
              <button
                type="button"
                role="tab"
                aria-selected={formMode === 'create'}
                className={formMode === 'create' ? 'online-form-tab is-active' : 'online-form-tab'}
                onClick={() => setFormMode('create')}
              >Buat kamar</button>
              <button
                type="button"
                role="tab"
                aria-selected={formMode === 'join'}
                className={formMode === 'join' ? 'online-form-tab is-active' : 'online-form-tab'}
                onClick={() => setFormMode('join')}
              >Gabung kamar</button>
            </div>
            <label className="online-field">
              <span>Nama pemain</span>
              <input
                id="online-player-name"
                className="setup-name"
                value={name}
                maxLength={16}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masukkan nama"
              />
            </label>
            <div className="online-field">
              <span>Pilih bidak</span>
              {choosePiece()}
            </div>
            {formMode === 'create' ? (
              <label className="online-field">
                <span>Maksimal pemain</span>
                <select
                  id="online-player-count"
                  className="online-select"
                  value={maxPlayers}
                  onChange={(event) => setMaxPlayers(Number(event.target.value))}
                >
                  {[2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} pemain</option>)}
                </select>
              </label>
            ) : (
              <label className="online-field">
                <span>Kode kamar</span>
                <input
                  id="online-room-code"
                  className="setup-name online-code-input"
                  value={roomCode}
                  maxLength={6}
                  onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  placeholder="6 karakter"
                />
              </label>
            )}
            <button
              className={`btn ${formMode === 'create' ? 'btn-gold' : 'btn-primary'} online-form-submit`}
              onClick={() => formMode === 'create'
                ? multiplayer.createRoom({ name: name.trim(), piece, maxPlayers })
                : multiplayer.joinRoom({ code: roomCode, name: name.trim(), piece })}
              disabled={busy || !name.trim() || (formMode === 'join' && roomCode.length !== 6)}
            >
              {busy
                ? (formMode === 'create' ? 'Membuat kamar...' : 'Bergabung...')
                : (formMode === 'create' ? 'Buat kamar' : 'Gabung kamar')}
            </button>
          </div>
          <img className="online-map-art" src="/assets/ui-popup-online/preview_peta.png" alt="Pratinjau papan permainan" />
          <button className="online-back-link" type="button" onClick={onClose}>Kembali</button>
        </div>
      )}
      {error && <p className="online-error" role="alert">{error}</p>}
    </div>
  );
}
