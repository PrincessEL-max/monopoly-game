import { createClient } from "supabase";
import {
  ACTIONS,
  INITIAL_GAME_STATE,
  reducer,
} from "../../../src/logic/gameReducer.js";
import { SQUARES } from "../../../src/constants/squares.js";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PIECES = new Set(["🚀", "🚗", "⚓", "🎩", "🐶", "💎"]);
const ALLOWED_ACTIONS = new Set(
  Object.values(ACTIONS).filter((type) =>
    ![ACTIONS.START_GAME, ACTIONS.LOAD_GAME, ACTIONS.SYNC_STATE].includes(type)
  ),
);
const roomChannel = (roomId: string) => `monopoly-room:${roomId}`;

type GamePlayer = {
  id: number;
  bankrupt?: boolean;
  isAI?: boolean;
  powerUps?: { id: string; action: string }[];
};
type GameState = {
  players: GamePlayer[];
  currentPlayerIndex: number;
  turnStartedAt?: number | null;
  settings?: { turnSeconds?: number | null };
  auction?: { currentBidderId: number } | null;
  pendingTrade?: { to: number } | null;
};
type RoomRecord = {
  id: string;
  code: string;
  host_player_id: string;
  max_players: number;
  started: boolean;
  game_state: GameState | null;
  version: number;
  room_type: "Publik" | "Privat";
  map_id: "nusantara" | "dunia" | "kota" | "nusantara-compact";
  start_money: 200000 | 250000 | 300000;
  turn_seconds: 15 | 30 | 45;
  mode: "room" | "quick";
};
type RoomPlayer = {
  id: string;
  room_id: string;
  seat_index: number;
  name: string;
  piece: string;
  connected: boolean;
  profile_id: string | null;
  is_bot: boolean;
  difficulty: "Mudah" | "Sedang" | "Sulit";
};
type ProfileRecord = {
  id: string;
  public_id: string;
  token_hash: string;
  display_name: string;
  online_until: string;
};

class RequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const hashToken = async (token: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
};

const randomToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

const randomCode = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
};

const throwDatabaseError = (error: { message: string }) => {
  throw new RequestError(error.message, 400);
};

const getRoom = async (roomId: string): Promise<RoomRecord> => {
  const { data, error } = await db.from("monopoly_rooms").select("*").eq(
    "id",
    roomId,
  ).maybeSingle();
  if (error) throwDatabaseError(error);
  if (!data) throw new RequestError("Room tidak ditemukan.", 404);
  return data as RoomRecord;
};

const getPlayers = async (roomId: string): Promise<RoomPlayer[]> => {
  const { data, error } = await db
    .from("monopoly_room_players")
    .select("id, seat_index, name, piece, connected, profile_id, is_bot, difficulty")
    .eq("room_id", roomId)
    .order("seat_index");
  if (error) throwDatabaseError(error);
  return (data || []) as RoomPlayer[];
};

const roomSnapshot = async (roomId: string) => {
  const [room, players] = await Promise.all([
    getRoom(roomId),
    getPlayers(roomId),
  ]);
  const profileIds = players
    .map((player) => player.profile_id)
    .filter((id): id is string => Boolean(id));
  const { data: profiles, error: profileError } = profileIds.length
    ? await db.from("monopoly_profiles").select("id, public_id").in("id", profileIds)
    : { data: [], error: null };
  if (profileError) throwDatabaseError(profileError);
  const publicIds = new Map<string, string>();
  for (const profile of profiles || []) {
    publicIds.set(profile.id, profile.public_id);
  }
  return {
    room: {
      id: room.id,
      code: room.code,
      maxPlayers: room.max_players,
      started: room.started,
      hostPlayerId: room.host_player_id,
      settings: {
        type: room.room_type,
        map: room.map_id,
        startMoney: room.start_money,
        turnSeconds: room.turn_seconds,
        mode: room.mode,
      },
      players: players.map((player) => ({
        playerId: player.id,
        seatIndex: player.seat_index,
        name: player.name,
        piece: player.piece,
        connected: player.connected,
        profileId: player.profile_id,
        publicId: player.profile_id ? publicIds.get(player.profile_id) || null : null,
        isBot: player.is_bot,
        difficulty: player.difficulty,
      })),
    },
    gameState: room.game_state,
    version: room.version,
  };
};

