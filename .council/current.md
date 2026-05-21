# Task Brief
**Task:** P0.5-03 — Wire production corpus to client scheduler + fix orphan-sentence placeholder
**Date:** 2026-05-21T20:25
**Status:** IN PROGRESS
**corrections:** 0

---

## What

The corpus audit during P0.5-02 verification surfaced that this task's original framing ("corpus retag") was misdiagnosed. The corpus is well-formed: 44 concepts × 9 sentences each × all 6 exercise types, all using canonical graph IDs. The walkthrough's F010 symptom (all errors tagged `word-order`) was sample bias from a fingerprint heavily concentrated on word-order-related concepts (question-formation, v2-word-order), each of which legitimately first-tags `word-order`.

The actual residual defects are:

**A — `src/lib/mock-sentences.ts` is the client scheduler's seed pool.** `src/app/dashboard/page.tsx:104-109` calls `generateSession({ ..., availableSentenceIds: MOCK_SENTENCE_IDS, sentences: MOCK_SENTENCES })`. `MOCK_SENTENCES` is a tiny test fixture (~10 sentences total). The real corpus (`content/sentences/a1.json` + `a2.json`, 397 sentences across 44 concepts) is loaded server-side only — `src/lib/content-loader.ts` uses `fs.readFileSync`, runs in `src/app/session/actions.ts`. The schedulers never see the real corpus. Result: F019 scheduler emits "no eligible sentence" warnings for concepts that DO have sentences in the disk corpus.

**B — `src/app/session/actions.ts:61-64` fails open with a literal placeholder.** When a sentence ID is unknown to both the disk corpus and Supabase, the grader returns `{ correct: false, correctAnswer: '[unavailable]', errorTag: undefined }`. The placeholder string propagates into `recentErrors[].correct`, where the walkthrough found 12/24 stored errors literally containing the string `"[unavailable]"`. This is the F011 root cause — orphan sentence IDs the disk corpus doesn't know.

The two are linked: when the client scheduler queues a mock sentence ID (e.g. `mock-s11`), the server grader doesn't find it in the disk corpus, falls open, returns `[unavailable]`. Wiring the real corpus to the client also reduces orphan-ID incidence dramatically.

**Files in scope:**
- NEW `src/lib/seed-pool.ts` — client-safe production-corpus wrapper. Imports `a1.json` and `a2.json` via standard ES import (Next.js bundles JSON statically), maps them to the `Sentence` shape, exports `SEED_SENTENCES` (Record<id, Sentence>) and `SEED_SENTENCE_IDS` (Record<conceptId, string[]>).
- `src/app/dashboard/page.tsx` — replace `MOCK_SENTENCES`/`MOCK_SENTENCE_IDS` import + usage with `SEED_SENTENCES`/`SEED_SENTENCE_IDS`.
- `src/hooks/useSession.ts` — find where `availableSentenceIdsProp` and `sentences` are sourced; wire to the new seed-pool if currently mock-based.
- `src/app/session/actions.ts` — replace the line 61-64 fail-open `'[unavailable]'` placeholder with a discriminated-union return that callers handle without persisting placeholder data.
- `src/components/session/exercises/TranslationExercise.tsx` (and similar callers of `gradeAnswer`) — handle the new discriminated-union from the server grader: when the grader can't resolve the sentence, do NOT call `onResult` (drop the answer silently to telemetry/console.warn rather than persisting `[unavailable]`).

**Out of scope:**
- `src/lib/mock-sentences.ts` itself — leave intact for any unit tests that reference it. Just stop importing from it on the dashboard.
- `src/lib/content-loader.ts` server-side path — keep as-is.
- Supabase `sentences` table — out of scope for this task.

---

## How

### Step 1 — Build the client-safe seed pool

Create `src/lib/seed-pool.ts`. Pattern (verify against Next.js 15 JSON-import behaviour):

```ts
import a1Raw from '@content/sentences/a1.json'
import a2Raw from '@content/sentences/a2.json'
import type { Sentence } from '@/types/content'

// Re-implement the mapping from content-loader.ts:20-35 here (client-safe — no fs).
function mapRow(raw: {...same fields as RawSentence...}): Sentence {
  return {
    id: raw.id,
    norwegian: raw.norwegian,
    english: raw.english,
    conceptIds: raw.concept_ids ?? [],
    vocabularyClusters: raw.vocab_clusters ?? [],
    errorTagsDetectable: (raw.error_tags_detectable ?? []) as Sentence['errorTagsDetectable'],
    cefrLevel: (raw.cefr_level ?? 'A1') as Sentence['cefrLevel'],
    difficulty: (raw.difficulty ?? 1) as Sentence['difficulty'],
    exerciseTypes: (raw.exercise_types ?? []) as Sentence['exerciseTypes'],
    notes: raw.notes,
    audioUrl: raw.audio_url,
    scenarioId: raw.scenario_id,
  }
}

const RAW: Array<Parameters<typeof mapRow>[0]> = [...(a1Raw as any), ...(a2Raw as any)]

export const SEED_SENTENCES: Record<string, Sentence> = {}
export const SEED_SENTENCE_IDS: Record<string, string[]> = {}
for (const raw of RAW) {
  const s = mapRow(raw)
  SEED_SENTENCES[s.id] = s
  for (const conceptId of s.conceptIds) {
    if (!SEED_SENTENCE_IDS[conceptId]) SEED_SENTENCE_IDS[conceptId] = []
    SEED_SENTENCE_IDS[conceptId].push(s.id)
  }
}
```

