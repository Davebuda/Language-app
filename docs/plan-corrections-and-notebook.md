# Plan: Interactive Corrections + Universal Learner Notebook (slices 2–3)

> Produced via make-plan-pro (Phase 0 discovery gated PASS). Direction: `docs/direction-interactive-corrections-and-notebook.md`. Slice 1 (2nd-person feedback) already shipped (`ad267fb`). This plans slice 2 (clickable popup) + slice 3 (notebook). **Plan only — nothing here is built. Analysis-first per Operating Rule 2; awaiting approval.**

## Context
- **Intent:** corrected words become clickable → popup (verified-corpus gloss/rule vs clearly-marked AI suggestion, honest empty state) with a one-tap Save into a universal notebook; saved items feed the daily økt **only with purpose** (Hybrid gate) on their **own** SRS ladder.
- **Stack (installed):** next ^15.3.2 · react ^19.1.0 · @supabase/supabase-js ^2.49.4 + @supabase/ssr ^0.6.1 · idb ^8.0.2 · zustand ^5.0.4 · framer-motion ^11.18.2 · tailwind 3.4 · shadcn (slate, cssVariables).
- **Existing patterns leveraged:** fingerprint IndexedDB(`idb`)→Supabase fire-and-forget sync (`src/storage/indexeddb.ts`, `src/hooks/useFingerprint.ts`); `normalizeFingerprint` `...raw`-spread backfill (`src/types/fingerprint.ts`); pure Zustand stores (`src/stores/*`); scheduler 4-pool assembly + `makeItem` (`src/engine/scheduler.ts`); SRS ladder `SRS_LADDER_DAYS` (`src/engine/fingerprint.ts:19`); `/reading` word-tap skeleton (`src/app/reading/page.tsx:107-110, 282-306`); `recordExposure` (`useFingerprint:454-485`).
- **New patterns introduced:** Radix **Popover** primitive (only alert-dialog exists today) — validated against shadcn popover pattern; a second IndexedDB object store (DB version bump v1→v2); a second Supabase per-user table mirroring `fingerprint_sync` RLS.

## Phase 0 Discovery Summary
```
Installed versions (package.json):
  - next ^15.3.2 · react ^19.1.0 · @supabase/supabase-js ^2.49.4 · @supabase/ssr ^0.6.1
  - idb ^8.0.2 · zustand ^5.0.4 · framer-motion ^11.18.2 · @radix-ui/react-alert-dialog ^1.1.15
  - NO popover/sheet/dialog primitive installed (ONLY alert-dialog) → new dep needed
Vendor docs cached (Context7, version-pinned):
  - idb → DBSchema typed, openDB+upgrade+createObjectStore/createIndex, get/put/getAll/delete, versioned upgrade
  - supabase → ALTER TABLE … ENABLE ROW LEVEL SECURITY; CREATE POLICY … TO authenticated USING/WITH CHECK ((select auth.uid()) = user_id)
Existing patterns found:
  - IndexedDB: src/storage/indexeddb.ts (DB 'norsk-coach' v1, store 'fingerprints' keyPath userId; getDB/save/load/delete)
  - Supabase sync: useFingerprint.ts saveFingerprintToSupabase → fingerprint_sync (upsert onConflict user_id), createBrowserClient @/lib/supabase/client
  - Backfill: types/fingerprint.ts normalizeFingerprint via {...createEmptyFingerprint, ...raw}; test tests/types/normalize-fingerprint.test.ts
  - Scheduler: engine/scheduler.ts pools (remediation 281-340, review 342-359, new-material 361-372, interleaving 374-381), makeItem 90-108; SelectionReason types/session.ts:58-67
  - SRS: engine/fingerprint.ts SRS_LADDER_DAYS=[1,3,7,14,30]:19, updateConceptMastery init 94-108 + advance 131-147 (wrong → reset 0)
  - Correction render: conversation/page.tsx:581-594 (msg.correction.corrected); journal/WritingEditor.tsx:396-410 (err.correct/briefWhy); session/ExplanationCard.tsx:52-77 (correctAnswer + "Fanget · errorLabel")
  - Reading word-tap: reading/page.tsx:107-110 (æøå regex), 254-269 (split render), 282-306 (PLACEHOLDER popup "Ordoppslag kommer snart")
New patterns (no existing usage) — validation source:
  - Radix Popover wrapper → shadcn popover pattern (Context7 shadcn if needed)
  - 2nd IndexedDB store via version bump → idb upgrade docs (cached)
  - learner_notebook RLS table → supabase RLS docs (cached) + clone fingerprint_sync
Discovery status: PASS
```

