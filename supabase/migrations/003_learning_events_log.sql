-- NorskCoach: A4 — Anonymized event logging
-- Adds learning_events_log table for aggregate, anonymized per-concept accuracy data.
-- Rows are keyed by a one-way hash of user_id (first 16 chars of SHA-256 hex).
-- Nothing reads this table in v1 — write-only from the app side.
-- Applied: 2026-05-21

create table if not exists learning_events_log (
  id                  uuid        default gen_random_uuid() primary key,
  event_type          text        not null,
  concept_id          text        not null,
  correct_bool        boolean     not null,
  timestamp           timestamptz not null default now(),
  anonymous_session_id text       not null
);

-- Index for future longitudinal queries by learner bucket
create index if not exists learning_events_log_anon_id_idx
  on learning_events_log (anonymous_session_id);

-- Index for future per-concept aggregate analytics
create index if not exists learning_events_log_concept_id_idx
  on learning_events_log (concept_id);

-- RLS: on, but only an INSERT policy for authenticated users.
-- No SELECT policy — write-only in v1.
alter table learning_events_log enable row level security;

create policy "authenticated users can insert learning events log"
  on learning_events_log
  for insert
  to authenticated
  with check (true);