const requirePlayer = async (
  body: Record<string, unknown>,
): Promise<{ player: RoomPlayer; room: RoomRecord }> => {
  const playerId = typeof body.playerId === "string" ? body.playerId : "";
  const token = typeof body.token === "string" ? body.token : "";
  const code = typeof body.code === "string"
    ? body.code.trim().toUpperCase()
    : "";
  if (!playerId || !/^[a-f0-9]{64}$/.test(token) || !code) {
    throw new RequestError("Sesi room tidak valid.", 401);
  }

  const tokenHash = await hashToken(token);
  const { data: player, error: playerError } = await db
    .from("monopoly_room_players")
    .select("id, room_id, seat_index, connected, profile_id, is_bot, difficulty")
    .eq("id", playerId)
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (playerError) throwDatabaseError(playerError);
  if (!player) throw new RequestError("Sesi room tidak dapat dipulihkan.", 401);

  const member = player as RoomPlayer;
  const room = await getRoom(member.room_id);
  if (room.code !== code) {
    throw new RequestError("Kode room tidak cocok dengan sesi ini.", 401);
  }
  return { player: member, room };
};

const requireProfile = async (
  body: Record<string, unknown>,
): Promise<ProfileRecord> => {
  const profileId = typeof body.profileId === "string" ? body.profileId : "";
  const token = typeof body.profileToken === "string" ? body.profileToken : "";
  if (!profileId || !/^[a-f0-9]{64}$/.test(token)) {
    throw new RequestError("Sesi pemain tidak valid.", 401);
  }

  const tokenHash = await hashToken(token);
  const { data: profile, error } = await db
    .from("monopoly_profiles")
    .select("id, public_id, token_hash, display_name, online_until")
    .eq("id", profileId)
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  if (!profile) throw new RequestError("Sesi pemain tidak dapat dipulihkan.", 401);
  return profile as ProfileRecord;
};