## Architectural decisions (locked into this plan)
1. **Notebook is its own store, NOT a field on the fingerprint.** The notebook is unbounded ("doesn't matter how long it gets"); cramming it into the fingerprint blob bloats every fingerprint read/write/sync. → own IndexedDB object store, own Zustand store + `useNotebook` hook, own Supabase table (row-per-item).
2. **Notebook items carry their OWN SRS fields** (`srsLevel`/`nextReviewAt` on the item), advanced by a shared SRS primitive — they do **not** write into `conceptMastery`, so the diagnosis fingerprint stays pristine (no synthetic `nb_*` concepts polluting weak/review pools). T1.6 upheld.
3. **Popup content is verified-first, AI-marked, honest-empty.** Corpus gloss/rule (sentence.english, vocab gloss, concept/taxonomy, error-tag-labels) is primary; AI explanation is shown only labelled as a suggestion; an unknown word shows "Ingen oppslag ennå" — never a fabricated translation (AI-01 + "every AI path has a non-AI fallback").
4. **Notebook home = revived `/vocab`** (currently a retired stub), entry via the dashboard "Mer øving og status" disclosure — no 6th BottomNav tab (real-estate discipline, Rule 1).
5. **Supabase sync is a separable final phase (3F).** Phases 3A–3E ship guest-capable IndexedDB-first; nothing blocks on the cloud table.

---

## Tasks

### Slice 2 — Clickable correction popup

### Task 2.1 — add Popover primitive
**Diff:** Add `@radix-ui/react-popover` and create `src/components/ui/popover.tsx` (shadcn wrapper).
**Files:** `package.json`, `package-lock.json`, `src/components/ui/popover.tsx`
**Depends on:** none
**Verification:** `npm i` clean; `tsc --noEmit` exit 0; Popover imports/renders in a throwaway QA route.

### Task 2.2 — build shared WordPopup component
**Diff:** Create `src/components/shared/WordPopup.tsx` — Popover on desktop / fixed bottom-card on mobile (framer-motion), with slots for verified gloss/rule, marked AI-suggestion, honest empty state, and an optional Save button.
**Files:** `src/components/shared/WordPopup.tsx`
**Depends on:** 2.1
**Verification:** throwaway QA route renders all three content states at 375px + 1280px; Playwright screenshots; tsc clean.

### Task 2.3 — verified-vs-AI content resolver
**Diff:** Create `src/lib/word-explanation.ts` returning `{ verified?: {english?, rule?}, aiSuggested?: string, source }` by looking up corpus (sentence.english, vocab gloss, concept/taxonomy, error-tag-labels) before any AI, and returning empty (no fabrication) for unknown words.
**Files:** `src/lib/word-explanation.ts`
**Depends on:** none
**Verification:** unit test — corpus word → verified; unknown word → empty; AI string → `aiSuggested` (marked).

### Task 2.4 — replace /reading placeholder with WordPopup
**Diff:** Swap the `reading/page.tsx` "Ordoppslag kommer snart" card (282-306) for `<WordPopup>` fed by `word-explanation.ts`.
**Files:** `src/app/reading/page.tsx`
**Depends on:** 2.2, 2.3
**Verification:** clicking a reading word shows verified gloss when available, honest empty otherwise; QA screenshot.

### Task 2.5 — clickable conversation correction
**Diff:** Wrap `msg.correction.corrected` (`conversation/page.tsx:590`) in a WordPopup trigger; AI `explanation` shown labelled as suggestion.
**Files:** `src/app/conversation/page.tsx`
**Depends on:** 2.2, 2.3
**Verification:** click opens popup in-conversation; AI line is visibly marked "forslag".

### Task 2.6 — clickable journal correction
**Diff:** Wrap `err.correct` (`WritingEditor.tsx:407`) in a WordPopup trigger.
**Files:** `src/components/journal/WritingEditor.tsx`
**Depends on:** 2.2, 2.3
**Verification:** click opens popup in journal feedback; QA.

### Task 2.7 — clickable repair-card answer
**Diff:** Wrap `correctAnswer`/`errorLabel` (`ExplanationCard.tsx:52-77`) in a WordPopup trigger.
**Files:** `src/components/session/ExplanationCard.tsx`
**Depends on:** 2.2, 2.3
**Verification:** click opens popup in-session; QA.

### Slice 3 — Universal notebook (3A–3E guest-capable; 3F Supabase)

