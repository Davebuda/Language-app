# NorskCoach — Fix Plan (Phase 6)

> Dependency-ordered. Each fix: scope, files, the test that locks it, and quick-win vs architectural. Respect the project rails: analysis-first on design choices (Rule 2), one move at a time (Rule 4), no silent substitution (Rule 6), trace the write (Rule 8), reconcile before deploy (Rule 9), visual-QA conditional UI.

## Top 10 fixes, in dependency order

### 1. A-01 — B2 fill-in-blank content migration + CI gate **[Critical · architectural-ish content]**
- **Do:** add a clean answer source for fill-in-blank (new `blank_answer` field OR `accepted_answers[0]`); migrate B2's 182 rows by extracting the leading token before `—`; point `deriveCorrectAnswer` at the clean field with `notes` as fallback only when clean field absent. Keep `notes` as the explanation.
- **Files:** `content/sentences/b2.json` (182 rows), `src/lib/grade-utils.ts`, `src/types/content.ts`, `tests/content/fill-in-blank-integrity.test.ts`.
- **Gate/test:** CI — no fill-in-blank `notes`/answer-field containing `—`/`–`/`"`/`;`/>3 tokens; unit — `checkAnswer(cleanAnswer, derived)` true for every fill-in-blank sentence (currently fails 182×).
- **Why first:** highest learner-harm, actively poisoning diagnosis + SRS for every B2 user. Content + gate, low code risk. **norwegian-linguist** should eyeball the extracted tokens (apostrophe/genitive edge like G-06).

### 2. S-01 — Grade retry/generated content against the resolved cache **[High · architectural]**
- **Do:** when the failed/cached content is generated (id absent from corpus), grade client-side against the cached `Sentence` (or pass the sentence payload to `gradeAnswer`) instead of re-resolving by id. On any `null` grade, surface an honest fallback + advance — never freeze.
- **Files:** `src/app/session/actions.ts`, `src/hooks/useSession.ts`, exercise components' submit path, `src/engine/repair-loop.ts`.
- **Test:** integration — generated id absent from corpus → retry grades against cache + advances; null-grade surfaces honest fallback (not a frozen submit).
- **Analysis-first:** the grade-client-side-vs-send-payload choice is a real design fork → brief options before coding.

### 3. G-02 — SpeedRound recourse parity (or EN-grade exclusion) **[High · medium code]**
- **Do:** give speed-round the same near-miss self-attest affordance as translation, OR exclude EN-exact-grading at B1/B2 where accepted_answers = 0. Pick one (analysis-first).
- **Files:** `src/components/session/exercises/SpeedRound.tsx`, shared recourse logic from `TranslationExercise.tsx`.
- **Test:** e2e — speed-round paraphrase offers recourse or is not hard-failed.

### 4. R-01 — Wire muntlig lanes into the dashboard **[High · quick win]**
- **Do:** add a Muntlig section (or BottomNav affordance) linking `/listen`, `/drills`, `/shadow`; reconcile CLAUDE.md's "links to all three" claim with reality.
- **Files:** `src/app/dashboard/page.tsx`, `src/lib/lane-completion.ts`, `CLAUDE.md`.
- **Test:** Playwright — dashboard DOM contains a link to each muntlig route. **Visual-QA** the new section (4 widths).

### 5. S-04 — Skip ≠ correct **[Medium · quick win]**
- **Do:** carry a `skipped` flag on phantom-skip results; exclude from accuracy + mastery + production count.
- **Files:** `src/components/session/ExerciseCard.tsx`, `src/types/session.ts` (ExerciseResult), `src/app/session/complete/page.tsx`, fingerprint write path.
- **Test:** unit — phantom-skip result excluded from accuracy/mastery.

### 6. E-01 — Guard `/eval` out of production **[Medium · quick win, ops]**
- **Do:** `process.env.NODE_ENV !== 'production'` guard (404/redirect) or exclude from the build.
- **Files:** `src/app/eval/page.tsx`.
- **Test:** prod build — `GET /eval` 404s/redirects. Verify on pandoai.no after deploy.

### 7. D-01 — Await the seed write before navigation **[Medium · small code]**
- **Do:** `await seedFingerprintFromDiagnostic` (or its `saveFingerprint`) before `router.push`; OR make `useFingerprint` bootstrap skip the IndexedDB reload when the store already holds this user's fp.
- **Files:** `src/components/onboarding/OnboardingFlow.tsx`, `src/hooks/useFingerprint.ts`.
- **Test:** integration — defer `saveFingerprint`, run seed then mount `useFingerprint`, assert level = diagnostic level not A1.

### 8. S-05 — Honest per-item skip instead of infinite skeleton **[Medium · small code]**
- **Do:** when `resolveItem` caches nothing, render an honest "ingen innhold — hopp over" that advances with no positive write (don't reinstate auto-skip — Rule 6).
- **Files:** `src/hooks/useSession.ts`, `src/components/session/SessionScreen.tsx`.
- **Test:** integration — empty seed pool offers honest skip, no positive write, session completable.

### 9. AI-01 — Journal corrected-text must not assert unverified corrections **[Medium · small code]**
- **Do:** in `buildCorrectedText`, either apply only gate-confirmed corrections, or visually mark unverified ones as "forslag" (suggestion) not authoritative truth.
- **Files:** `src/components/journal/WritingEditor.tsx`.
- **Test:** unit — a wrong-but-valid gender correction is not silently woven into `correctedText` without a caveat.

### 10. S-02 / S-03 — Timeout & capped-repair honesty **[Medium · small code]**
- **Do:** S-02 — treat speed-round timeout as low-confidence (no SRS reset); S-03 — when repair injection is capped, SRS-schedule the concept (defer) + an honest note instead of a silent no-op.
- **Files:** `src/components/session/exercises/SpeedRound.tsx`, `src/lib/classify-error.ts`, `src/stores/session-store.ts`, `src/hooks/useSession.ts`.
- **Test:** unit (empty-input low-confidence) + integration (capped repair still schedules review).

## Quick wins (≤ small diff, high clarity)
R-01 (wire muntlig), S-04 (skip flag), E-01 (eval guard), D-01 (await seed), AI-02 (badge while null), R-06 (login copy says "kode" not "lenke"), G-04 (map accepted_answers in Supabase fallback).

## Architectural (need analysis-first / design fork)
A-01 (content schema + gate), S-01 (grader content-resolution), G-02/G-03/G-05 (recourse parity + content coverage at B1/B2 — linguist-gated content lane).

## Sequencing rationale
- **1 → 2** because both touch the grader contract; fixing A-01's field first means S-01's client-side grading reuses the clean field.
- **4, 5, 6** are independent quick wins — parallelizable.
- **G-03/G-05** (content coverage) are a standing linguist-gated lane, not a code sprint — track separately.

## NOT in this plan (already fixed / not-reproduced — see registry)
Diagnostic off-by-one, SSR/CSR mismatch, mic auto-start, WebLLM gibberish, seed-path retry, journal-mastery-poisoning, /vocab+/recalibrate honesty. Do not re-open without a fresh repro.
