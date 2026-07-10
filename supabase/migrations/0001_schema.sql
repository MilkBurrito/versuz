-- ============================================================================
-- VERSUZ v1 schema — spec v1.1 Appendix A + v1.2 amendments.
--   · tiles keyed by (user, verse_id, translation)          [v1.1 §7]
--   · mastery XP fields; level derived/cached from verse_xp [v1.1 §9]
--   · energy fields on users                                [v1.1 §9.5]
--   · boss gate flag all_verses_at_l3                       [v1.1 §8]
--   · coins visible (banked_currency)                       [v1.2 §10-A]
--   · four equip slots: weapon/body/necklace/feet           [v1.2 §10-B, revised]
-- Server-authoritative writes (energy spend, XP award, level recalc, boss gate)
-- go through Edge Functions using the service role; RLS keeps clients read-only
-- on scoring-critical columns.
-- ============================================================================

-- USERS (profile row keyed to auth.users)
create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  display_name text not null default 'Player',
  signup_date timestamptz not null default now(),
  last_active timestamptz,
  -- character (appearance)
  character_gender text not null default 'man',        -- 'man' | 'woman'
  character_skin_tone text not null default 'tone3',
  character_hair text not null default 'style1',
  -- equipment (v1.2 §10-B: four slots, cosmetic-only)
  equipped_weapon uuid,
  equipped_body uuid,
  equipped_necklace uuid,
  equipped_feet uuid,
  -- preferences
  default_translation text not null default 'KJV',     -- default for NEW tiles only
  daily_goal int not null default 1 check (daily_goal between 1 and 3),
  streak_visuals boolean not null default true,
  -- progression
  player_xp int not null default 0 check (player_xp >= 0),
  player_level int not null default 1,                 -- cached from player_xp
  banked_currency int not null default 0,              -- coins: VISIBLE in v1, not spendable
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_streak_date date,
  streak_freeze_available boolean not null default true,
  -- energy (§9.5) — lazily recomputed from last_updated on read/spend
  current_energy int not null default 5 check (current_energy between 0 and 5),
  energy_max int not null default 5,
  energy_last_updated timestamptz not null default now(),
  -- onboarding
  onboarding_completed boolean not null default false
);

-- VERSES (translation-agnostic; ranges allowed: 'ISA.43.18-19')
create table verses (
  id text primary key,                                 -- USFM 'JHN.3.16' / 'ISA.43.18-19'
  book text not null,
  chapter int not null,
  verse_start int not null,
  verse_end int                                        -- set for passages/ranges
);

-- VERSE TRANSLATIONS (imported from the verified datasets ONLY — see
-- supabase/README.md; verse text is never written by app code)
create table verse_translations (
  verse_id text not null references verses (id),
  translation text not null,                           -- 'KJV' | 'ASV' | 'WEB'
  text text not null,
  word_count int not null,                             -- drives mastery goal
  primary key (verse_id, translation)
);

-- USER VERSES = TILES, keyed by (verse + translation)
create table user_verses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  verse_id text not null references verses (id),
  translation text not null,
  verse_xp int not null default 0 check (verse_xp >= 0),  -- cumulative mastery XP
  level int not null default 1 check (level between 1 and 7), -- cached from verse_xp
  mastery_goal int not null,                           -- FLOOR + PER_WORD × words
  status text not null default 'active',               -- 'active'|'mastered'|'needs_refresh'
  tag text not null default 'default',
  added_from_campaign_id uuid,
  mastery_date timestamptz,
  last_practiced_date date,                            -- rested bonus + decay
  practice_today_count int not null default 0,         -- resets on day change; diminishing
  practice_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, verse_id, translation)
);

-- CAMPAIGNS
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  theme text not null,
  description text,
  verse_ids text[] not null,                           -- ordered; may include ranges
  boss_name text not null,
  cleared_reward_cosmetic_id uuid,
  mastered_reward_cosmetic_id uuid,
  required_player_level int not null default 1,
  display_order int not null default 0
);

-- USER CAMPAIGNS (boss gate at all-verses-L3)
create table user_campaigns (
  user_id uuid not null references users (id) on delete cascade,
  campaign_id uuid not null references campaigns (id),
  status text not null default 'not_started',          -- not_started|in_progress|cleared|mastered
  verses_added boolean not null default false,
  all_verses_at_l3 boolean not null default false,     -- boss-unlock condition (server-set)
  boss_defeated boolean not null default false,
  cleared_date timestamptz,
  mastered_date timestamptz,
  primary key (user_id, campaign_id)
);

-- MATCHES (history + XP breakdown; written only by the settle-match function)
create table matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  user_verse_id uuid references user_verses (id) on delete set null,
  verse_id text not null,
  translation text not null,
  campaign_id uuid,
  is_boss_match boolean not null default false,
  verse_level_at_start int,
  verse_level_at_end int,
  result text not null,                                -- 'win'|'loss'|'abandon'
  minigames_attempted int not null default 0,
  minigames_correct int not null default 0,
  finisher_correct boolean,
  energy_spent int not null default 1,
  xp_base int not null default 0,
  xp_perfect_bonus int not null default 0,
  xp_rested_bonus int not null default 0,
  xp_diminishing_modifier numeric not null default 1.0,
  xp_awarded int not null default 0,                   -- to verse mastery + player XP
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- COSMETICS (visual-only)
create table cosmetics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slot text not null check (slot in ('weapon', 'body', 'necklace', 'feet')),
  sprite_key text not null,
  unlock_source text not null,                         -- 'default'|'campaign_cleared'|'campaign_mastered'|'player_level'|'weekly_quest'
  unlock_player_level int
);