### Task 3.1 — NotebookItem type + normalize
**Diff:** Create `src/types/notebook.ts` with `NotebookItem` (type, norwegian, english?, explanation?, grammarNote?, source, sourceSentence?, tags[], learnerNote?, reviewStatus, verified, conceptId?, promoted, srsLevel, nextReviewAt, createdAt) + `createEmptyNotebookItem` + `normalizeNotebookItem`.
**Files:** `src/types/notebook.ts`
**Depends on:** none
**Verification:** unit test — `normalizeNotebookItem` backfills missing fields via `{...createEmptyNotebookItem, ...raw}`.

### Task 3.2 — notebook IndexedDB store (DB v1→v2)
**Diff:** In `src/storage/indexeddb.ts` bump `DB_VERSION` to 2, add a `notebook-items` store (keyPath `id`, index `userId`) in `upgrade`, and export `saveNotebookItem/loadNotebookItems(userId)/deleteNotebookItem`.
**Files:** `src/storage/indexeddb.ts`
**Depends on:** 3.1
**Verification:** integration test — put → `getAllFromIndex('userId')` returns item; **v1→v2 upgrade preserves existing fingerprints** (explicit assertion).

### Task 3.3 — notebook Zustand store
**Diff:** Create `src/stores/notebook-store.ts` as a pure store (items, status, set/add/update/remove).
**Files:** `src/stores/notebook-store.ts`
**Depends on:** 3.1
**Verification:** tsc; trivial store reducer test.

### Task 3.4 — useNotebook hook (IndexedDB-first, guest-capable)
**Diff:** Create `src/hooks/useNotebook.ts` mirroring `useFingerprint` bootstrap — load items by userId (anon UUID or auth), expose `saveItem/updateItem/removeItem` persisting to IndexedDB always.
**Files:** `src/hooks/useNotebook.ts`
**Depends on:** 3.2, 3.3
**Verification:** items persist across reload (guest anon id + auth id); test mirrors returning-user safety.

### Task 3.5 — wire Save into WordPopup
**Diff:** Implement WordPopup `onSave` → `useNotebook.saveItem` with word/phrase + resolved verified/AI content + source context, plus an inline "Lagret i notatboka" confirmation.
**Files:** `src/components/shared/WordPopup.tsx`
**Depends on:** 2.2, 3.4
**Verification:** Rule-8 trace — clicking Save lands an item in IndexedDB and the store; confirmation shows.

### Task 3.6 — notebook surface (revive /vocab)
**Diff:** Replace `/vocab`'s "Kommer i versjon 2" banner with `NotebookScreen` listing saved items with search + filter (type/tag/reviewStatus).
**Files:** `src/app/vocab/page.tsx`, `src/components/notebook/NotebookScreen.tsx`
**Depends on:** 3.4
**Verification:** saved items render + filter works; QA at 375/1280.

### Task 3.7 — quick-access entry point + drawer
**Diff:** Add a notebook entry point in the dashboard "Mer øving og status" disclosure opening a `NotebookDrawer` of recent saves.
**Files:** `src/components/dashboard/ProductionWall.tsx` (disclosure), `src/components/notebook/NotebookDrawer.tsx`
**Depends on:** 3.6
**Verification:** entry point visible; drawer opens recent saves; QA.

### Task 3.8 — notebook_practice selection reason
**Diff:** Add `'notebook_practice'` to `SelectionReason` (`types/session.ts:58-67`) and a justification case ("Fra notatboka di") in `selection-justification.ts`.
**Files:** `src/types/session.ts`, `src/lib/selection-justification.ts`
**Depends on:** none
**Verification:** tsc; unit test the justification string.

### Task 3.9 — "practice this" intent toggle
**Diff:** Add an "Øv på dette" toggle (in WordPopup save + `NotebookScreen`) that sets `promoted=true` on the item.
**Files:** `src/components/notebook/NotebookScreen.tsx`
**Depends on:** 3.5, 3.6
**Verification:** toggling sets+persists `promoted`; reflected in store.

### Task 3.10 — Hybrid promotion eligibility
**Diff:** Create `src/lib/notebook-promotion.ts` returning items eligible for the økt = `promoted===true` OR (`conceptId` ∈ fingerprint weak/decaying set), filtered to SRS-due.
**Files:** `src/lib/notebook-promotion.ts`
**Depends on:** 3.1
**Verification:** unit test the Hybrid gate (explicit-intent path + diagnostic-relevance path + not-due exclusion) with fixtures.

