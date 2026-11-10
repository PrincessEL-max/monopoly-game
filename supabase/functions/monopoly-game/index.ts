import { createClient } from "supabase";
import {
  ACTIONS,
  INITIAL_GAME_STATE,
  reducer,
} from "../../../src/logic/gameReducer.js";

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

type GamePlayer = { id: number; bankrupt?: boolean };
type GameState = {
  players: GamePlayer[];
  currentPlayerIndex: number;
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
};
type RoomPlayer = {
  id: string;
  room_id: string;
  seat_index: number;
  name: string;
  piece: string;
  connected: boolean;
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
    .select("id, seat_index, name, piece, connected")
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
  return {
    room: {
      id: room.id,
      code: room.code,
      maxPlayers: room.max_players,
      started: room.started,
      hostPlayerId: room.host_player_id,
      players: players.map((player) => ({
        playerId: player.id,
        seatIndex: player.seat_index,
        name: player.name,
        piece: player.piece,
        connected: player.connected,
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
    .select("id, room_id, seat_index, connected")
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
  if (
    !state.players?.[player.seat_index] ||
    state.players[player.seat_index].bankrupt
  ) {
    throw new RequestError("Pemain tidak aktif.");
  }

  const gamePlayer = state.players[player.seat_index];
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
    case "create": {
      const name = typeof body.name === "string"
        ? body.name.trim().slice(0, 16)
        : "";
      const piece = body.piece;
      const maxPlayers = Number(body.maxPlayers);
      if (
        !name || !PIECES.has(piece as string) ||
        !Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 6
      ) {
        throw new RequestError("Nama, bidak, atau jumlah pemain tidak valid.");
      }

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
      const playerId = crypto.randomUUID();
      const token = randomToken();
      const { data: joined, error } = await db.rpc("join_monopoly_room", {
        p_code: code,
        p_player_id: playerId,
        p_token_hash: await hashToken(token),
        p_name: name,
        p_piece: piece,
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
          isAI: false,
        })),
      });
      await commitState(room.id, room.version, gameState, true);
      return roomSnapshot(room.id);
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
