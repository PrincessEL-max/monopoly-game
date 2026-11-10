import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIONS, INITIAL_GAME_STATE } from '../logic/gameReducer.js';
import { supabase } from '../lib/supabase.js';

const SESSION_KEY = 'monopoly-online-session';
const CHANNEL_PREFIX = 'monopoly-room:';
const REFRESH_DEBOUNCE_MS = 250;
const POLL_INTERVAL_MS = 15_000;

const GAME_ACTIONS = {
  rollDice: [ACTIONS.ROLL_DICE],
  buyProperty: [ACTIONS.BUY_PROPERTY, 'squareId'],
  declineBuy: [ACTIONS.DECLINE_BUY],
  payRent: [ACTIONS.PAY_RENT],
  payTax: [ACTIONS.PAY_TAX],
  drawCard: [ACTIONS.DRAW_CARD],
  applyCard: [ACTIONS.APPLY_CARD],
  payJailFine: [ACTIONS.PAY_JAIL_FINE],
  useJailFreeCard: [ACTIONS.USE_JAIL_FREE_CARD, 'source'],
  buyHouse: [ACTIONS.BUY_HOUSE, 'squareId'],
  buyHotel: [ACTIONS.BUY_HOTEL, 'squareId'],
  sellHouse: [ACTIONS.SELL_HOUSE, 'squareId'],
  sellHotel: [ACTIONS.SELL_HOTEL, 'squareId'],
  mortgage: [ACTIONS.MORTGAGE, 'squareId'],
  unmortgage: [ACTIONS.UNMORTGAGE, 'squareId'],
  auctionBid: [ACTIONS.AUCTION_BID, 'amount'],
  auctionPass: [ACTIONS.AUCTION_PASS],
  settleDebt: [ACTIONS.SETTLE_DEBT],
  proposeTrade: [ACTIONS.PROPOSE_TRADE, 'offer'],
  acceptTrade: [ACTIONS.ACCEPT_TRADE],
  rejectTrade: [ACTIONS.REJECT_TRADE],
  declareBankruptcy: [ACTIONS.DECLARE_BANKRUPTCY],
  endTurn: [ACTIONS.END_TURN],
  dismissModal: [ACTIONS.DISMISS_MODAL],
};

