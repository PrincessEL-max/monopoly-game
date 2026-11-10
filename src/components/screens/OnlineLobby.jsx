import React, { useState } from 'react';
import { PLAYER_CONFIG } from '../../constants/config';
import PieceModel from '../board/PieceModel';

const { PIECE_ICONS } = PLAYER_CONFIG;

export default function OnlineLobby({
  multiplayer,
  defaultName,
  defaultPiece,
}) {
  const [name, setName] = useState(defaultName);
  const [piece, setPiece] = useState(defaultPiece);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roomCode, setRoomCode] = useState('');
  const { room, isHost, localPlayer, busy, error } = multiplayer;

  const choosePiece = () => (
    <div className="setup-pieces online-piece-picker">
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
    <div className="online-lobby">
      {room ? (
        <>
          <div className="online-room-code">
            <span className="setup-label">Kode room</span>
            <strong>{room.code}</strong>
            <span>{room.players.length} / {room.maxPlayers} pemain</span>
          </div>
          <p className="online-save-note">Permainan tersimpan otomatis di Supabase.</p>
          <div className="online-player-list">
            {room.players.map((player) => (
              <div className="online-player" key={player.playerId}>
                <PieceModel piece={player.piece} className="piece-model--setup" />
                <span>{player.name}{player.playerId === room.hostPlayerId ? ' · Host' : ''}</span>
                <span className={player.connected ? 'online-indicator' : 'online-indicator offline'}>
                  {player.connected ? 'Terhubung' : 'Terputus'}
                </span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }, (_, index) => (
              <div className="online-player online-player--empty" key={`empty-${index}`}>
                <span>Menunggu pemain...</span>
              </div>
            ))}
          </div>
          {isHost ? (
            <button
              className="btn btn-gold btn-start"
              onClick={multiplayer.startRoom}
              disabled={busy || room.players.length < 2 || room.players.some((player) => !player.connected)}
            >
              {busy ? 'Memulai...' : 'Mulai Permainan'}
            </button>
          ) : (
            <p className="online-waiting">Menunggu host memulai permainan...</p>
          )}
          <button className="btn btn-ghost online-leave" onClick={multiplayer.leaveRoom} disabled={busy}>
            Keluar dari room
          </button>
          {localPlayer && <p className="online-self">Kamu bermain sebagai {localPlayer.name}.</p>}
        </>
      ) : (
        <>
          <label className="setup-label" htmlFor="online-player-name">Nama pemain</label>
          <input
            id="online-player-name"
            className="setup-name"
            value={name}
            maxLength={16}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nama pemain"
          />
          <span className="setup-label">Pilih bidak</span>
          {choosePiece(piece)}

          <div className="online-create">
            <label className="setup-label" htmlFor="online-player-count">Maksimal pemain</label>
            <select
              id="online-player-count"
              className="online-select"
              value={maxPlayers}
              onChange={(event) => setMaxPlayers(Number(event.target.value))}
            >
              {[2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} pemain</option>)}
            </select>
            <button
              className="btn btn-primary btn-start"
              onClick={() => multiplayer.createRoom({ name: name.trim(), piece, maxPlayers })}
              disabled={busy || !name.trim()}
            >
              {busy ? 'Membuat room...' : 'Buat room'}
            </button>
          </div>

          <div className="online-divider"><span>atau gabung room</span></div>
          <label className="setup-label" htmlFor="online-room-code">Kode room</label>
          <input
            id="online-room-code"
            className="setup-name online-code-input"
            value={roomCode}
            maxLength={6}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="CONTOH"
          />
          <button
            className="btn btn-success btn-start"
            onClick={() => multiplayer.joinRoom({ code: roomCode, name: name.trim(), piece })}
            disabled={busy || !name.trim() || roomCode.length !== 6}
          >
            {busy ? 'Bergabung...' : 'Gabung room'}
          </button>
        </>
      )}
      {error && <p className="online-error" role="alert">{error}</p>}
    </div>
  );
}
