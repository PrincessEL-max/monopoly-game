import React, { useCallback, useEffect, useRef } from 'react';
import { PLAYER_CONFIG } from '../../constants/config';
import '../../styles/game-menu-frame.css';

const CHANNEL = 'monopoli-game-menu';
const OUTBOUND_CHANNEL = 'monopoli-game-app';
const DIFFICULTIES = { Mudah: 'easy', Sedang: 'medium', Sulit: 'hard' };

export default function GameMenuFrame({ multiplayer, sound, onStartOffline, onContinue }) {
  const frameRef = useRef(null);
  const handlerRef = useRef(null);
  const roomInviteCodeRef = useRef(new URLSearchParams(window.location.search).get('room'));
  const roomInviteHandledRef = useRef(false);
  const matchPollRef = useRef({ active: false, timer: null });
  const latestRef = useRef({ multiplayer, sound, onStartOffline, onContinue });
  latestRef.current = { multiplayer, sound, onStartOffline, onContinue };

  const send = useCallback((type, detail) => {
    frameRef.current?.contentWindow?.postMessage(
      { channel: OUTBOUND_CHANNEL, type, detail },
      window.location.origin,
    );
  }, []);

  const syncSocial = useCallback(() => {
    const { multiplayer: current } = latestRef.current;
    const stats = current.social || {};
    send('social', {
      friends: stats.friends || [],
      results: stats.results || [],
      invites: stats.invites || [],
      totalOnline: stats.totalOnline || 0,
      activePlayers: stats.activePlayers || 0,
      server: { name: current.error ? 'TIDAK TERHUBUNG' : 'INDONESIA', ping: stats.ping || 0 },
    });
  }, [send]);

  const syncRoom = useCallback(() => {
    const { multiplayer: current } = latestRef.current;
    if (!current.room) return;
    if (current.room.settings?.mode === 'quick') return;
    send('room', {
      ...current.room,
      isHost: current.isHost,
      profileId: current.profile?.id,
    });
  }, [send]);

  const startMatchPolling = useCallback(async () => {
    const pollState = matchPollRef.current;
    pollState.active = true;
    const poll = async () => {
      if (!pollState.active) return;
      const { multiplayer: current } = latestRef.current;
      const result = await current.pollMatchmaking();
      if (!pollState.active) return;
      if (result?.status === 'matched') {
        pollState.active = false;
        const ownProfile = current.profile?.id;
        const opponents = result.room.players
          .filter((player) => player.profileId !== ownProfile)
          .map((player) => ({ name: player.name, id: player.publicId || player.playerId }));
        send('match', { players: opponents });
        return;
      }
      if (result?.error) {
        pollState.active = false;
        send('toast', result.error);
        return;
      }
      pollState.timer = setTimeout(poll, 1800);
    };
    await poll();
  }, [send]);

  const stopMatchPolling = useCallback(() => {
    matchPollRef.current.active = false;
    clearTimeout(matchPollRef.current.timer);
  }, []);

  const handleMessage = useCallback(async (type, detail) => {
    const current = latestRef.current;
    const { multiplayer: game, sound: currentSound } = current;
    const defaultName = game.profile?.name || 'Pemain 1';
    const defaultPiece = PLAYER_CONFIG.PIECE_ICONS[0];
    try {
      switch (type) {
        case 'ready':
          syncSocial();
          if (game.room) syncRoom();
          if (roomInviteCodeRef.current && !roomInviteHandledRef.current) {
            roomInviteHandledRef.current = true;
            window.history.replaceState(
              window.history.state,
              '',
              `${window.location.pathname}${window.location.hash}`,
            );
            handlerRef.current?.('join', { roomId: roomInviteCodeRef.current });
          }
          break;
        case 'start':
          if (detail?.mode === 'offline') {
            const players = detail.players.map((player, index) => ({
              name: `Pemain ${player.slot || index + 1}`,
              piece: PLAYER_CONFIG.PIECE_ICONS[(player.slot || index + 1) - 1],
              isAI: player.type === 'bot',
              difficulty: DIFFICULTIES[player.difficulty] || 'medium',
            }));
            current.onStartOffline(players, {
              startMoney: detail.startMoney,
              map: detail.map,
              speed: detail.speed,
            });
          } else if (game.isHost) {
            stopMatchPolling();
            if (!await game.startRoom()) send('toast', game.error || 'Permainan tidak dapat dimulai.');
          } else {
            send('toast', 'Menunggu host memulai permainan...');
          }
          break;
        case 'save':
          current.onContinue();
          break;
        case 'quick': {
          const result = await game.startMatchmaking({ name: defaultName, piece: defaultPiece });
          if (!result) {
            send('toast', game.error || 'Pencarian lawan gagal dimulai.');
            break;
          }
          send('estimate', { seconds: result.estimatedSeconds || 30 });
          startMatchPolling();
          break;
        }
        case 'quickcancel':
          stopMatchPolling();
          if (!await game.cancelMatchmaking()) send('toast', game.error || 'Pencarian belum berhasil dibatalkan.');
          break;
        case 'create':
          {
            const created = await game.createRoom({
            name: defaultName,
            piece: defaultPiece,
            maxPlayers: detail.maxPlayers,
            type: detail.type,
            map: detail.map,
            startMoney: detail.startMoney,
            turnSeconds: detail.turnSeconds,
            });
            send('roomCreateComplete');
            if (!created) send('toast', game.error || 'Kamar tidak dapat dibuat.');
          }
          break;
        case 'join':
          if (!await game.joinRoom({ code: detail.roomId, name: defaultName, piece: defaultPiece })) {
            send('toast', game.error || 'Tidak dapat bergabung ke kamar.');
          }
          break;
        case 'roombot':
          if (!await game.addBot({ slot: detail.slot })) send('toast', game.error || 'BOT tidak dapat ditambahkan.');
          break;
        case 'roomremove':
          if (!await game.removeRoomPlayer({ slot: detail.slot })) send('toast', game.error || 'Pemain tidak dapat dikeluarkan.');
          break;
        case 'roominvite': {
          const code = game.room?.code || detail.roomId;
          if (!code) break;
          const url = `${window.location.origin}/?room=${encodeURIComponent(code)}`;
          if (navigator.share) await navigator.share({ title: 'Undangan Monopoli', text: `Gabung kamar ${code}`, url });
          else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(url);
            send('toast', 'Tautan kamar disalin.');
          } else {
            send('toast', `Bagikan kode kamar: ${code}`);
          }
          break;
        }
        case 'disband':
          if (await game.leaveRoom()) send('roomLeft');
          else send('toast', game.error || 'Tidak dapat keluar dari kamar.');
          break;
        case 'friendsearch': {
          const results = await game.searchFriends(detail.query);
          if (!results) send('toast', 'Pencarian teman gagal. Coba lagi.');
          else send('social', { ...latestRef.current.multiplayer.social, results });
          break;
        }
        case 'addfriend':
          {
            const added = await game.addFriend(detail.id || detail.query);
            if (detail.id) send('friendAddResult', { id: detail.id, success: Boolean(added) });
            send('toast', added
              ? `Teman ${detail.name || detail.id || detail.query} ditambahkan.`
              : game.error || 'Teman tidak dapat ditambahkan.');
          }
          break;
        case 'invite':
          if (!await game.inviteFriend(detail.id, game.room?.code || null)) send('toast', game.error || 'Undangan tidak dapat dikirim.');
          else send('toast', `Undangan terkirim ke ${detail.name}.`);
          break;
        case 'settings':
          if (detail.sfx !== currentSound.enabled) currentSound.setEnabled(detail.sfx);
          break;
        default:
          break;
      }
    } catch (error) {
      send('toast', error.message || 'Permintaan gagal. Coba lagi.');
    }
  }, [send, startMatchPolling, stopMatchPolling, syncRoom, syncSocial]);

  handlerRef.current = handleMessage;

  useEffect(() => {
    const onMessage = (event) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.channel !== CHANNEL || typeof message.type !== 'string') return;
      handlerRef.current?.(message.type, message.detail);
    };
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      stopMatchPolling();
    };
  }, [stopMatchPolling]);

  useEffect(() => {
    syncSocial();
    syncRoom();
  }, [multiplayer.room, multiplayer.social, multiplayer.isHost, multiplayer.error, syncRoom, syncSocial]);

  return (
    <div className="game-menu-frame">
      <iframe
        ref={frameRef}
        title="Menu Monopoli Indonesia"
        src="/monopoli-menu/index.html"
        allow="clipboard-write; web-share"
      />
    </div>
  );
}