### Task 3.11 — shared SRS primitive for notebook items
**Diff:** Extract `SRS_LADDER_DAYS` + `srsNextReviewAt` into `src/lib/srs.ts` and add `advanceNotebookSrs(item, correct)`; re-import in `fingerprint.ts`.
**Files:** `src/lib/srs.ts`, `src/engine/fingerprint.ts`
**Depends on:** none
**Verification:** unit test advance (1→3→7→14→30) + reset-on-wrong; existing fingerprint tests stay green.

### Task 3.12 — inject promoted items into scheduler
**Diff:** Add an optional `notebookItems` param to the session generator in `scheduler.ts` and inject up-to-N due/promoted items as `notebook_practice` `SessionItem`s into the remediation/new-material lane only (never review/interleaving).
**Files:** `src/engine/scheduler.ts`
**Depends on:** 3.8, 3.10
**Verification:** unit test — promoted items appear with `selectionReason: 'notebook_practice'`, and assert they are absent from the review pool.

### Task 3.13 — grade notebook items → own SRS (Rule-8)
**Diff:** In the session grading path, when a graded item is `notebook_practice`, advance the NotebookItem's own SRS via `useNotebook` (NOT `conceptMastery`) and log it.
**Files:** `src/hooks/useSession.ts` (grading consumer — **confirm exact write-site at build start**), `src/hooks/useNotebook.ts`
**Depends on:** 3.11, 3.12, 3.4
**Verification:** **Rule-8 end-to-end in a real session** — complete a promoted item → its `srsLevel` advances + `nextReviewAt` set; a wrong answer resets it; `conceptMastery` provably untouched.

### Task 3.14 — feed due items from session bootstrap
**Diff:** Where the session is generated (`useSession`), fetch due/promoted items via `useNotebook` + `notebook-promotion` and pass them to the scheduler.
**Files:** `src/hooks/useSession.ts`
**Depends on:** 3.12, 3.10, 3.4
**Verification:** integration — a promoted item surfaces in a freshly generated session.

### Phase 3F — Supabase sync (separable; ship after 3A–3E)

### Task 3.15 — learner_notebook migration + RLS
**Diff:** Add `supabase/migrations/004_learner_notebook.sql` creating `learner_notebook (id, user_id, data jsonb, created_at, updated_at)` with RLS `FOR ALL TO authenticated USING/WITH CHECK ((select auth.uid()) = user_id)`.
**Files:** `supabase/migrations/004_learner_notebook.sql`
**Depends on:** 3.1
**Verification:** apply on a Supabase branch; cross-user select denied; `get_advisors` clean.

### Task 3.16 — notebook Supabase sync in the hook
**Diff:** Add `saveNotebookToSupabase` + load-from-Supabase in `useNotebook`, gated `if (user)`, fire-and-forget, mirroring the fingerprint sync.
**Files:** `src/hooks/useNotebook.ts`
**Depends on:** 3.15, 3.4
**Verification:** auth save lands a row; guest writes only IndexedDB; cross-device load round-trips.

---

## Dependency Graph
| Task | Depends on | Parallel-safe with |
|---|---|---|
| 2.1 popover primitive | none | 2.3, 3.1, 3.8, 3.11 |
| 2.2 WordPopup | 2.1 | 2.3, 3.1–3.4, 3.8, 3.10, 3.11 |
| 2.3 word-explanation resolver | none | 2.1, 2.2, 3.1–3.4, 3.8, 3.11 |
| 2.4 reading swap | 2.2, 2.3 | 2.5, 2.6, 2.7 |
| 2.5 conversation | 2.2, 2.3 | 2.4, 2.6, 2.7 |
| 2.6 journal | 2.2, 2.3 | 2.4, 2.5, 2.7 |
| 2.7 repair card | 2.2, 2.3 | 2.4, 2.5, 2.6 |
| 3.1 NotebookItem type | none | 2.x, 3.8, 3.11 |
| 3.2 IDB store | 3.1 | 3.3, 3.8, 3.10, 3.11 |
| 3.3 zustand store | 3.1 | 3.2, 3.8, 3.10, 3.11 |
| 3.4 useNotebook | 3.2, 3.3 | 3.8, 3.10, 3.11 |
| 3.5 wire Save | 2.2, 3.4 | 3.6, 3.8, 3.10, 3.11 |
| 3.6 /vocab notebook screen | 3.4 | 3.5, 3.8, 3.10, 3.11 |
| 3.7 drawer + entry | 3.6 | 3.8, 3.10, 3.11 |
| 3.8 selection reason | none | most |
| 3.9 practice toggle | 3.5, 3.6 | 3.8, 3.10, 3.11 |
| 3.10 promotion gate | 3.1 | 3.2–3.9 (no file overlap) |
| 3.11 SRS primitive | none | most |
| 3.12 scheduler inject | 3.8, 3.10 | 3.5–3.7, 3.9 |
| 3.13 grade → own SRS | 3.11, 3.12, 3.4 | — (shares useSession with 3.14 → SEQUENTIAL) |
| 3.14 feed from bootstrap | 3.12, 3.10, 3.4 | — (shares useSession with 3.13 → SEQUENTIAL) |
| 3.15 migration + RLS | 3.1 | 3.16-pre |
| 3.16 supabase sync | 3.15, 3.4 | — |

