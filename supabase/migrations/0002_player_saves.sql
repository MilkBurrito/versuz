-- v0 LAUNCH: cloud saves. The whole game document (user state, tiles,
-- campaigns, open matches) lives as one jsonb per player — sign in anywhere,
-- resume the same journey. Last-write-wins across devices (spec §15 sync).
--
-- This is the ONLY table the v0 live site needs. The full relational schema
-- (0001) + Edge Function scoring remain the hardening target: when that lands,
-- a migration script fans player_saves.doc out into the relational tables.

create table if not exists player_saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  doc jsonb not null,
  updated_at timestamptz not null default now()
);

alter table player_saves enable row level security;

create policy "players read own save" on player_saves
  for select using (auth.uid() = user_id);
create policy "players insert own save" on player_saves
  for insert with check (auth.uid() = user_id);
create policy "players update own save" on player_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "players delete own save" on player_saves
  for delete using (auth.uid() = user_id);
