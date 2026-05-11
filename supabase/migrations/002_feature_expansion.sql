-- NorskCoach: Phase 3 feature expansion
-- Adds learning event spine, SRS vocab state, morphology normalization,
-- conversation mode, reading studio, writing journal, and shadowing tables.
-- Applied: 2026-05-11

-- 1. Unified learning event spine (all modes write here)
create table if not exists learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id uuid,
  mode text not null check (mode in ('session','conversation','reading','writing','shadowing','vocab','scenario','quickfire')),
  event_type text not null,
  concept_ids text[] not null default '{}',
  vocab_item_ids uuid[] not null default '{}',
  error_tags text[] not null default '{}',
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists learning_events_user_id_idx on learning_events(user_id);
create index if not exists learning_events_mode_idx on learning_events(mode);
create index if not exists learning_events_created_at_idx on learning_events(created_at);

-- 2. Shared SRS vocabulary state (FSRS-compatible)
create table if not exists user_vocab_srs (
  user_id uuid not null,
  vocab_item_id uuid not null references vocab_items(id) on delete cascade,
  next_due_at timestamptz not null default now(),
  stability float not null default 0,
  difficulty float not null default 5,
  interval_days float not null default 0,
  reps integer not null default 0,
  lapses integer not null default 0,
  last_reviewed_at timestamptz,
  source_modes text[] not null default '{}',
  created_at timestamptz not null default now(),
  primary key (user_id, vocab_item_id)
);
create index if not exists user_vocab_srs_next_due_idx on user_vocab_srs(user_id, next_due_at);

-- 3. Norwegian morphology normalization
create table if not exists vocab_forms (
  id uuid primary key default gen_random_uuid(),
  vocab_item_id uuid not null references vocab_items(id) on delete cascade,
  surface_form text not null,
  lemma text not null,
  morph jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (vocab_item_id, surface_form)
);
create index if not exists vocab_forms_surface_form_idx on vocab_forms(surface_form);
create index if not exists vocab_forms_lemma_idx on vocab_forms(lemma);

-- 4. Cross-mode vocab attribution
create table if not exists content_vocab_mentions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  vocab_item_id uuid not null references vocab_items(id) on delete cascade,
  start_char integer not null,
  end_char integer not null,
  surface_form text not null,
  created_at timestamptz not null default now()
);
create index if not exists content_vocab_mentions_content_idx on content_vocab_mentions(content_type, content_id);

-- 5. Conversation mode
create table if not exists conversation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  topic text not null,
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  mode text not null default 'free' check (mode in ('free','scenario')),
  scenario_id uuid references scenarios(id),
  turn_count integer not null default 0,
  error_count integer not null default 0,
  duration_seconds integer,
  summary text,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists conversation_turns (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references conversation_sessions(id) on delete cascade,
  turn_index integer not null,
  role text not null check (role in ('user','tutor')),
  content text not null,
  corrected_content text,
  error_tags text[] not null default '{}',
  concept_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists conversation_turns_session_idx on conversation_turns(session_id, turn_index);

-- 6. Reading Studio
create table if not exists reading_texts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  content_en text,
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  difficulty smallint not null default 2 check (difficulty in (1,2,3)),
  genre text not null default 'story' check (genre in ('story','news','recipe','dialogue','poem','folk_tale')),
  concept_ids text[] not null default '{}',
  word_count integer not null default 0,
  estimated_minutes smallint not null default 5,
  image_url text,
  created_at timestamptz not null default now()
);
create index if not exists reading_texts_cefr_level_idx on reading_texts(cefr_level);
create index if not exists reading_texts_concept_ids_idx on reading_texts using gin(concept_ids);

create table if not exists reading_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  text_id uuid not null references reading_texts(id) on delete cascade,
  completed boolean not null default false,
  comprehension_score smallint,
  duration_seconds integer,
  vocab_encounters uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists reading_attempts_user_id_idx on reading_attempts(user_id);

-- 7. Writing Journal
create table if not exists writing_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  prompt_text text,
  content text not null,
  content_corrected text,
  word_count integer not null default 0,
  cefr_level text,
  error_count integer not null default 0,
  error_tags text[] not null default '{}',
  concept_ids_targeted text[] not null default '{}',
  feedback jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists writing_submissions_user_id_idx on writing_submissions(user_id);
create index if not exists writing_submissions_created_at_idx on writing_submissions(created_at);

-- 8. Shadowing clips
create table if not exists shadowing_clips (
  id uuid primary key default gen_random_uuid(),
  norwegian text not null,
  phonetic_hint text,
  audio_url text not null,
  cefr_level text not null check (cefr_level in ('A1','A2','B1','B2')),
  concept_ids text[] not null default '{}',
  duration_ms integer not null default 0,
  accent text not null default 'oslo' check (accent in ('oslo','bergen','trondheim','tromso')),
  created_at timestamptz not null default now()
);
create index if not exists shadowing_clips_cefr_level_idx on shadowing_clips(cefr_level);

-- RLS policies (see migration for full policy list)
