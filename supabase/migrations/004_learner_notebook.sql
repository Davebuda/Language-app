-- 004_learner_notebook.sql — phase 3F: cross-device notebook sync.
--
-- Row-per-item (NOT a per-user JSONB blob like fingerprint_sync): the learner
-- notebook is unbounded, so each saved item is its own row keyed by the client
-- NotebookItem.id (a crypto.randomUUID, globally unique). The full item shape
-- lives in `data` (the NotebookItem JSON); `user_id` drives RLS + per-user loads.

create table if not exists learner_notebook (
  id text primary key,
  user_id uuid not null,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists learner_notebook_user_id_idx on learner_notebook (user_id);

-- ── RLS: user owns their rows (mirrors fingerprint_sync) ─────────────────────
alter table learner_notebook enable row level security;

drop policy if exists "User owns notebook" on learner_notebook;
create policy "User owns notebook" on learner_notebook
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
