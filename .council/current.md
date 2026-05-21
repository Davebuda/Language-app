# Task Brief
**Task:** P0.5-02 — Concept-id reconciliation (graph as source of truth)
**Date:** 2026-05-21T19:00
**Status:** IN PROGRESS (correction 1/3)
**corrections:** 1

---

## Correction Required — 2026-05-21T20:00

**Problem:** The previous run reported renames across `questions.ts`, `conversation/page.tsx`, `WritingEditor.tsx`, `prompts.ts`, and `useFingerprint.ts` BUT none of the edits actually landed in the working tree. `git status -s` is clean. `git diff HEAD` is empty. `WritingEditor.tsx` line 26 still reads `'verb-conjugation': 'present-tense-verbs'`. The Write/Edit operations either silently failed or were never invoked. The report file:line counts were not verified against actual file state. The agent's surface-drift section was the most useful output — those four files DO contain legacy concept-IDs that must be in scope.

**Fix:**
1. **Do the rename in the working tree, then immediately commit it** before reporting completion. That makes "claim work is done" auditable via `git log`.
2. **Expanded scope** — the four files the previous run flagged as surface drift are now in-scope. They contain LIVE runtime concept-ID lookups (constraints.ts is conversation-path; dashboard's CONCEPT_TO_TOPIC is dashboard topic suggestions). Plus three additional files my fresh Grep found.
3. **Distinguish concept-IDs (RENAME) from ErrorTag taxonomy entries (KEEP).** `negation-placement` appears as BOTH — it is a legacy concept-ID (rename to `negation`) AND a current ErrorTag in `src/types/taxonomy.ts` (keep as-is in taxonomy and in places that reference the taxonomy entry). The brief below identifies which occurrences are which.

**Do not:** Report completion without first running the verification Grep yourself AND committing the work to git. Self-verification before claiming done is now mandatory.

---

## What

The P0.5-01 audit proved that NorskCoach has FOUR divergent concept-id schemes living in parallel: (1) diagnostic questions, (2) fingerprint write paths (conversation/journal), (3) the curriculum graph, and (4) the seed corpus. For 5 of the 12 diagnostic concepts the IDs mismatch the graph, so fingerprint writes land on keys the progress page never reads, AND the scheduler cannot find sentences for those concepts because the corpus uses graph IDs the diagnostic doesn't write.

This single defect is the root cause of F036 (progress page shows 0% / Locked everywhere), F019 (36+ "no eligible sentence" scheduler warnings on every dashboard load), and a large fraction of F018/F021 dashboard symptoms (the scheduler degrades to "Norwegian Foundations" because most concepts have no eligible sentence).

**Decision: graph IDs are the canonical scheme.** The curriculum graph defines prerequisites, thresholds, attempts, and days — it is the natural source of truth. Diagnostic questions, fingerprint mastery keys, conversation/journal mappings, AI prompt labels, and seed corpus IDs all migrate to graph IDs.

This task is the rename + migration. P0.5-03 follows up with the corpus retag (now possible because the ID scheme is settled).

**Files in scope (EXPANDED after correction):**
- `src/lib/diagnostic/questions.ts` — `conceptId` field values throughout
- `src/app/conversation/page.tsx` — `ERROR_TAG_TO_CONCEPT` map VALUES (line ~62-73). The map keys are ErrorTags (taxonomy) — DO NOT rename keys.
- `src/components/journal/WritingEditor.tsx` — `WRITING_TAG_TO_CONCEPT` map VALUES (line ~22-34). Keys are ErrorTags — DO NOT rename keys.
- `src/ai/prompts.ts` — `CONCEPT_LABELS` keys (concept IDs); also any concept-ID references inside prompt template strings.
- `src/hooks/useFingerprint.ts` — NEW migration in bootstrap (see Step 3 of How).
- `src/app/dashboard/page.tsx` — `CONCEPT_TO_TOPIC` map keys (concept IDs). Lines ~33, 34, 42, 43, 44.
- `src/lib/constraints.ts` — `conceptToConstraint()` internal map keys (concept IDs). Lines ~19, 24, 29, 34, 54. **THIS IS A LIVE RUNTIME PATH** — without the rename, a fingerprint with canonical IDs will silently get no constraints in conversation. CLAUDE.md operating rule 6 violation if missed.
- `src/lib/concept-colors.ts` — `CONCEPT_COLORS` keys. Line ~13 (`modal-verbs`).
- `src/app/eval/page.tsx` — test conceptId params at lines ~42, 89, 98.
- Plus check via Grep for any usage of the legacy IDs in: `src/ai/webllm.ts`, `src/ai/stub.ts`, `src/engine/repair-loop.ts`, `src/app/session/complete/page.tsx`. For each occurrence, determine: is this a concept-ID (RENAME) or an ErrorTag taxonomy entry (KEEP)? See the disambiguation table below.

**Disambiguation table — concept ID vs ErrorTag:**

| String | As concept-ID (RENAME to) | As ErrorTag (KEEP) | How to tell |
|---|---|---|---|
| `present-tense-verbs` | `present-tense-regular` | NOT an ErrorTag — always rename | Field is `conceptId`, map key in CONCEPT_COLORS/CONCEPT_TO_TOPIC/CONCEPT_LABELS, or map value in TAG_TO_CONCEPT |
| `negation-placement` | `negation` | `'negation-placement'` (taxonomy) | If used in `src/types/taxonomy.ts` ErrorTag union, or as a KEY in TAG_TO_CONCEPT maps, KEEP. If used as conceptId value, RENAME. |
| `past-tense-regular` | `preterite-regular` | NOT an ErrorTag — always rename | (same) |
| `modal-verbs` | `common-modal-verbs` | `'modal-verb'` (singular — different) is an ErrorTag, KEEP. `modal-verbs` (plural) is the concept-ID. | Plural form = concept-ID = RENAME. |
| `prepositions-place` | `common-prepositions` | NOT an ErrorTag — always rename | (same) |

**Out of scope (do NOT touch):**
- `content/sentences/*.json` (corpus retag is P0.5-03)
- `content/concepts/*-graph.json` (graph is the canon — don't edit)
- `src/types/taxonomy.ts` (ErrorTag definitions stay)
- Files only used in tests that aren't broken by the rename (don't go on a cleanup hunt)

---

## How

### Step 1 — Migration map

From the P0.5-01 audit (`.council/reports/2026-05-21-1830-source-verification.md` § F036), the rename table is:

| Legacy diagnostic ID | Canonical graph ID |
|---|---|
| `present-tense-verbs` | `present-tense-regular` |
| `negation-placement` | `negation` |
| `past-tense-regular` | `preterite-regular` |
| `modal-verbs` | `common-modal-verbs` |
| `prepositions-place` | `common-prepositions` |

The other 7 diagnostic IDs already match the graph (`noun-gender`, `personal-pronouns`, `svo-word-order`, `definite-articles-singular`, `v2-word-order`, `adjective-agreement`, `question-formation`) — no rename needed.

### Step 2 — Rename in code

For each of the five legacy IDs, replace every occurrence with the canonical graph ID across the in-scope files. Use Grep with `output_mode: files_with_matches` to find every reference; do not assume.

Special instructions per file:

- **`src/lib/diagnostic/questions.ts`**: The audit notes lines 15-313. Each question object has a `conceptId` field. Rename the five legacy values. Verify post-rename that every `conceptId` in the array appears as a node in either `content/concepts/a1-graph.json` or `content/concepts/a2-graph.json`.

- **`src/app/conversation/page.tsx:62-73`** (`ERROR_TAG_TO_CONCEPT`): The map values are the rename target. Rename the five legacy values. Note this task does NOT extend the map for completeness — that's P0.5-04 (extract to shared module). Touch only the values that need renaming; do not introduce new keys.

- **`src/components/journal/WritingEditor.tsx:22-34`** (`WRITING_TAG_TO_CONCEPT`): Same shape as above. Rename values only.

- **`src/ai/prompts.ts:5-20`** (`CONCEPT_LABELS`): If the keys are the diagnostic IDs, rename them. If the keys are already graph IDs, no change. Read the file to verify.

### Step 3 — Migration in fingerprint bootstrap

In `src/hooks/useFingerprint.ts`, the bootstrap path runs on app load and on auth change. Existing users have fingerprints with the legacy diagnostic keys. Without a migration, their mastery data orphans.

Add a one-shot migration that runs once during bootstrap (idempotent — must be safe to run multiple times):

```ts
// Conceptual sketch; place inside bootstrap or in a dedicated migrateFingerprint() called from bootstrap
const LEGACY_KEY_RENAMES: Record<string, string> = {
  'present-tense-verbs': 'present-tense-regular',
  'negation-placement': 'negation',
  'past-tense-regular': 'preterite-regular',
  'modal-verbs': 'common-modal-verbs',
  'prepositions-place': 'common-prepositions',
};

function migrateConceptIds(fp: MistakeFingerprint): { migrated: MistakeFingerprint; changed: boolean } {
  let changed = false;
  const conceptMastery = { ...fp.conceptMastery };
  for (const [oldKey, newKey] of Object.entries(LEGACY_KEY_RENAMES)) {
    if (conceptMastery[oldKey]) {
      // If the new key already exists (e.g. user re-ran diagnostic post-update), merge
      const existing = conceptMastery[newKey];
      if (existing) {
        // Merge by taking the more recent / higher-attempt entry — defer the actual merge
        // policy decision to the implementer; document it inline. Simplest: prefer the
        // newer lastAttemptAt. Fall back to keeping the legacy entry if the new is null.
        // ...
      } else {
        conceptMastery[newKey] = { ...conceptMastery[oldKey], conceptId: newKey };
      }
      delete conceptMastery[oldKey];
      changed = true;
    }
  }
  // Also rewrite recentErrors[].conceptId by the same map
  const recentErrors = fp.recentErrors.map((e) =>
    LEGACY_KEY_RENAMES[e.conceptId]
      ? { ...e, conceptId: LEGACY_KEY_RENAMES[e.conceptId] }
      : e
  );
  // Same for askedDiagnosticQuestionIds — these are question IDs, NOT concept IDs, so DO NOT touch them
  if (changed) {
    return { migrated: { ...fp, conceptMastery, recentErrors, updatedAt: new Date().toISOString() }, changed: true };
  }
  return { migrated: fp, changed: false };
}
```

The bootstrap should:
1. Load the fingerprint from IndexedDB (existing flow).
2. Run `migrateConceptIds(fp)`.
3. If `changed === true`, persist the migrated fingerprint (save to IndexedDB + fire-and-forget Supabase sync if auth).
4. Use the migrated fingerprint for the rest of bootstrap.

The migration MUST be idempotent: running twice on the same fingerprint should be a no-op the second time. The implementation above is idempotent because legacy keys disappear after first run.

### Step 4 — Verify (MANDATORY before reporting done)

Run these commands in this exact order. Do NOT report completion until all four pass:

1. **Re-grep for residual concept-IDs.** Use Grep tool:
   - pattern: `present-tense-verbs|negation-placement|past-tense-regular|modal-verbs|prepositions-place`
   - path: `src/`
   - output_mode: `content` with `-n: true` and `-C: 1`
   
   Every remaining match must be EITHER (a) the migration map inside `useFingerprint.ts` (which deliberately mentions legacy strings), OR (b) an ErrorTag taxonomy reference per the disambiguation table — verify each remaining match against that table inline before claiming done.

2. **TypeScript check:** Run `npx tsc --noEmit`. Zero errors required.

3. **Tests:** Run `npm test`. All existing tests must still pass. If any test references a legacy concept-ID, rename it.

4. **Git commit the work.** After verification passes:
   ```
   git add src/
   git commit -m "fix(engine): concept-id reconciliation — graph as canonical source (P0.5-02)"
   ```
   Then run `git log --oneline -1` and `git diff HEAD~1 --stat` and include the output in your final report. This is the proof the changes landed.

### Step 5 — Tests

Find tests touching the legacy IDs. Likely candidates:
- `tests/lib/diagnostic/*`
- `tests/hooks/useFingerprint.test.ts`
- `tests/engine/scheduler.test.ts`

Rename IDs in tests so they pass.

---

## Model

opus — migration touches user data; the merge policy in the bootstrap when both old and new keys are present needs architectural judgement. Risk profile is "small bug breaks every existing user".

---

## Acceptance Criteria

1. `grep -rn "present-tense-verbs\|negation-placement\|past-tense-regular\|modal-verbs\|prepositions-place"` returns matches ONLY inside the migration map in `useFingerprint.ts` (the migration deliberately mentions the legacy strings).
2. `src/lib/diagnostic/questions.ts` — every `conceptId` value appears in either `content/concepts/a1-graph.json` or `content/concepts/a2-graph.json`.
3. `src/app/conversation/page.tsx` and `src/components/journal/WritingEditor.tsx` — every value in the tag-to-concept maps is a graph ID.
4. `src/ai/prompts.ts` `CONCEPT_LABELS` — keys are graph IDs.
5. `src/hooks/useFingerprint.ts` — migration is present, idempotent, runs on bootstrap, persists when it changes the fingerprint, also rewrites `recentErrors[].conceptId`.
6. `askedDiagnosticQuestionIds` is NOT touched by migration (those are question IDs, not concept IDs).
7. No TypeScript errors. (`npm run typecheck` clean — but also build:  `npm run build` if a clean baseline exists.)
8. Existing tests pass.
9. Walkthrough manual: load app fresh, navigate `/dashboard` → `/progress`. The progress page should now correctly show concepts with rawScore data (not all at 0%/Locked). Some may remain Locked because the corpus retag is P0.5-03 — that's expected.

---

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:

- A graph ID rename target does not exist as a node in the graph JSON (the audit's table is wrong — fix the audit, do not invent IDs).
- The merge policy when both old and new keys exist cannot be decided cleanly. (Stop, surface the question, do not guess.)
- The migration would touch `askedDiagnosticQuestionIds`, `errorPatterns`, or any field outside `conceptMastery` and `recentErrors`. Those are out of scope.
- Any file outside the in-scope list above would need to be changed beyond the migration's Grep-find targets.

---

## Playwright Checkpoint

**FULL**

Tests:
1. Load `/dashboard` as a guest. Verify no console errors at first paint. The scheduler "no eligible sentence" warning count should be measurably lower than the 36+ recorded in the third walkthrough (some concepts will still warn — that's P0.5-03).
2. Load `/progress`. Verify rawScore-bearing concepts (those in the fingerprint with rawScore > 0) now render their actual scores, not 0%/Locked. If the page still shows everything Locked, the cascade in `getConceptPhase` may need to be checked — flag if so.
3. Critical-path regression: `/dashboard` → Start session → answer one correctly → answer one incorrectly → repair → next exercise. Verify no console errors, repair card still fires.
4. Pre-existing fingerprint test: before running migration, inject a synthetic fingerprint into IndexedDB with one legacy key (e.g. `prepositions-place: { rawScore: 88, attemptCount: 3, ... }`). Reload `/dashboard`. Verify the key migrates to `common-prepositions` and the rawScore is preserved.

Save screenshots to `.council/reports/screenshots/[timestamp]-concept-id-reconciliation/`.

Report at `.council/reports/[timestamp]-concept-id-reconciliation.md`.
