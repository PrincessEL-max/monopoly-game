create table public.monopoly_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z2-9]{6}$'),
  host_player_id uuid not null,
  max_players smallint not null check (max_players between 2 and 6),
  started boolean not null default false,
  game_state jsonb,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index monopoly_rooms_updated_at_idx on public.monopoly_rooms (updated_at);

create table public.monopoly_room_players (
  id uuid primary key,
  room_id uuid not null references public.monopoly_rooms (id) on delete cascade,
  token_hash text not null unique,
  seat_index smallint not null check (seat_index between 0 and 5),
  name text not null check (char_length(name) between 1 and 16),
  piece text not null check (piece in ('🚀', '🚗', '⚓', '🎩', '🐶', '💎')),
  connected boolean not null default true,
  created_at timestamptz not null default now(),
  unique (room_id, seat_index)
);

alter table public.monopoly_rooms enable row level security;
alter table public.monopoly_room_players enable row level security;

create function public.create_monopoly_room(
  p_room_id uuid,
  p_code text,
  p_player_id uuid,
  p_token_hash text,
  p_name text,
  p_piece text,
  p_max_players smallint
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.monopoly_rooms (id, code, host_player_id, max_players)
  values (p_room_id, p_code, p_player_id, p_max_players);

  insert into public.monopoly_room_players (id, room_id, token_hash, seat_index, name, piece)
  values (p_player_id, p_room_id, p_token_hash, 0, p_name, p_piece);

  return p_room_id;
end;
$$;

create function public.join_monopoly_room(
  p_code text,
  p_player_id uuid,
  p_token_hash text,
  p_name text,
  p_piece text
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

  insert into public.monopoly_room_players (id, room_id, token_hash, seat_index, name, piece)
  values (p_player_id, target_room.id, p_token_hash, available_seat, p_name, p_piece);

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

create function public.commit_monopoly_game_state(
  p_room_id uuid,
  p_expected_version bigint,
  p_game_state jsonb,
  p_started boolean default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_rows integer;
begin
  update public.monopoly_rooms
  set game_state = p_game_state,
      started = coalesce(p_started, started),
      version = version + 1,
      updated_at = now()
  where id = p_room_id
    and version = p_expected_version;

  get diagnostics changed_rows = row_count;
  return changed_rows = 1;
end;
$$;

create function public.remove_monopoly_room_player(
  p_room_id uuid,
  p_player_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_room public.monopoly_rooms%rowtype;
  removed_seat smallint;
  remaining_player record;
begin
  select * into target_room
  from public.monopoly_rooms
  where id = p_room_id
  for update;

  if not found or target_room.started or target_room.host_player_id = p_player_id then
    return false;
  end if;

  select seat_index into removed_seat
  from public.monopoly_room_players
  where room_id = p_room_id and id = p_player_id;

  if not found then
    return false;
  end if;

  delete from public.monopoly_room_players
  where room_id = p_room_id and id = p_player_id;

  for remaining_player in
    select id, seat_index
    from public.monopoly_room_players
    where room_id = p_room_id and seat_index > removed_seat
    order by seat_index
  loop
    update public.monopoly_room_players
    set seat_index = remaining_player.seat_index - 1
    where id = remaining_player.id;
  end loop;

  update public.monopoly_rooms
  set updated_at = now(), version = version + 1
  where id = p_room_id;
  return true;
end;
$$;

create function public.disconnect_monopoly_room_player(
  p_room_id uuid,
  p_player_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_room public.monopoly_rooms%rowtype;
  changed_rows integer;
begin
  select * into target_room
  from public.monopoly_rooms
  where id = p_room_id
  for update;

  if not found or not target_room.started then
    return false;
  end if;

  update public.monopoly_room_players
  set connected = false
  where room_id = p_room_id and id = p_player_id;

  get diagnostics changed_rows = row_count;
  if changed_rows != 1 then
    return false;
  end if;

  update public.monopoly_rooms
  set updated_at = now(), version = version + 1
  where id = p_room_id;
  return true;
end;
$$;

revoke all on public.monopoly_rooms from public, anon, authenticated;
revoke all on public.monopoly_room_players from public, anon, authenticated;
revoke all on function public.create_monopoly_room(uuid, text, uuid, text, text, text, smallint) from public, anon, authenticated;
revoke all on function public.join_monopoly_room(text, uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.commit_monopoly_game_state(uuid, bigint, jsonb, boolean) from public, anon, authenticated;
revoke all on function public.remove_monopoly_room_player(uuid, uuid) from public, anon, authenticated;
revoke all on function public.disconnect_monopoly_room_player(uuid, uuid) from public, anon, authenticated;
grant all on public.monopoly_rooms to service_role;
grant all on public.monopoly_room_players to service_role;
grant execute on function public.create_monopoly_room(uuid, text, uuid, text, text, text, smallint) to service_role;
grant execute on function public.join_monopoly_room(text, uuid, text, text, text) to service_role;
grant execute on function public.commit_monopoly_game_state(uuid, bigint, jsonb, boolean) to service_role;
grant execute on function public.remove_monopoly_room_player(uuid, uuid) to service_role;
grant execute on function public.disconnect_monopoly_room_player(uuid, uuid) to service_role;
