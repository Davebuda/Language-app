-- NorskCoach: Phase 2 content schema
-- Apply via: Supabase Dashboard → SQL Editor → paste and run

-- 1. scenarios (no FK deps — create first)
create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  setting text not null,
  character_role text not null,
  target_concept_ids text[] not null default '{}',
  target_vocab_cluster_ids text[] not null default '{}',
  cefr_level_min text not null check (cefr_level_min in ('A1','A2','B1','B2')),
  cefr_level_max text not null check (cefr_level_max in ('A1','A2','B1','B2')),
  opening_line text,
  created_at timestamptz default now()
);

-- 2. vocab_clusters
create table if not exists vocab_clusters (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  word_count int not null default 0,
  created_at timestamptz default now()
);

-- 3. sentences (audio_url stores Supabase Storage public URLs)
create table if not exists sentences (
  id uuid primary key,                    -- stable UUID from seed JSON
  norwegian text not null,
  english text not null,
  concept_ids text[] not null default '{}',
  vocab_clusters text[] not null default '{}',
  error_tags_detectable text[] not null default '{}',
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  difficulty smallint not null check (difficulty in (1,2,3)),
  scenario_id uuid references scenarios(id),
  audio_url text,
  exercise_types text[] not null default '{}',
  notes text,
  created_at timestamptz default now()
);

create index if not exists sentences_cefr_level_idx on sentences(cefr_level);
create index if not exists sentences_concept_ids_idx on sentences using gin(concept_ids);
create index if not exists sentences_vocab_clusters_idx on sentences using gin(vocab_clusters);
create index if not exists sentences_exercise_types_idx on sentences using gin(exercise_types);

-- 4. vocab_items
create table if not exists vocab_items (
  id uuid primary key default gen_random_uuid(),
  norwegian text not null,
  english text not null,
  word_class text not null check (word_class in ('noun','verb','adjective','adverb','preposition','conjunction','pronoun','numeral','other')),
  gender text check (gender in ('en','ei','et')),
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  cluster_id uuid references vocab_clusters(id),
  frequency int not null,
  audio_url text,
  example_sentence_id uuid references sentences(id),
  created_at timestamptz default now()
);

create index if not exists vocab_items_cefr_level_idx on vocab_items(cefr_level);
create index if not exists vocab_items_cluster_id_idx on vocab_items(cluster_id);

-- 5. waitlist (idempotent — may already exist from Phase 1)
create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

-- 6. fingerprint_sync (opt-in, Phase 3+)
create table if not exists fingerprint_sync (
  user_id uuid primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table sentences enable row level security;
alter table vocab_items enable row level security;
alter table vocab_clusters enable row level security;
alter table scenarios enable row level security;
alter table waitlist enable row level security;
alter table fingerprint_sync enable row level security;

-- Public read for content tables
drop policy if exists "Public read" on sentences;
create policy "Public read" on sentences for select using (true);

drop policy if exists "Public read" on vocab_items;
create policy "Public read" on vocab_items for select using (true);

drop policy if exists "Public read" on vocab_clusters;
create policy "Public read" on vocab_clusters for select using (true);

drop policy if exists "Public read" on scenarios;
create policy "Public read" on scenarios for select using (true);

-- Waitlist: anonymous insert only
drop policy if exists "Anyone can join" on waitlist;
create policy "Anyone can join" on waitlist for insert with check (true);

-- fingerprint_sync: user owns their row
drop policy if exists "User owns fingerprint" on fingerprint_sync;
create policy "User owns fingerprint" on fingerprint_sync
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