create table user_cosmetics (
  user_id uuid not null references users (id) on delete cascade,
  cosmetic_id uuid not null references cosmetics (id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

-- QUESTS
create table quests (
  id uuid primary key default gen_random_uuid(),
  cadence text not null check (cadence in ('daily', 'weekly')),
  slot int not null,
  criteria text not null,                              -- 'complete_matches'|'defeat_enemies'|'distinct_verses'|'flawless_win'|'level_up_verse'|'rested_verse'|'new_minigame'
  target int not null default 1,
  reward_xp int not null,
  reward_coins int not null default 0,
  reward_cosmetic_id uuid
);

create table user_quests (
  user_id uuid not null references users (id) on delete cascade,
  quest_id uuid not null references quests (id),
  assigned_date date not null,
  progress int not null default 0,
  completed boolean not null default false,
  primary key (user_id, quest_id, assigned_date)
);

-- BADGES
create table badges (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                                  -- 'verse_mastered'|'campaign_cleared'|'campaign_mastered'|'streak'|'founders'
  name text not null,
  icon_key text
);

create table user_badges (
  user_id uuid not null references users (id) on delete cascade,
  badge_id uuid not null references badges (id),
  verse_id text,                                       -- for verse-mastery badges
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id, earned_at)
);

-- ---------------------------------------------------------------------------
-- RLS: users read/write their own presentational data; scoring-critical writes
-- (energy, XP, levels, matches, boss gate) only via Edge Functions (service role).
-- ---------------------------------------------------------------------------
alter table users enable row level security;
alter table user_verses enable row level security;
alter table user_campaigns enable row level security;
alter table matches enable row level security;
alter table user_cosmetics enable row level security;
alter table user_quests enable row level security;
alter table user_badges enable row level security;

create policy "own profile read" on users for select using (auth.uid() = id);
create policy "own profile update (presentational)" on users for update
  using (auth.uid() = id) with check (auth.uid() = id);
-- NOTE: column-level protection for player_xp/current_energy/banked_currency is
-- enforced by a trigger (below), since Postgres RLS is row-level only.

create policy "own tiles read" on user_verses for select using (auth.uid() = user_id);
create policy "own tiles insert" on user_verses for insert with check (auth.uid() = user_id);
create policy "own tiles update (presentational)" on user_verses for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own tiles delete" on user_verses for delete using (auth.uid() = user_id);

create policy "own campaigns read" on user_campaigns for select using (auth.uid() = user_id);
create policy "own campaigns upsert" on user_campaigns for insert with check (auth.uid() = user_id);
create policy "own matches read" on matches for select using (auth.uid() = user_id);
create policy "own cosmetics read" on user_cosmetics for select using (auth.uid() = user_id);
create policy "own quests read" on user_quests for select using (auth.uid() = user_id);
create policy "own badges read" on user_badges for select using (auth.uid() = user_id);

-- Public content is world-readable
alter table verses enable row level security;
alter table verse_translations enable row level security;
alter table campaigns enable row level security;
alter table cosmetics enable row level security;
alter table quests enable row level security;
alter table badges enable row level security;
create policy "verses public read" on verses for select using (true);
create policy "verse_translations public read" on verse_translations for select using (true);
create policy "campaigns public read" on campaigns for select using (true);
create policy "cosmetics public read" on cosmetics for select using (true);
create policy "quests public read" on quests for select using (true);
create policy "badges public read" on badges for select using (true);

-- Guard scoring-critical columns against client-role updates.
create or replace function guard_scoring_columns() returns trigger as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    if tg_table_name = 'users' then
      new.player_xp := old.player_xp;
      new.player_level := old.player_level;
      new.banked_currency := old.banked_currency;
      new.current_energy := old.current_energy;
      new.energy_last_updated := old.energy_last_updated;
      new.current_streak := old.current_streak;
      new.longest_streak := old.longest_streak;
      new.last_streak_date := old.last_streak_date;
    elsif tg_table_name = 'user_verses' then
      new.verse_xp := old.verse_xp;
      new.level := old.level;
      new.mastery_goal := old.mastery_goal;
      new.practice_today_count := old.practice_today_count;
      new.practice_count := old.practice_count;
      new.last_practiced_date := old.last_practiced_date;
      new.mastery_date := old.mastery_date;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger users_guard_scoring before update on users
  for each row execute function guard_scoring_columns();
create trigger user_verses_guard_scoring before update on user_verses
  for each row execute function guard_scoring_columns();

create index user_verses_user_idx on user_verses (user_id);
create index matches_user_idx on matches (user_id, started_at desc);
create index verse_translations_tr_idx on verse_translations (translation);