const profileSocialData = async (profile: ProfileRecord) => {
  const now = new Date().toISOString();
  const [friendLinks, onlineCount, startedRooms, inviteRows] = await Promise.all([
    db.from("monopoly_friends").select("friend_id").eq("profile_id", profile.id),
    db.from("monopoly_profiles").select("id", { count: "exact", head: true }).gt("online_until", now),
    db.from("monopoly_rooms").select("id").eq("started", true),
    db.from("monopoly_friend_invites")
      .select("id, sender_id, room_code")
      .eq("target_id", profile.id)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (friendLinks.error) throwDatabaseError(friendLinks.error);
  if (onlineCount.error) throwDatabaseError(onlineCount.error);
  if (startedRooms.error) throwDatabaseError(startedRooms.error);
  if (inviteRows.error) throwDatabaseError(inviteRows.error);

  const friendIds = (friendLinks.data || []).map((link) => link.friend_id);
  const [friendProfiles, senders, activePlayers] = await Promise.all([
    friendIds.length
      ? db.from("monopoly_profiles")
        .select("id, public_id, display_name, online_until")
        .in("id", friendIds)
      : Promise.resolve({ data: [], error: null }),
    inviteRows.data?.length
      ? db.from("monopoly_profiles")
        .select("id, display_name")
        .in("id", inviteRows.data.map((invite) => invite.sender_id))
      : Promise.resolve({ data: [], error: null }),
    startedRooms.data?.length
      ? db.from("monopoly_room_players")
        .select("id", { count: "exact", head: true })
        .in("room_id", startedRooms.data.map((room) => room.id))
        .eq("connected", true)
      : Promise.resolve({ count: 0, error: null }),
  ]);
  if (friendProfiles.error) throwDatabaseError(friendProfiles.error);
  if (senders.error) throwDatabaseError(senders.error);
  if (activePlayers.error) throwDatabaseError(activePlayers.error);

  const senderNames = new Map((senders.data || []).map((sender) => [sender.id, sender.display_name]));
  return {
    friends: (friendProfiles.data || []).map((friend) => ({
      id: friend.public_id,
      name: friend.display_name,
      online: Date.parse(friend.online_until) > Date.now(),
    })),
    totalOnline: onlineCount.count || 0,
    activePlayers: activePlayers.count || 0,
    invites: (inviteRows.data || []).map((invite) => ({
      id: invite.id,
      fromName: senderNames.get(invite.sender_id) || "Teman",
      roomCode: invite.room_code,
    })),
  };
};

const publishChange = async (roomId: string, version: number) => {
  const channel = db.channel(roomChannel(roomId));
  const status = await channel.send({
    type: "broadcast",
    event: "changed",
    payload: { version },
  });
  if (status !== "ok") console.error("Room update broadcast failed:", status);
  await db.removeChannel(channel);
};

const commitState = async (
  roomId: string,
  expectedVersion: number,
  gameState: unknown,
  started: boolean | null = null,
) => {
  const { data, error } = await db.rpc("commit_monopoly_game_state", {
    p_room_id: roomId,
    p_expected_version: expectedVersion,
    p_game_state: gameState,
    p_started: started,
  });
  if (error) throwDatabaseError(error);
  if (!data) {
    throw new RequestError(
      "State room berubah. Sinkronkan lalu coba lagi.",
      409,
    );
  }

  const { data: updated, error: selectError } = await db
    .from("monopoly_rooms")
    .select("version")
    .eq("id", roomId)
    .single();
  if (selectError) throwDatabaseError(selectError);
  if (!updated) {
    throw new RequestError("Room tidak ditemukan setelah penyimpanan.", 404);
  }
  await publishChange(roomId, updated.version);
};

const validateAction = (
  action: Record<string, unknown>,
  room: RoomRecord,
  player: RoomPlayer,
) => {
  const state = room.game_state;
  if (!room.started || !state || !ALLOWED_ACTIONS.has(action.type as string)) {
    throw new RequestError("Aksi tidak valid.");
  }
  const memberPlayer = state.players?.[player.seat_index];
  const expectedPlayer = action.type === ACTIONS.AUCTION_BID ||
      action.type === ACTIONS.AUCTION_PASS
    ? state.players.find((candidate) =>
      candidate.id === state.auction?.currentBidderId
    )
    : action.type === ACTIONS.ACCEPT_TRADE ||
        action.type === ACTIONS.REJECT_TRADE
    ? state.players.find((candidate) =>
      candidate.id === state.pendingTrade?.to
    )
    : state.players[state.currentPlayerIndex];
  const hostControlsBot = player.id === room.host_player_id &&
    expectedPlayer?.isAI === true;
  const turnSeconds = state.settings?.turnSeconds;
  const turnExpired = typeof state.turnStartedAt === "number" &&
    typeof turnSeconds === "number" &&
    Date.now() >= state.turnStartedAt + turnSeconds * 1000;
  const hostControlsTimedOutPlayer = player.id === room.host_player_id &&
    turnExpired;
  const gamePlayer = hostControlsBot || hostControlsTimedOutPlayer
    ? expectedPlayer
    : memberPlayer;
  if (!gamePlayer || gamePlayer.bankrupt) {
    throw new RequestError("Pemain tidak aktif.");
  }
  if (!hostControlsBot && !memberPlayer) {
    throw new RequestError("Pemain tidak aktif.");
  }

  if (
    action.type === ACTIONS.AUCTION_BID || action.type === ACTIONS.AUCTION_PASS
  ) {
    if (state.auction?.currentBidderId !== gamePlayer.id) {
      throw new RequestError("Bukan giliran lelangmu.", 403);
    }
  } else if (
    action.type === ACTIONS.ACCEPT_TRADE || action.type === ACTIONS.REJECT_TRADE
  ) {
    if (state.pendingTrade?.to !== gamePlayer.id) {
      throw new RequestError("Trade ini bukan ditujukan kepadamu.", 403);
    }
  } else if (state.players[state.currentPlayerIndex]?.id !== gamePlayer.id) {
    throw new RequestError("Belum giliranmu.", 403);
  }

  if (JSON.stringify(action).length > 8_000) {
    throw new RequestError("Data aksi terlalu besar.");
  }

  const squareActions = [
    ACTIONS.BUY_PROPERTY,
    ACTIONS.BUY_HOUSE,
    ACTIONS.BUY_HOTEL,
    ACTIONS.SELL_HOUSE,
    ACTIONS.SELL_HOTEL,
    ACTIONS.MORTGAGE,
    ACTIONS.UNMORTGAGE,
  ];
  if (
    squareActions.includes(action.type as string) &&
    (!Number.isInteger(action.squareId) ||
      Number(action.squareId) < 0 ||
      Number(action.squareId) >= 40)
  ) {
    throw new RequestError("Petak tidak valid.");
  }
  if (
    action.type === ACTIONS.AUCTION_BID &&
    (!Number.isSafeInteger(action.amount) || Number(action.amount) < 0 ||
      Number(action.amount) > 1_000_000_000)
  ) {
    throw new RequestError("Nilai tawaran tidak valid.");
  }
  if (
    action.type === ACTIONS.USE_JAIL_FREE_CARD &&
    !["chance", "community_chest"].includes(action.source as string)
  ) {
    throw new RequestError("Kartu tidak valid.");
  }
  if (action.type === ACTIONS.ROLL_DICE && "rollOverride" in action) {
    throw new RequestError("Hasil dadu tidak boleh ditentukan oleh pemain.");
  }
  if (action.type === ACTIONS.USE_POWER_UP) {
    const powerUp = gamePlayer.powerUps?.find((card) => card.id === action.cardId);
    if (!powerUp) throw new RequestError("Power Up tidak ditemukan.");
    if (
      powerUp.action === "power_golden_die" &&
      (!Number.isInteger(action.choice) || Number(action.choice) < 1 ||
        Number(action.choice) > 6)
    ) {
      throw new RequestError("Pilihan dadu tidak valid.");
    }
    if (powerUp.action === "power_ticket_station") {
      const target = SQUARES.find((square) => square.id === action.squareId);
      if (!target || !["airport", "utility"].includes(target.type)) {
        throw new RequestError("Tujuan tiket tidak valid.");
      }
    }
  }
  if (action.type === ACTIONS.PROPOSE_TRADE) {
    const offer = action.offer as Record<string, unknown> | undefined;
    const playerIds = new Set(
      state.players.map((candidate: { id: number }) => candidate.id),
    );
    const validIds = (ids: unknown) =>
      Array.isArray(ids) && ids.length <= 40 &&
      ids.every((id) => Number.isInteger(id) && id >= 0 && id < 40);
    if (
      !offer ||
      !playerIds.has(offer.from as number) ||
      !playerIds.has(offer.to as number) ||
      offer.from !== gamePlayer.id ||
      offer.to === offer.from ||
      !Number.isSafeInteger(offer.offeredMoney) ||
      Number(offer.offeredMoney) < 0 ||
      !Number.isSafeInteger(offer.requestedMoney) ||
      Number(offer.requestedMoney) < 0 ||
      !validIds(offer.offeredProps) ||
      !validIds(offer.requestedProps)
    ) {
      throw new RequestError("Penawaran trade tidak valid.");
    }
  }
};

const handleRequest = async (body: Record<string, unknown>) => {
  switch (body.operation) {
    case "profile": {
      const name = typeof body.name === "string"
        ? body.name.trim().slice(0, 16)
        : "Pemain 1";
      if (!name) throw new RequestError("Nama pemain tidak boleh kosong.");

      let profile: ProfileRecord;
      let token: string;
      if (typeof body.profileId === "string" && typeof body.profileToken === "string") {
        profile = await requireProfile(body);
        token = body.profileToken;
        const { data: updated, error } = await db
          .from("monopoly_profiles")
          .update({ display_name: name, online_until: new Date(Date.now() + 60_000).toISOString() })
          .eq("id", profile.id)
          .select("id, public_id, token_hash, display_name, online_until")
          .single();
        if (error) throwDatabaseError(error);
        profile = updated as ProfileRecord;
      } else {
        const profileId = crypto.randomUUID();
        token = randomToken();
        let created: ProfileRecord | null = null;
        for (let attempt = 0; attempt < 5; attempt += 1) {
          const publicId = randomCode();
          const { data, error } = await db
            .from("monopoly_profiles")
            .insert({
              id: profileId,
              public_id: publicId,
              token_hash: await hashToken(token),
              display_name: name,
              online_until: new Date(Date.now() + 60_000).toISOString(),
            })
            .select("id, public_id, token_hash, display_name, online_until")
            .maybeSingle();
          if (!error) {
            created = data as ProfileRecord;
            break;
          }
          if (error.code !== "23505" || attempt === 4) throwDatabaseError(error);
        }
        if (!created) throw new RequestError("Profil pemain tidak dapat dibuat.", 500);
        profile = created;
      }

      return {
        profile: { id: profile.id, publicId: profile.public_id, name: profile.display_name },
        profileToken: token,
        social: await profileSocialData(profile),
      };
    }

    case "friend_search": {
      const profile = await requireProfile(body);
      const query = typeof body.query === "string" ? body.query.trim().slice(0, 24) : "";
      if (!query) return { results: [] };
      const [exact, byName] = await Promise.all([
        db.from("monopoly_profiles")
          .select("public_id, display_name, online_until")
          .eq("public_id", query.toUpperCase())
          .neq("id", profile.id)
          .limit(10),
        db.from("monopoly_profiles")
          .select("public_id, display_name, online_until")
          .ilike("display_name", `%${query}%`)
          .neq("id", profile.id)
          .limit(10),
      ]);
      if (exact.error) throwDatabaseError(exact.error);
      if (byName.error) throwDatabaseError(byName.error);
      const results = new Map<string, {
        public_id: string;
        display_name: string;
        online_until: string;
      }>();
      [...(exact.data || []), ...(byName.data || [])].forEach((candidate) =>
        results.set(candidate.public_id, candidate)
      );
      return {
        results: [...results.values()].map((candidate) => ({
          id: candidate.public_id,
          name: candidate.display_name,
          online: Date.parse(candidate.online_until) > Date.now(),
        })),
      };
    }

    case "friend_add": {
      const profile = await requireProfile(body);
      const publicId = typeof body.friendId === "string"
        ? body.friendId.trim().toUpperCase()
        : "";
      const { data: friend, error: friendError } = await db
        .from("monopoly_profiles")
        .select("id")
        .eq("public_id", publicId)
        .maybeSingle();
      if (friendError) throwDatabaseError(friendError);
      if (!friend) throw new RequestError("Pemain dengan ID tersebut tidak ditemukan.", 404);
      if (friend.id === profile.id) throw new RequestError("Kamu tidak dapat menambahkan dirimu sendiri.");

      const links = [
        { profile_id: profile.id, friend_id: friend.id },
        { profile_id: friend.id, friend_id: profile.id },
      ];
      const { error } = await db.from("monopoly_friends").upsert(links, {
        onConflict: "profile_id,friend_id",
        ignoreDuplicates: true,
      });
      if (error) throwDatabaseError(error);
      return { added: true };
    }

    case "friend_invite": {
      const profile = await requireProfile(body);
      const publicId = typeof body.friendId === "string"
        ? body.friendId.trim().toUpperCase()
        : "";
      const { data: friend, error: friendError } = await db
        .from("monopoly_profiles")
        .select("id")
        .eq("public_id", publicId)
        .maybeSingle();
      if (friendError) throwDatabaseError(friendError);
      if (!friend) throw new RequestError("Teman tidak ditemukan.", 404);
      const { error } = await db.from("monopoly_friend_invites").insert({
        sender_id: profile.id,
        target_id: friend.id,
        room_code: typeof body.roomCode === "string" ? body.roomCode : null,
      });
      if (error) throwDatabaseError(error);
      return { sent: true };
    }

    case "matchmaking_join": {
      const profile = await requireProfile(body);
      const name = typeof body.name === "string"
        ? body.name.trim().slice(0, 16)
        : profile.display_name;
      const piece = body.piece;
      if (!name || !PIECES.has(piece as string)) {
        throw new RequestError("Nama atau bidak tidak valid.");
      }

      const { data: existing, error: existingError } = await db
        .from("monopoly_matchmaking_queue")
        .select("player_id, room_id")
        .eq("profile_id", profile.id)
        .maybeSingle();
      if (existingError) throwDatabaseError(existingError);
      if (existing) {
        throw new RequestError("Pencarian lawan sebelumnya masih aktif.");
      }

      const playerId = crypto.randomUUID();
      const token = randomToken();
      const { error } = await db.from("monopoly_matchmaking_queue").insert({
        profile_id: profile.id,
        player_id: playerId,
        token_hash: await hashToken(token),
        name,
        piece,
      });
      if (error) throwDatabaseError(error);

      const { data: matchedRoomId, error: matchError } = await db.rpc(
        "match_monopoly_queue",
        { p_room_id: crypto.randomUUID() },
      );
      if (matchError) throwDatabaseError(matchError);
      if (matchedRoomId) {
        const room = await getRoom(matchedRoomId);
        await publishChange(room.id, room.version);
      }
      return { playerId, token, estimatedSeconds: 30 };
    }

    case "matchmaking_status": {
      const profile = await requireProfile(body);
      const playerId = typeof body.playerId === "string" ? body.playerId : "";
      const token = typeof body.token === "string" ? body.token : "";
      if (!playerId || !/^[a-f0-9]{64}$/.test(token)) {
        throw new RequestError("Sesi pencarian tidak valid.", 401);
      }
      const { data: queued, error } = await db
        .from("monopoly_matchmaking_queue")
        .select("room_id")
        .eq("profile_id", profile.id)
        .eq("player_id", playerId)
        .eq("token_hash", await hashToken(token))
        .maybeSingle();
      if (error) throwDatabaseError(error);
      if (!queued) throw new RequestError("Pencarian lawan tidak ditemukan.", 404);
      if (!queued.room_id) return { status: "waiting" };

      const snapshot = await roomSnapshot(queued.room_id);
      return {
        status: "matched",
        ...snapshot,
        playerId,
        token,
        profileId: profile.id,
      };
    }

    case "matchmaking_cancel": {
      const profile = await requireProfile(body);
      const playerId = typeof body.playerId === "string" ? body.playerId : "";
      const token = typeof body.token === "string" ? body.token : "";
      if (!playerId || !/^[a-f0-9]{64}$/.test(token)) {
        throw new RequestError("Sesi pencarian tidak valid.", 401);
      }
      const { data: queued, error } = await db
        .from("monopoly_matchmaking_queue")
        .select("player_id")
        .eq("profile_id", profile.id)
        .eq("player_id", playerId)
        .eq("token_hash", await hashToken(token))
        .maybeSingle();
      if (error) throwDatabaseError(error);
      if (!queued) return { cancelled: true };
      const { data, error: cancelError } = await db.rpc(
        "cancel_monopoly_matchmaking",
        { p_profile_id: profile.id, p_player_id: playerId },
      );
      if (cancelError) throwDatabaseError(cancelError);
      return { cancelled: Boolean(data) };
    }

    case "create": {
      const name = typeof body.name === "string"
        ? body.name.trim().slice(0, 16)
        : "";
      const piece = body.piece;
      const maxPlayers = Number(body.maxPlayers);
      const roomType = body.type === "Privat" ? "Privat" : "Publik";
      const mapId = body.map === "dunia" || body.map === "kota" ||
          body.map === "nusantara-compact"
        ? body.map
        : "nusantara";
      const startMoney = Number(body.startMoney ?? 250000);
      const turnSeconds = Number(body.turnSeconds ?? 30);
      const profileId = typeof body.profileId === "string" ? body.profileId : null;
      if (
        !name || !PIECES.has(piece as string) ||
        !Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 6 ||
        ![200000, 250000, 300000].includes(startMoney) ||
        ![15, 30, 45].includes(turnSeconds)
      ) {
        throw new RequestError("Nama, bidak, atau jumlah pemain tidak valid.");
      }
      if (profileId) await requireProfile(body);

      const playerId = crypto.randomUUID();
      const token = randomToken();
      const roomId = crypto.randomUUID();
      let roomCreated = false;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const code = randomCode();
        const { error } = await db.rpc("create_monopoly_room", {
          p_room_id: roomId,
          p_code: code,
          p_player_id: playerId,
          p_token_hash: await hashToken(token),
          p_name: name,
          p_piece: piece,
          p_max_players: maxPlayers,
          p_profile_id: profileId,
          p_room_type: roomType,
          p_map_id: mapId,
          p_start_money: startMoney,
          p_turn_seconds: turnSeconds,
        });
        if (!error) {
          roomCreated = true;
          break;
        }
        if (error.code !== "23505" || attempt === 2) throwDatabaseError(error);
      }
      if (!roomCreated) {
        throw new RequestError("Tidak dapat membuat room.", 500);
      }

      const snapshot = await roomSnapshot(roomId);
      return { ...snapshot, playerId, token };
    }

    case "join": {
      const code = typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";
      const name = typeof body.name === "string"
        ? body.name.trim().slice(0, 16)
        : "";
      const piece = body.piece;
      if (
        !/^[A-Z2-9]{6}$/.test(code) || !name || !PIECES.has(piece as string)
      ) {
        throw new RequestError("Kode room, nama, atau bidak tidak valid.");
      }
      const profileId = typeof body.profileId === "string" ? body.profileId : null;
      if (profileId) await requireProfile(body);
      const playerId = crypto.randomUUID();
      const token = randomToken();
      const { data: joined, error } = await db.rpc("join_monopoly_room", {
        p_code: code,
        p_player_id: playerId,
        p_token_hash: await hashToken(token),
        p_name: name,
        p_piece: piece,
        p_profile_id: profileId,
      });
      if (error) throwDatabaseError(error);
      if (!joined?.room_id) {
        throw new RequestError(
          "Room tidak dapat dimuat setelah bergabung.",
          500,
        );
      }
      const roomId = joined.room_id;
      const snapshot = await roomSnapshot(roomId);
      await publishChange(roomId, snapshot.version);
      return { ...snapshot, playerId, token };
    }

    case "resume":
    case "snapshot": {
      const { player, room } = await requirePlayer(body);
      if (body.operation === "resume") {
        const { error } = await db
          .from("monopoly_room_players")
          .update({ connected: true })
          .eq("id", player.id);
        if (error) throwDatabaseError(error);
      }
      return roomSnapshot(room.id);
    }

    case "start": {
      const { player, room } = await requirePlayer(body);
      if (!player.connected) {
        throw new RequestError(
          "Sesi room sedang tidak aktif. Sambungkan kembali.",
          403,
        );
      }
      if (player.id !== room.host_player_id) {
        throw new RequestError("Hanya pembuat room yang dapat memulai.", 403);
      }
      if (room.started) throw new RequestError("Permainan sudah dimulai.");
      const players = await getPlayers(room.id);
      if (
        players.length < 2 ||
        players.some((candidate: RoomPlayer) => !candidate.connected)
      ) {
        throw new RequestError(
          "Semua pemain harus terhubung dan diperlukan minimal 2 pemain.",
        );
      }
      const gameState = reducer(INITIAL_GAME_STATE, {
        type: ACTIONS.START_GAME,
        playerSetups: players.map((candidate: RoomPlayer) => ({
          name: candidate.name,
          piece: candidate.piece,
          isAI: candidate.is_bot,
          difficulty: candidate.difficulty === "Mudah"
            ? "easy"
            : candidate.difficulty === "Sulit"
            ? "hard"
            : "medium",
        })),
        settings: {
          map: room.map_id,
          startMoney: room.start_money,
          turnSeconds: room.turn_seconds,
          speed: "normal",
        },
      });
      await commitState(room.id, room.version, gameState, true);
      await db.from("monopoly_matchmaking_queue").delete().eq("room_id", room.id);
      return roomSnapshot(room.id);
    }

    case "add_bot": {
      const { player, room } = await requirePlayer(body);
      if (player.id !== room.host_player_id) {
        throw new RequestError("Hanya host yang dapat menambahkan BOT.", 403);
      }
      if (room.started) throw new RequestError("Permainan sudah dimulai.");
      const seatIndex = Number(body.slot) - 1;
      const players = await getPlayers(room.id);
      if (
        !Number.isInteger(seatIndex) || seatIndex < 0 ||
        seatIndex >= room.max_players ||
        players.some((candidate) => candidate.seat_index === seatIndex)
      ) {
        throw new RequestError("Slot BOT tidak tersedia.");
      }

      const difficulty = body.difficulty === "Mudah" || body.difficulty === "Sulit"
        ? body.difficulty
        : "Sedang";
      const unusedPiece = [...PIECES].find((piece) =>
        !players.some((candidate) => candidate.piece === piece)
      );
      if (!unusedPiece) throw new RequestError("Tidak ada bidak BOT yang tersedia.");
      const botId = crypto.randomUUID();
      const { error } = await db.rpc("add_monopoly_room_bot", {
        p_room_id: room.id,
        p_host_id: player.id,
        p_bot_id: botId,
        p_token_hash: await hashToken(randomToken()),
        p_name: `BOT ${players.filter((candidate) => candidate.is_bot).length + 1}`,
        p_piece: unusedPiece,
        p_difficulty: difficulty,
        p_seat_index: seatIndex,
      });
      if (error) throwDatabaseError(error);
      await publishChange(room.id, room.version + 1);
      return roomSnapshot(room.id);
    }

    case "remove_player": {
      const { player, room } = await requirePlayer(body);
      if (player.id !== room.host_player_id) {
        throw new RequestError("Hanya host yang dapat mengeluarkan pemain.", 403);
      }
      if (room.started) throw new RequestError("Permainan sudah dimulai.");
      const seatIndex = Number(body.slot) - 1;
      const target = (await getPlayers(room.id)).find((candidate) =>
        candidate.seat_index === seatIndex
      );
      if (!target || target.id === room.host_player_id) {
        throw new RequestError("Pemain pada slot tersebut tidak dapat dikeluarkan.");
      }
      const { data: removed, error } = await db.rpc(
        "remove_monopoly_room_player",
        { p_room_id: room.id, p_player_id: target.id },
      );
      if (error) throwDatabaseError(error);
      if (!removed) throw new RequestError("Pemain tidak dapat dikeluarkan.");
      const snapshot = await roomSnapshot(room.id);
      await publishChange(room.id, snapshot.version);
      return snapshot;
    }

    case "action": {
      const { player, room } = await requirePlayer(body);
      if (!player.connected) {
        throw new RequestError(
          "Sesi room sedang tidak aktif. Sambungkan kembali.",
          403,
        );
      }
      const action = body.action as Record<string, unknown> | undefined;
      if (!action || typeof action !== "object") {
        throw new RequestError("Aksi tidak valid.");
      }
      validateAction(action, room, player);
      const gameState = reducer(room.game_state, action);
      if (JSON.stringify(gameState) === JSON.stringify(room.game_state)) {
        throw new RequestError(
          "Aksi tidak dapat dilakukan pada state saat ini.",
        );
      }
      await commitState(room.id, room.version, gameState);
      return roomSnapshot(room.id);
    }

    case "leave": {
      const { player, room } = await requirePlayer(body);
      if (!room.started && player.id === room.host_player_id) {
        const { data: deleted, error } = await db
          .from("monopoly_rooms")
          .delete()
          .eq("id", room.id)
          .eq("started", false)
          .select("id")
          .maybeSingle();
        if (error) throwDatabaseError(error);
        if (!deleted) {
          throw new RequestError(
            "Permainan sudah dimulai; room tidak dihapus.",
          );
        }
        await publishChange(room.id, room.version + 1);
        return { closed: true };
      }

      if (!room.started) {
        const { data: removed, error } = await db.rpc(
          "remove_monopoly_room_player",
          {
            p_room_id: room.id,
            p_player_id: player.id,
          },
        );
        if (error) throwDatabaseError(error);
        if (!removed) {
          throw new RequestError(
            "Pemain tidak bisa keluar dari room saat ini.",
          );
        }
        const snapshot = await roomSnapshot(room.id);
        await publishChange(room.id, snapshot.version);
        return snapshot;
      }

      const { data: disconnected, error } = await db.rpc(
        "disconnect_monopoly_room_player",
        {
          p_room_id: room.id,
          p_player_id: player.id,
        },
      );
      if (error) throwDatabaseError(error);
      if (!disconnected) {
        throw new RequestError("Pemain tidak dapat keluar dari permainan.");
      }
      const snapshot = await roomSnapshot(room.id);
      await publishChange(room.id, snapshot.version);
      return snapshot;
    }

    default:
      throw new RequestError("Operasi tidak dikenal.");
  }
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new RequestError("Request tidak valid.");
    }
    return json(await handleRequest(body));
  } catch (error) {
    if (error instanceof RequestError) {
      return json({ error: error.message }, error.status);
    }
    console.error("Unhandled multiplayer function error:", error);
    return json({ error: "Terjadi kesalahan server. Coba lagi." }, 500);
  }
});
