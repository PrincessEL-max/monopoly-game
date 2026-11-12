import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ACTIONS, INITIAL_GAME_STATE } from '../logic/gameReducer.js';
import { supabase } from '../lib/supabase.js';

const SESSION_KEY = 'monopoly-online-session';
const PROFILE_KEY = 'monopoly-online-profile';
const MATCH_KEY = 'monopoly-matchmaking-session';
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
  usePowerUp: [ACTIONS.USE_POWER_UP, 'payload'],
  acceptReroll: [ACTIONS.ACCEPT_REROLL],
  keepReroll: [ACTIONS.KEEP_REROLL],
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

const readStoredValue = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const useMultiplayer = (game) => {
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [social, setSocial] = useState({
    friends: [],
    results: [],
    invites: [],
    totalOnline: 0,
    activePlayers: 0,
    ping: 0,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    supabase ? '' : 'Atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY untuk mengaktifkan multiplayer.',
  );
  const gameRef = useRef(game);
  const profileSessionRef = useRef(readStoredValue(PROFILE_KEY));
  const matchSessionRef = useRef(readStoredValue(MATCH_KEY));
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

  const updateProfile = useCallback(async (name = '') => {
    const session = profileSessionRef.current || {};
    const startedAt = performance.now();
    const response = await request('profile', {
      ...session,
      name: name || session.name || 'Pemain 1',
    });
    const stored = {
      profileId: response.profile.id,
      profileToken: response.profileToken,
      name: response.profile.name,
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(stored));
    profileSessionRef.current = stored;
    setProfile(response.profile);
    setSocial((current) => ({
      ...current,
      ...response.social,
      results: current.results,
      ping: Math.round(performance.now() - startedAt),
    }));
    return { profile: response.profile, session: stored };
  }, [request]);

  const ensureProfile = useCallback(async (name = '') => {
    const current = profileSessionRef.current;
    if (current?.profileId && current?.profileToken && !name && profile) {
      return { profile: profile, session: current };
    }
    return updateProfile(name);
  }, [profile, updateProfile]);

  const profileRequest = useCallback(async (operation, payload = {}) => {
    const { session } = await ensureProfile();
    return request(operation, { ...session, ...payload });
  }, [ensureProfile, request]);

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

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    const refreshProfile = async () => {
      try {
        await updateProfile();
      } catch (reason) {
        if (active) setError(reason.message);
      }
    };
    refreshProfile();
    const heartbeat = setInterval(refreshProfile, 30_000);
    return () => {
      active = false;
      clearInterval(heartbeat);
    };
  }, [updateProfile]);

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
      const { profile: currentProfile, session: currentSession } = await ensureProfile(input.name);
      localStorage.removeItem(SESSION_KEY);
      const response = await request('create', {
        ...input,
        profileId: currentProfile.id,
        profileToken: currentSession.profileToken,
      });
      storeSession({ code: response.room.code, playerId: response.playerId, token: response.token });
      applySnapshot(response);
      return response;
    } catch (reason) {
      setError(reason.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, [applySnapshot, ensureProfile, request, storeSession]);

  const joinRoom = useCallback(async (input) => {
    setBusy(true);
    setError('');
    try {
      const { profile: currentProfile, session: currentSession } = await ensureProfile(input.name);
      const response = await request('join', {
        ...input,
        profileId: currentProfile.id,
        profileToken: currentSession.profileToken,
      });
      storeSession({ code: response.room.code, playerId: response.playerId, token: response.token });
      applySnapshot(response);
      return response;
    } catch (reason) {
      setError(reason.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, [applySnapshot, ensureProfile, request, storeSession]);

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
      return true;
    } catch (reason) {
      setError(reason.message);
      return false;
    } finally {
      setBusy(false);
    }
  }, [applySnapshot, request]);

  const startMatchmaking = useCallback(async (input) => {
    setBusy(true);
    setError('');
    try {
      const { session } = await ensureProfile(input.name);
      const existing = matchSessionRef.current || readStoredValue(MATCH_KEY);
      if (existing) {
        const status = await request('matchmaking_status', {
          ...session,
          playerId: existing.playerId,
          token: existing.token,
        });
        if (status.status === 'waiting' || status.status === 'matched') {
          matchSessionRef.current = { ...existing, profileId: session.profileId };
          return { estimatedSeconds: 30 };
        }
      }

      const response = await request('matchmaking_join', {
        ...session,
        ...input,
      });
      const matchSession = {
        profileId: session.profileId,
        profileToken: session.profileToken,
        playerId: response.playerId,
        token: response.token,
      };
      localStorage.setItem(MATCH_KEY, JSON.stringify(matchSession));
      matchSessionRef.current = matchSession;
      return response;
    } catch (reason) {
      setError(reason.message);
      return null;
    } finally {
      setBusy(false);
    }
  }, [ensureProfile, request]);

  const pollMatchmaking = useCallback(async () => {
    const matchSession = matchSessionRef.current || readStoredValue(MATCH_KEY);
    if (!matchSession) return { error: 'Sesi pencarian lawan tidak ditemukan.' };
    try {
      const result = await request('matchmaking_status', {
        profileId: matchSession.profileId,
        profileToken: matchSession.profileToken,
        playerId: matchSession.playerId,
        token: matchSession.token,
      });
      if (result.status === 'matched') {
        storeSession({
          code: result.room.code,
          playerId: result.playerId,
          token: result.token,
        });
        applySnapshot(result);
        localStorage.removeItem(MATCH_KEY);
        matchSessionRef.current = null;
      }
      return result;
    } catch (reason) {
      setError(reason.message);
      return { error: reason.message };
    }
  }, [applySnapshot, request, storeSession]);

  const cancelMatchmaking = useCallback(async () => {
    const matchSession = matchSessionRef.current || readStoredValue(MATCH_KEY);
    if (!matchSession) return true;
    try {
      await request('matchmaking_cancel', {
        profileId: matchSession.profileId,
        profileToken: matchSession.profileToken,
        playerId: matchSession.playerId,
        token: matchSession.token,
      });
      localStorage.removeItem(MATCH_KEY);
      matchSessionRef.current = null;
      return true;
    } catch (reason) {
      setError(reason.message);
      return false;
    }
  }, [request]);

  const addBot = useCallback(async ({ slot, difficulty = 'Sedang' }) => {
    const session = readSession();
    if (!session) {
      setError('Sesi room tidak ditemukan.');
      return false;
    }
    try {
      applySnapshot(await request('add_bot', { ...session, slot, difficulty }));
      return true;
    } catch (reason) {
      setError(reason.message);
      return false;
    }
  }, [applySnapshot, request]);

  const removeRoomPlayer = useCallback(async ({ slot }) => {
    const session = readSession();
    if (!session) {
      setError('Sesi room tidak ditemukan.');
      return false;
    }
    try {
      applySnapshot(await request('remove_player', { ...session, slot }));
      return true;
    } catch (reason) {
      setError(reason.message);
      return false;
    }
  }, [applySnapshot, request]);

  const searchFriends = useCallback(async (query) => {
    try {
      const response = await profileRequest('friend_search', { query });
      setSocial((current) => ({ ...current, results: response.results }));
      return response.results;
    } catch (reason) {
      setError(reason.message);
      return null;
    }
  }, [profileRequest]);

  const addFriend = useCallback(async (friendId) => {
    try {
      await profileRequest('friend_add', { friendId });
      const response = await updateProfile();
      return response;
    } catch (reason) {
      setError(reason.message);
      return null;
    }
  }, [profileRequest, updateProfile]);

  const inviteFriend = useCallback(async (friendId, roomCode = null) => {
    try {
      await profileRequest('friend_invite', { friendId, roomCode });
      return true;
    } catch (reason) {
      setError(reason.message);
      return false;
    }
  }, [profileRequest]);

  const leaveRoom = useCallback(async () => {
    let session;
    try {
      session = readSession();
    } catch (reason) {
      clearRoom();
      setError(`Sesi room tidak dapat dibaca: ${reason.message}`);
      return false;
    }
    if (!session) {
      clearRoom();
      return true;
    }
    try {
      await request('leave', session);
      clearRoom();
      return true;
    } catch (reason) {
      setError(reason.message);
      return false;
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
    const action = payload === undefined
      ? { type }
      : payload.key === 'payload'
        ? { type, ...payload.value }
        : { type, [payload.key]: payload.value };
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
    profile,
    social,
    busy,
    error,
    startMatchmaking,
    pollMatchmaking,
    cancelMatchmaking,
    createRoom,
    joinRoom,
    startRoom,
    addBot,
    removeRoomPlayer,
    searchFriends,
    addFriend,
    inviteFriend,
    leaveRoom,
    actionHandlers,
    clearError: () => setError(''),
  };
};
