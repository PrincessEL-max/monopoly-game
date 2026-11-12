create table public.monopoly_profiles (
  id uuid primary key,
  public_id text not null unique check (public_id ~ '^[A-Z2-9]{6}$'),
  token_hash text not null unique,
  display_name text not null check (char_length(display_name) between 1 and 16),
  online_until timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.monopoly_rooms
  add column room_type text not null default 'Publik'
    check (room_type in ('Publik', 'Privat')),
  add column map_id text not null default 'nusantara'
    check (map_id in ('nusantara', 'dunia', 'kota')),
  add column start_money integer not null default 250000
    check (start_money in (200000, 250000, 300000)),
  add column turn_seconds smallint not null default 30
    check (turn_seconds in (15, 30, 45)),
  add column mode text not null default 'room'
    check (mode in ('room', 'quick'));

alter table public.monopoly_room_players
  add column profile_id uuid references public.monopoly_profiles (id) on delete set null,
  add column is_bot boolean not null default false,
  add column difficulty text not null default 'Sedang'
    check (difficulty in ('Mudah', 'Sedang', 'Sulit'));

create table public.monopoly_friends (
  profile_id uuid not null references public.monopoly_profiles (id) on delete cascade,
  friend_id uuid not null references public.monopoly_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, friend_id),
  check (profile_id <> friend_id)
);

create table public.monopoly_friend_invites (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.monopoly_profiles (id) on delete cascade,
  target_id uuid not null references public.monopoly_profiles (id) on delete cascade,
  room_code text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);

create index monopoly_friend_invites_target_idx
  on public.monopoly_friend_invites (target_id, created_at desc);

create table public.monopoly_matchmaking_queue (
  profile_id uuid primary key references public.monopoly_profiles (id) on delete cascade,
  player_id uuid not null unique,
  token_hash text not null unique,
  name text not null check (char_length(name) between 1 and 16),
  piece text not null check (piece in ('🚀', '🚗', '⚓', '🎩', '🐶', '💎')),
  created_at timestamptz not null default now(),
  room_id uuid references public.monopoly_rooms (id) on delete set null
);

create index monopoly_matchmaking_queue_waiting_idx
  on public.monopoly_matchmaking_queue (created_at)
  where room_id is null;

alter table public.monopoly_profiles enable row level security;
alter table public.monopoly_friends enable row level security;
alter table public.monopoly_friend_invites enable row level security;
alter table public.monopoly_matchmaking_queue enable row level security;

revoke all on public.monopoly_profiles from public, anon, authenticated;
revoke all on public.monopoly_friends from public, anon, authenticated;
revoke all on public.monopoly_friend_invites from public, anon, authenticated;
revoke all on public.monopoly_matchmaking_queue from public, anon, authenticated;
grant all on public.monopoly_profiles to service_role;
grant all on public.monopoly_friends to service_role;
grant all on public.monopoly_friend_invites to service_role;
grant all on public.monopoly_matchmaking_queue to service_role;

