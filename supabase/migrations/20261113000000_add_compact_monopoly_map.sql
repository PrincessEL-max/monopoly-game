alter table public.monopoly_rooms
  drop constraint if exists monopoly_rooms_map_id_check;

alter table public.monopoly_rooms
  add constraint monopoly_rooms_map_id_check
  check (map_id in ('nusantara', 'dunia', 'kota', 'nusantara-compact'));