const readSession = () => {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const useMultiplayer = (game) => {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    supabase ? '' : 'Atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk mengaktifkan multiplayer.',
  );
  const gameRef = useRef(game);
  gameRef.current = game;

  const request = useCallback(async (operation, payload = {}) => {
    if (!supabase) {
      throw new Error('Supabase belum dikonfigurasi. Isi URL project dan anon key.');
    }
    const { data, error: invokeError } = await supabase.functions.invoke('monopoly-game', {
      body: { operation, ...payload },
    });
    if (invokeError) {
      let message = data?.error || '';
      if (!message && invokeError.context instanceof Response) {
        try {
          message = (await invokeError.context.clone().json())?.error || '';
        } catch {
          message = '';
        }
      }
      message ||= invokeError.message || 'Permintaan gagal.';
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const storeSession = useCallback((session) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setPlayerId(session.playerId);
  }, []);

  const applySnapshot = useCallback((snapshot) => {
    if (snapshot.room) setRoom(snapshot.room);
    if (snapshot.gameState) gameRef.current.syncState(snapshot.gameState);
  }, []);

  const clearRoom = useCallback((message = '') => {
    localStorage.removeItem(SESSION_KEY);
    setRoom(null);
    setPlayerId(null);
    gameRef.current.syncState(INITIAL_GAME_STATE);
    if (message) setError(message);
  }, []);

  const refreshSnapshot = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    const snapshot = await request('snapshot', session);
    applySnapshot(snapshot);
  }, [applySnapshot, request]);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    let refreshTimer;
    let refreshInProgress = false;
    const session = (() => {
      try {
        return readSession();
      } catch {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch (reason) {
          setError(`Sesi tersimpan tidak dapat dihapus: ${reason.message}`);
        }
        setError('Sesi tersimpan tidak dapat dibaca. Silakan buat atau gabung room lagi.');
        return null;
      }
    })();

    if (!session) return undefined;
    setBusy(true);
    request('resume', session)
      .then((snapshot) => {
        if (active) {
          setError('');
          applySnapshot(snapshot);
          setPlayerId(session.playerId);
        }
      })
      .catch((reason) => {
        if (active) {
          clearRoom();
          setError(reason.message);
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });

    return () => { active = false; };
  }, [applySnapshot, clearRoom, request]);

  useEffect(() => {
    if (!supabase || !room?.id || !playerId) return undefined;
    let active = true;
    let refreshTimer;
    let refreshInProgress = false;
    const channel = supabase.channel(`${CHANNEL_PREFIX}${room.id}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerId },
      },
    });

    const refresh = async () => {
      if (!active || refreshInProgress) return;
      refreshInProgress = true;
      try {
        const snapshot = await request('snapshot', { ...readSession() });
        if (active) {
          setError('');
          applySnapshot(snapshot);
        }
      } catch (reason) {
        if (active) {
          if (reason.message.includes('Room tidak ditemukan')) clearRoom('Room sudah tidak tersedia.');
          else setError(reason.message);
        }
      } finally {
        refreshInProgress = false;
      }
    };

    const scheduleRefresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(refresh, REFRESH_DEBOUNCE_MS);
    };

    channel
      .on('broadcast', { event: 'changed' }, scheduleRefresh)
      .on('presence', { event: 'sync' }, () => {
        const presence = channel.presenceState();
        const connectedIds = new Set(
          Object.values(presence).flat().map((entry) => entry.playerId),
        );
        setRoom((current) => current && ({
          ...current,
          players: current.players.map((player) => ({
            ...player,
            connected: connectedIds.has(player.playerId),
          })),
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const currentSession = readSession();
          if (currentSession) await channel.track({ playerId: currentSession.playerId });
          scheduleRefresh();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('Koneksi realtime Supabase terputus; status akan disinkronkan ulang.');
        }
      });

    const polling = setInterval(scheduleRefresh, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearTimeout(refreshTimer);
      clearInterval(polling);
      supabase.removeChannel(channel);
    };
  }, [applySnapshot, clearRoom, playerId, request, room?.id]);

  const createRoom = useCallback(async (input) => {
    setBusy(true);
    setError('');
    try {
      localStorage.removeItem(SESSION_KEY);
      const response = await request('create', input);
      storeSession({ code: response.room.code, playerId: response.playerId, token: response.token });
      applySnapshot(response);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }, [applySnapshot, request, storeSession]);

  const joinRoom = useCallback(async (input) => {
    setBusy(true);
    setError('');
    try {
      const response = await request('join', input);
      storeSession({ code: response.room.code, playerId: response.playerId, token: response.token });
      applySnapshot(response);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }, [applySnapshot, request, storeSession]);

  const startRoom = useCallback(async () => {
    const session = readSession();
    if (!session) {
      setError('Sesi room tidak ditemukan. Silakan masuk kembali.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      applySnapshot(await request('start', session));
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }, [applySnapshot, request]);

  const leaveRoom = useCallback(async () => {
    let session;
    try {
      session = readSession();
    } catch (reason) {
      clearRoom();
      setError(`Sesi room tidak dapat dibaca: ${reason.message}`);
      return;
    }
    clearRoom();
    if (!session) return;
    try {
      await request('leave', session);
    } catch (reason) {
      setError(reason.message);
    }
  }, [clearRoom, request]);

  const sendAction = useCallback(async (type, payload) => {
    let session;
    try {
      session = readSession();
    } catch (reason) {
      setError(`Sesi room tidak dapat dibaca: ${reason.message}`);
      return;
    }
    if (!session) {
      setError('Sesi room tidak ditemukan. Silakan masuk kembali.');
      return;
    }
    const action = payload === undefined ? { type } : { type, [payload.key]: payload.value };
    try {
      applySnapshot(await request('action', { ...session, action }));
    } catch (reason) {
      setError(reason.message);
      if (reason.message.includes('State room berubah')) {
        try {
          await refreshSnapshot();
        } catch (refreshError) {
          setError(refreshError.message);
        }
      }
    }
  }, [applySnapshot, refreshSnapshot, request]);

  const actionHandlers = useMemo(() => Object.fromEntries(
    Object.entries(GAME_ACTIONS).map(([name, [type, key]]) => [
      name,
      (value) => sendAction(type, key ? { key, value } : undefined),
    ]),
  ), [sendAction]);

  const isHost = Boolean(room && room.hostPlayerId === playerId);
  const localPlayer = room?.players.find((player) => player.playerId === playerId) || null;

  return {
    room,
    isHost,
    localPlayer,
    busy,
    error,
    createRoom,
    joinRoom,
    startRoom,
    leaveRoom,
    actionHandlers,
    clearError: () => setError(''),
  };
};