**File-overlap sequential pairs (Pattern 9):** 2.2↔3.5↔3.9 (WordPopup/NotebookScreen) run in order; 3.13↔3.14 both touch `useSession.ts` → strictly sequential.

**Recommended waves:** W1 = {2.1, 2.3, 3.1, 3.8, 3.11} (no deps, parallel). W2 = {2.2, 3.2, 3.3, 3.10}. W3 = {2.4–2.7 (parallel), 3.4}. W4 = {3.5, 3.6}. W5 = {3.7, 3.9, 3.12}. W6 = {3.13 → 3.14}. W7 (later) = {3.15 → 3.16}.

## Subagent Handoff Contract (template — one per dispatched task at build time)
```yaml
handoff:
  intent: [task diff sentence + its verification artifact]
  slug: [e.g. notebook-idb-store]
  status: READY_FOR_BUILD
  artifacts:
    - docs/plan-corrections-and-notebook.md (read-only)
    - [the in-scope file(s) from the task] (will modify)
    - [1-2 reference files, e.g. src/storage/indexeddb.ts] (read-only pattern)
  constraints:
    in_scope_files: [task's file list — max 3]
    forbidden_actions: ["no schema/type changes outside scope", "no new deps unless task is 2.1", "do not touch conceptMastery", "no commit", "no deploy"]
    time_budget: 20m
```
Example (Task 3.2): intent="add a `notebook-items` IndexedDB store via DB v1→v2 bump; verified by a put/getAllFromIndex test that also asserts existing fingerprints survive the upgrade"; in_scope_files=[src/storage/indexeddb.ts]; reference=[src/types/notebook.ts, cached idb upgrade docs]; forbidden=["don't change the 'fingerprints' store", "no commit"].

## Verification Strategy
- Per task: the evidence artifact named in each task (unit test, integration test, or QA screenshot) — no "make sure it works".
- UI states (popup variants, notebook screen): the project's throwaway-QA-route + Playwright screenshot at 375/768/1280/1920, then delete the route + `rm -rf .next` before the gate (the locked visual-QA method).
- Every commit: `npm run audit:gate` AUDIT-CLEAN, run **alone** (never concurrent with `npm run build` — Rule 9).
- Rule-8 gate (Task 3.13): the feed-the-engine write must be traced in a **real session**, not a unit mock, before it ships.
- Authoring and review stay separate passes (executor builds; code-reviewer/verifier approves) — no self-approval.

## Open Risks / Flags
1. **No NB→EN dictionary.** Popup English translation is corpus-only; unknown words show honest "Ingen oppslag ennå". *Decision deferred:* build a Norsk-ordbank-based gloss source later (the gender-map/pos-map precedent exists) — out of MVP scope.
2. **Grading write-site (Task 3.13) not byte-confirmed.** Candidate is `src/hooks/useSession.ts`; the exact mastery-write call must be located at build start before wiring the notebook-SRS branch.
3. **IndexedDB v1→v2 upgrade** must not drop the `fingerprints` store — explicit upgrade test required (Task 3.2).
4. **Scheduler signature change** (Task 3.12) — keep `notebookItems` an **optional** param so all existing call sites stay valid.
5. **Notebook unbounded growth** — row-per-item in Supabase (not a JSONB blob like fingerprint_sync) so it scales; IndexedDB store handles local volume.
6. **No toast infra** — MVP uses an inline popup confirmation, not a global toast system.
7. **Rule 1 (depth not breadth):** this is a large surface; consider shipping slice 2 + phases 3A–3B first as a usable increment, then 3C–3E, then 3F.

## Estimated Scope
- Files affected: ~18 (3 new types/lib, 4 new components, 2 new hooks/stores, 1 migration, ~6 edits, 1 dep).
- Tasks: 16 (slice 2 = 7, slice 3 = 9 + sync).
- Parallel-safe: W1 of 5 tasks concurrent; 2 hard sequential pairs.
- Rough tokens: ~250–400k across executor + review passes (excludes this planning).