Check the existing `@content` path alias in `tsconfig.json` — if it doesn't exist for JSON imports, either use a relative path or add the alias.

### Step 2 — Replace MOCK imports

`src/app/dashboard/page.tsx`:
- Find the import `import { MOCK_SENTENCES, MOCK_SENTENCE_IDS } from '@/lib/mock-sentences'` (or similar).
- Replace with `import { SEED_SENTENCES, SEED_SENTENCE_IDS } from '@/lib/seed-pool'`.
- Update the `generateSession` call site (line ~104-109) to pass the new identifiers.

`src/hooks/useSession.ts`:
- Find the source of `availableSentenceIdsProp` and `sentences` at line ~164.
- If they currently default to or import the MOCK_*, replace with the SEED_* equivalents.
- If they come from props passed by a parent component, find the parent and update there.

### Step 3 — Replace the placeholder grader fail-open

In `src/app/session/actions.ts`, the current shape is:

```ts
if (!sentence) {
  return { correct: false, correctAnswer: '[unavailable]', errorTag: undefined }
}
```

Replace with a discriminated-union return. The grader's return type today is `{ correct: boolean; correctAnswer: string; errorTag: ErrorTag | undefined }` — change to:

```ts
type GraderResult =
  | { ok: true; correct: boolean; correctAnswer: string; errorTag: ErrorTag | undefined }
  | { ok: false; reason: 'unknown-sentence'; sentenceId: string }
```

Update the return at lines 61-64 to `{ ok: false, reason: 'unknown-sentence', sentenceId }` and the success return to `{ ok: true, ... }`.

### Step 4 — Update callers

`src/components/session/exercises/TranslationExercise.tsx` (and any other component that calls `gradeAnswer`):
- After `await gradeAnswer(...)`, check `if (!result.ok)` — when not ok, `console.warn` with the sentenceId, DO NOT call `onResult`, and surface an honest UI banner (text suggestion: "Kunne ikke vurdere svaret — vi har notert det og går videre."). User clicks "Next" to advance without persisting.

There may be 1–3 caller components; find them via:
```
Grep `gradeAnswer\(` src/components/session/exercises/
```

### Step 5 — Verify

1. `npx tsc --noEmit` — zero errors.
2. `npm test` — all existing tests pass. If a test depended on the `'[unavailable]'` placeholder string, update it to assert `ok: false`.
3. Manual Grep:
   - `grep -rn "'\\[unavailable\\]'" src/` — should return zero matches except any in pure documentation/comments.
   - `grep -rn "MOCK_SENTENCES\\|MOCK_SENTENCE_IDS" src/app/dashboard src/hooks/useSession.ts` — should return zero matches.
4. `git commit` with a clear message that lists files changed and the link to this brief.

---

## Model

opus — the discriminated-union change ripples through several callers; the JSON-import for a client-side seed pool may need a bundler config tweak. Architectural touch required.

---

## Acceptance Criteria

1. New file `src/lib/seed-pool.ts` exports `SEED_SENTENCES` (Record<id, Sentence>) and `SEED_SENTENCE_IDS` (Record<conceptId, string[]>). Source is `a1.json` + `a2.json` (397 sentences).
2. `src/app/dashboard/page.tsx` imports from `seed-pool` instead of `mock-sentences`. Same for `src/hooks/useSession.ts`.
3. `src/app/session/actions.ts` no longer returns the literal string `'[unavailable]'`. The return shape is a discriminated union.
4. All `gradeAnswer` callers handle the `ok: false` branch by NOT persisting a placeholder error.
5. `npx tsc --noEmit` is clean.
6. `npm test` passes (or has targeted updates if a test asserted the old placeholder).
7. After deployment to the running dev server: load `/dashboard` as a fresh user. The scheduler warning count for canonical concepts (`personal-pronouns`, `to-be-verb`, `numbers-basic`, `common-prepositions`) measurably drops or hits zero. (Some warnings may persist for concepts not in the corpus at all.)
8. Git commit lands. `git log --oneline -1` and `git status -s` confirm the work is in the tree.

---

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:

- Next.js 15 cannot statically import the JSON files at the required path (would need a runtime fetch approach instead — surface and stop).
- A test asserts the literal `'[unavailable]'` and rewriting it would require a much larger test refactor than this task's scope.
- The discriminated-union return breaks a caller that's hard to update without ripple changes outside `src/components/session/exercises/`.
- A bundler error appears for the corpus import that requires changing `next.config.ts` significantly.

---

## Playwright Checkpoint

**FULL**

Tests:
1. Reload `/dashboard` as a fresh user. Capture the scheduler warning count. Compare to the post-P0.5-02 baseline (14 warnings). Expect: warnings for the four named concepts (`personal-pronouns`, `to-be-verb`, `numbers-basic`, `common-prepositions`) DISAPPEAR or drop substantially. Any remaining warnings should be for concepts genuinely outside the A1/A2 corpus.
2. Start a session, complete at least one item correctly. Verify the session continues normally — no broken cards, no `[unavailable]` in the repair card.
3. Inspect IndexedDB: after an answer, the new `recentErrors` entry should never have `correct: "[unavailable]"`. If the grader couldn't resolve, the error should NOT have been logged at all.
4. Repair-card path: submit a wrong answer; the repair card should show a real correct answer, never the placeholder string.

Report at `.council/reports/[YYYY-MM-DD-HHMM]-corpus-wiring.md`.
