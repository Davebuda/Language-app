# NorskCoach — Regression Checklist (Phase 7)

> Tests to add so these failure classes can't silently return. Type per item: unit / integration / Playwright-e2e / fixture-validation / schema-validation / hydration / AI-fallback / snapshot.

## A. Content / schema (Cluster 1, 3)
- [ ] **fixture** — no fill-in-blank answer field contains `—`/`–`/`"`/`;` or >3 whitespace tokens (catches A-01 class permanently). `tests/content/fill-in-blank-integrity.test.ts`.
- [ ] **unit** — for every fill-in-blank sentence, `checkAnswer(cleanAnswer, deriveCorrectAnswer('fill-in-blank', …))` is true.
- [ ] **fixture/coverage WARN** — EN-graded B1/B2 sentence with 0 `accepted_answers` (G-03); multi-clause B1/B2 word-order with 0 `acceptedOrders` (G-05).
- [ ] **schema** — `notes` is documented + asserted as explanation-only, never the answer.

## B. Grading contract (Cluster 2, 3)
- [ ] **integration** — generated/cached sentence id absent from corpus: retry grades against the cache and advances; a `null` grade surfaces an honest fallback, never a frozen submit (S-01).
- [ ] **unit** — Supabase grade fallback maps `accepted_answers`/`accepted_orders` onto the Sentence (G-04).
- [ ] **e2e** — speed-round valid paraphrase is not hard-failed (recourse offered or excluded) (G-02).
- [ ] **unit** — `deriveCorrectAnswer` returns `english` for translation-to-english/speed-round, `norwegian` for translation-to-norwegian/word-order/listening (lock the contract).

## C. Repair / session state machine (Cluster 4, 6)
- [ ] **integration** — seed-path retry re-presents the EXACT failed sentence id (lock the fixed behavior so it can't regress).
- [ ] **unit** — repair injection at cap adds 0 items AND the concept is SRS-scheduled for deferred review (S-03).
- [ ] **unit** — phantom/unresolved-cloze skip result is excluded from accuracy + mastery + production count (S-04).
- [ ] **integration** — an item with an empty seed pool offers an honest skip (no infinite skeleton, no positive write) and the session stays completable (S-05).
- [ ] **unit** — speed-round timeout (empty input) yields a low-confidence error and does NOT reset SRS to 0 (S-02).
- [ ] **integration** — completion is always reachable: `totalItems===0` → honest terminal screen; no off-by-one (lock existing hardening).

## D. Diagnostic / persistence (Cluster 5)
- [ ] **unit** — diagnostic reveal: `displayedExplanationId === answeredQuestionId` (off-by-one guard).
- [ ] **integration** — defer `saveFingerprint`; run onboarding seed then mount `useFingerprint`; assert `currentLevel` = diagnostic level, not A1 (D-01).
- [ ] **hydration/snapshot** — dashboard/profile/progress render the hydrated level (or a loading placeholder), never a wrong level flash.
- [ ] **returning-user** — extend `tests/types/returning-user-fixture.ts` so a legacy fp through `seedFingerprintFromDiagnostic` drops no field (I3 from cluster C).

## E. AI paths / safety (Cluster 3, 8)
- [ ] **AI-fallback** — each AI surface returns its deterministic template on null/invalid/error/timeout (lock webllm + server fallbacks).
- [ ] **invariant** — `confirmedRepair` admits only gender/conjugation/adjective/compound; every other claimed class returns null and writes no mastery.
- [ ] **unit** — journal `buildCorrectedText` does not weave a gate-rejected (wrong-but-valid) correction into the shown corrected text without a caveat (AI-01).
- [ ] **e2e** — mounting `/conversation` and `/journal` triggers zero `start()`/getUserMedia calls until an explicit button click (mic-consent guard).
- [ ] **integration** — prod build: `GET /eval` 404s/redirects (E-01).
- [ ] **integration** — `/api/ai` returns 429 on the 31st request within a minute (AI-04, if abuse control is prioritized).

## F. Routes / honesty / a11y (Cluster 7, 9, 10)
- [ ] **e2e** — dashboard DOM links `/listen`, `/drills`, `/shadow` (R-01).
- [ ] **e2e** — `/reading` with a B1 fingerprint shows B1 texts or an honest below-level banner (R-02).
- [ ] **a11y (axe/Lighthouse)** — `/`, `/reading`, `/session`: every interactive control has an accessible name + keyboard operability (R-05); no interactive `<span onClick>` without role/keyboard (R-03).
- [ ] **snapshot** — `/login?error=auth_failed` copy references "kode" (OTP), not "lenke" (R-06).

## G. Standing gates already in place (keep green)
- [ ] `npm run audit:gate` (corpus / tsc / lint / vitest+retry / returning-user) AUDIT-CLEAN before every deploy.
- [ ] Rule 9 reconcile (3 trees clean + fast-forward) before deploy.

## H. Runtime confirmations still owed (Phase 2 runtime not executed this pass)
> These are `verified (static)` / `likely`; a Playwright pass on a prod build upgrades them to `verified (runtime)`.
- [ ] A-01 — confirm B2 fill-in-blank is actually scheduled in a live B2 session (and observe the wrong-mark).
- [ ] S-01 — reproduce the generated-content retry freeze in a real session (needs AI top-up to fire).
- [ ] D-01 — reproduce the level reset under fast post-diagnostic navigation.
- [ ] E-01 — confirm `/eval` is reachable on live pandoai.no.
- [ ] R-01/R-02 — confirm muntlig orphan + reading below-level on the running app.