drop function public.create_monopoly_room(uuid, text, uuid, text, text, text, smallint);
create function public.create_monopoly_room(
  p_room_id uuid,
  p_code text,
  p_player_id uuid,
  p_token_hash text,
  p_name text,
  p_piece text,
  p_max_players smallint,
  p_profile_id uuid,
  p_room_type text,
  p_map_id text,
  p_start_money integer,
  p_turn_seconds smallint
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.monopoly_rooms (
    id, code, host_player_id, max_players, room_type, map_id, start_money, turn_seconds
  )
  values (
    p_room_id, p_code, p_player_id, p_max_players, p_room_type, p_map_id, p_start_money, p_turn_seconds
  );

  insert into public.monopoly_room_players (
    id, room_id, token_hash, seat_index, name, piece, profile_id
  )
  values (p_player_id, p_room_id, p_token_hash, 0, p_name, p_piece, p_profile_id);

  return p_room_id;
end;
$$;

drop function public.join_monopoly_room(text, uuid, text, text, text);
create function public.join_monopoly_room(
  p_code text,
  p_player_id uuid,
  p_token_hash text,
  p_name text,
  p_piece text,
  p_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_room public.monopoly_rooms%rowtype;
  available_seat integer;
begin
  select * into target_room
  from public.monopoly_rooms
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'Room tidak ditemukan.';
  end if;
  if target_room.started then
    raise exception 'Permainan di room ini sudah dimulai.';
  end if;

  select min(slots.seat_index) into available_seat
  from generate_series(0, target_room.max_players - 1) as slots(seat_index)
  where not exists (
    select 1
    from public.monopoly_room_players player
    where player.room_id = target_room.id
      and player.seat_index = slots.seat_index
  );

  if available_seat is null then
    raise exception 'Room sudah penuh.';
  end if;

  insert into public.monopoly_room_players (
    id, room_id, token_hash, seat_index, name, piece, profile_id
  )
  values (
    p_player_id, target_room.id, p_token_hash, available_seat, p_name, p_piece, p_profile_id
  );

  update public.monopoly_rooms
  set updated_at = now(), version = version + 1
  where id = target_room.id;

  return jsonb_build_object(
    'room_id', target_room.id,
    'host_player_id', target_room.host_player_id,
    'max_players', target_room.max_players,
    'started', target_room.started,
    'version', target_room.version,
    'game_state', target_room.game_state
  );
end;
$$;

create function public.match_monopoly_queue(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  candidates uuid[];
  generated_code text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  queue_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('monopoly-matchmaking'));

  select array_agg(waiting.player_id order by waiting.created_at)
  into candidates
  from (
    select player_id, created_at
    from public.monopoly_matchmaking_queue
    where room_id is null
      and created_at > now() - interval '2 minutes'
    order by created_at
    limit 4
    for update skip locked
  ) as waiting;

  queue_count := coalesce(cardinality(candidates), 0);
  if queue_count < 4 then
    return null;
  end if;

  loop
    select string_agg(
      substr(alphabet, floor(random() * length(alphabet))::integer + 1, 1),
      ''
    )
    into generated_code
    from generate_series(1, 6);

    exit when not exists (
      select 1 from public.monopoly_rooms where code = generated_code
    );
  end loop;

  insert into public.monopoly_rooms (
    id, code, host_player_id, max_players, room_type, map_id, start_money, turn_seconds, mode
  )
  select
    p_room_id,
    generated_code,
    candidates[1],
    4,
    'Publik',
    'nusantara',
    200000,
    30,
    'quick';

  insert into public.monopoly_room_players (
    id, room_id, token_hash, seat_index, name, piece, profile_id
  )
  select
    queue.player_id,
    p_room_id,
    queue.token_hash,
    row_number() over (order by queue.created_at) - 1,
    queue.name,
    queue.piece,
    queue.profile_id
  from public.monopoly_matchmaking_queue queue
  where queue.player_id = any(candidates)
  order by queue.created_at;

  update public.monopoly_matchmaking_queue
  set room_id = p_room_id
  where player_id = any(candidates);

  return p_room_id;
end;
$$;

create function public.cancel_monopoly_matchmaking(
  p_profile_id uuid,
  p_player_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  matched_room_id uuid;
  room_started boolean;
begin
  select room_id into matched_room_id
  from public.monopoly_matchmaking_queue
  where profile_id = p_profile_id and player_id = p_player_id
  for update;

  if not found then
    return false;
  end if;

  if matched_room_id is not null then
    select started into room_started
    from public.monopoly_rooms
    where id = matched_room_id
    for update;

    if coalesce(room_started, false) then
      raise exception 'Permainan sudah dimulai.';
    end if;

    delete from public.monopoly_rooms where id = matched_room_id;
  end if;

  delete from public.monopoly_matchmaking_queue
  where profile_id = p_profile_id and player_id = p_player_id;
  return true;
end;
$$;

create function public.add_monopoly_room_bot(
  p_room_id uuid,
  p_host_id uuid,
  p_bot_id uuid,
  p_token_hash text,
  p_name text,
  p_piece text,
  p_difficulty text,
  p_seat_index smallint
)
returns smallint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_room public.monopoly_rooms%rowtype;
begin
  select * into target_room
  from public.monopoly_rooms
  where id = p_room_id
  for update;

  if not found or target_room.started or target_room.host_player_id <> p_host_id then
    raise exception 'Hanya host yang dapat menambahkan bot sebelum permainan dimulai.';
  end if;
  if p_seat_index < 0 or p_seat_index >= target_room.max_players then
    raise exception 'Slot pemain tidak tersedia.';
  end if;
  if exists (
    select 1 from public.monopoly_room_players
    where room_id = p_room_id and seat_index = p_seat_index
  ) then
    raise exception 'Slot pemain sudah terisi.';
  end if;

  insert into public.monopoly_room_players (
    id, room_id, token_hash, seat_index, name, piece, is_bot, difficulty
  )
  values (
    p_bot_id, p_room_id, p_token_hash, p_seat_index, p_name, p_piece, true, p_difficulty
  );
  update public.monopoly_rooms
  set version = version + 1, updated_at = now()
  where id = p_room_id;

  return p_seat_index;
end;
$$;

revoke all on function public.create_monopoly_room(uuid, text, uuid, text, text, text, smallint, uuid, text, text, integer, smallint) from public, anon, authenticated;
revoke all on function public.join_monopoly_room(text, uuid, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.match_monopoly_queue(uuid) from public, anon, authenticated;
revoke all on function public.cancel_monopoly_matchmaking(uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_monopoly_room_bot(uuid, uuid, uuid, text, text, text, text, smallint) from public, anon, authenticated;
grant execute on function public.create_monopoly_room(uuid, text, uuid, text, text, text, smallint, uuid, text, text, integer, smallint) to service_role;
grant execute on function public.join_monopoly_room(text, uuid, text, text, text, uuid) to service_role;
grant execute on function public.match_monopoly_queue(uuid) to service_role;
grant execute on function public.cancel_monopoly_matchmaking(uuid, uuid) to service_role;
grant execute on function public.add_monopoly_room_bot(uuid, uuid, uuid, text, text, text, text, smallint) to service_role;
