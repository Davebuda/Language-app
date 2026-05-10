---
name: database-schema
description: The Supabase PostgreSQL schema for NorskCoach — tables, indexes, RLS policies, and common query patterns. Use when writing database queries, migrations, or any Supabase-related code.
---

# Database Schema — NorskCoach

## Architecture Decision

The fingerprint (learner progress) is stored **locally in IndexedDB first**. Supabase is used for:
1. Content delivery (sentences, concepts, scenarios, vocab)
2. Optional fingerprint sync (user opt-in only)
3. Waitlist emails (landing page)
4. Future: auth sessions, leaderboards, cross-device sync

## Tables (to be created in Phase 1B)

### `sentences`
```sql
create table sentences (
  id uuid primary key default gen_random_uuid(),
  norwegian text not null,
  english text not null,
  concept_ids text[] not null,       -- array of concept IDs
  vocab_clusters text[] not null,
  error_tags_detectable text[] not null,
  cefr_level text not null,          -- 'A1'|'A2'|'B1'|'B2'
  difficulty smallint not null,       -- 1|2|3
  scenario_id uuid references scenarios(id),
  audio_url text,                     -- Azure Blob Storage URL
  exercise_types text[] not null,
  created_at timestamptz default now()
);

create index on sentences(cefr_level);
create index on sentences using gin(concept_ids);
create index on sentences using gin(vocab_clusters);
```

### `vocab_items`
```sql
create table vocab_items (
  id uuid primary key default gen_random_uuid(),
  norwegian text not null,
  english text not null,
  word_class text not null,
  gender text,                        -- 'en'|'ei'|'et' for nouns
  cefr_level text not null,
  cluster_id uuid references vocab_clusters(id),
  frequency int not null,
  audio_url text,
  created_at timestamptz default now()
);
```

### `vocab_clusters`
```sql
create table vocab_clusters (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  description text,
  cefr_level text not null,
  word_count int default 0
);
```

### `scenarios`
```sql
create table scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  setting text not null,
  character_role text not null,
  target_concept_ids text[] not null,
  target_vocab_cluster_ids uuid[] not null,
  cefr_level_min text not null,
  cefr_level_max text not null,
  opening_line text
);
```

### `waitlist`
```sql
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);
```

### `fingerprint_sync` (Phase 2+ — opt-in only)
```sql
create table fingerprint_sync (
  user_id uuid primary key references auth.users(id),
  data jsonb not null,               -- serialized MistakeFingerprint
  updated_at timestamptz default now()
);
```

## RLS Policies

### sentences, vocab_items, vocab_clusters, scenarios — public read
```sql
alter table sentences enable row level security;
create policy "Public read" on sentences for select using (true);
-- No insert/update/delete for users — content is managed by admins
```

### waitlist — insert only
```sql
alter table waitlist enable row level security;
create policy "Anyone can join" on waitlist for insert with check (true);
create policy "No reads" on waitlist for select using (false);
```

### fingerprint_sync — user owns their row
```sql
alter table fingerprint_sync enable row level security;
create policy "User owns fingerprint" on fingerprint_sync
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## Common Query Patterns

### Fetch sentences for a concept at a level
```typescript
const { data } = await supabase
  .from('sentences')
  .select('*')
  .eq('cefr_level', 'A1')
  .contains('concept_ids', [conceptId])
  .limit(20);
```

### Fetch all A1 vocab for a cluster
```typescript
const { data } = await supabase
  .from('vocab_items')
  .select('*')
  .eq('cefr_level', 'A1')
  .eq('cluster_id', clusterId)
  .order('frequency');
```
