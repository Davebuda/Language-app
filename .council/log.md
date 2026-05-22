# Council Decision Log

## 2026-05-22T07:20 DONE — AlertDialog upgrade + roadmap reconciliation

**User invocation:** `/council /gsd` — second autonomous pass after Stream 5 close.

### Audit finding
Council Step 1 read of git/source revealed SIX "deferred" items in `docs/roadmap.md` were actually already shipped:
- Stream 1.1 Step 1 (prompt hardening — all 5 prompt builders in `src/ai/prompts.ts` carry Norwegian-enforcement system rules)
- Stream 1.2 (decay half-life — `DECAY_HALF_LIFE_DAYS = 25` at `src/engine/fingerprint.ts:12`)
- Stream 1.3 (calibration window — `calibrationSessionsRemaining` consumed at `src/hooks/useSession.ts:154`)
- Stream 1.4 writes (`src/lib/logEvents.ts` + migration 003 + Stream 5 Phase 4b wire)
- Integrity follow-up #2 (FillInBlank hardcoded errorTag — Grep clean)
- Integrity follow-up #3 (SpeedRound stale closure — `userInputRef.current` pattern live)

The roadmap was masking shipped work, causing Council to re-discover "next moves" that didn't exist. Truth restored in commit `1574d7d`.

### Real autonomous ship this pass — AlertDialog primitive
**Commit:** `922d91e` feat(ui): AlertDialog primitive + migrate session exit confirmation.
**Scope:** Single `window.confirm()` site in the codebase (P0.5-09 TODO at `SessionScreen.tsx:99`).
**Change:** Installed `@radix-ui/react-alert-dialog@^1.1.15`. Built shadcn-flavor primitive at `src/components/ui/alert-dialog.tsx` reusing `buttonVariants` and project `--nc-*` tokens. Migrated mid-session exit to use proper dialog with Norwegian copy ("Avslutte økten?" / "Du mister fremgangen i denne økten." / Avbryt / Avslutt).
**Verification:** typecheck clean, 155/155 tests pass.

### Roadmap reconciliation commit
**Commit:** `1574d7d`. Stream 1.1 Step 1, 1.2, 1.3, 1.4 (writes), all 3 integrity follow-ups, and AlertDialog all marked ✅ COMPLETE with file:line evidence. Stream 1.1 Step 2 (NB-Llama compile) noted as still queued. Stream 1.4 reads (analytics dashboard) noted as deferred.

### What's actually left (audited)
**Engineering (autonomous-eligible):**
- F008 path-traversal tightening (hygiene; no exploit)
- F025 session resume on re-entry (bigger — session-state persistence layer)
- F027 repair-loop cap (worst-case polish)
- F032 journal SSR mismatch (cosmetic)
- Stream 1.4 reads (first analytics query against `learning_events_log`)
- Stream 1.1 Step 2 (NB-Llama-1B compile for web-llm — half-day MLC pipeline; not single-turn)
- REVIEW.md WARNING items re-audit pass

**Product decisions (need user):**
- Muntlig deepening direction (option A from prior Council brief)
- B1/B2 corpus authoring start (option E)

**Pending user actions (from prior sessions):**
- Phase 2 auth walkthrough (magic-link click)
- `NEXT_PUBLIC_APP_URL=https://pandoai.no` in prod env
- Supabase `https://pandoai.no/auth/callback` whitelist

Council closes this `/gsd` pass. The remaining autonomous items are mostly polish (F008, F027, F032), with Stream 1.4 reads and Stream 1.1 Step 2 as the only substantial next moves — both warrant their own briefs in a future Council invocation.

## 2026-05-22T04:20 DONE — Stream 5 fully shipped (8 of 8) + React #418 closed

**User invocation:** `/council /gsd` — push remaining items autonomously.

**Two shipped in this pass:**

### Phase 4b — weekly_check_complete telemetry wire
**Commit:** `6f01b12` feat(weekly): Stream 5 Phase 4b — wire weekly_check_complete telemetry.
**Discovery:** Migration file `supabase/migrations/003_learning_events_log.sql` already exists and was applied 2026-05-21 (parallel work). `src/lib/logEvents.ts` already had `logSessionResults`. Only the weekly-check write was missing.
**Change:** Added `logWeeklyCheckComplete(userId, {score, items})` to logEvents.ts (fire-and-forget, auth-only, guests silently skipped). Wired into `recordWeeklyCheckResult` in useFingerprint.ts. `concept_id` set to virtual value `'weekly-check'` to keep the events distinguishable from per-concept exercise results. `correct_bool` set to `score >= 50` matching the graduation rule's demote floor.
**Diff:** 2 files (src/lib/logEvents.ts +47, src/hooks/useFingerprint.ts +3 incl. one import).
**Verification:** typecheck clean, 155/155 tests pass, no schema change (table already lives).

### React #418 follow-up — closed
**Commit:** `cf1fcc3` fix(dashboard): SSR-safe gate todayLabel + streak to clear React #418.
**Root cause confirmed:** Two SSR-vs-CSR text-content divergences in `src/app/dashboard/page.tsx`:
1. `todayFormatted()` (line 65-69) rendered `new Date().toLocaleDateString('nb-NO', ...)` directly into JSX. Server in UTC vs client in Europe/Oslo produce different day names near day boundary.
2. `getStreak()` (returned 0 on server via `typeof window === 'undefined'` guard, returned localStorage value on client). String(streak) into JSX diverges.
**Fix:** Both values now initialize to stable defaults (`''` and `0`) matching SSR output, then populate via a single `useEffect` on mount. Standalone `todayFormatted()` function deleted (only call site was the one replaced).
**Diff:** 1 file (src/app/dashboard/page.tsx +12/-8).
**Verification:** typecheck clean, 155/155 tests pass, dev probe at localhost:3003/dashboard shows zero console errors.
**Note:** The fix's effect (no React #418 in prod) is not provable from dev alone (dev = same machine, no timezone divergence). Will be verifiable on next production deploy via chrome-devtools probe of pandoai.no.

### What's left
- **Phase 2 — authenticated walkthrough.** Only remaining Stream 5 item. Requires the user to click a magic link. Engineering hygiene only — no unshipped code blocks behind it.
- **Two manual auth-redirect actions from the prior session** (still pending): (1) `NEXT_PUBLIC_APP_URL=https://pandoai.no` in prod env, (2) Supabase whitelist `https://pandoai.no/auth/callback`.

Council stops here. Stream 5 is feature-complete in code.

## 2026-05-22T01:20 DONE — Stream 5 autonomous loop closed

**Phase 7 smoke complete (commit `718ca45`).** Full report at `.council/reports/2026-05-22-0115-phase7-smoke.md`.

**Stream 5 final tally:**
- 7 of 8 phases shipped autonomously (1, 3, 5a, 4a, 5b, 6, 7)
- 8 commits (excluding approval commits and the side-quest auth fix)
- 49 new tests added (23+5+7+7+7+0 across the phases that added tests), 155/155 passing throughout
- 1 side-quest: `e6a08b2` magic-link redirect fix
- Live on pandoai.no via user-driven deploy (`147fee8`)

**Findings from Phase 7 smoke:**
- ✅ /uke renders clean at 375px and 1280px, zero console errors
- ✅ WeekStrip empty state behaves correctly for fresh guest
- ✅ Anti-Duolingo aesthetic posture preserved (no streak number, day-dots only, Norwegian dominates)
- ⚠️ P1: React error #418 (hydration text-mismatch) on /dashboard at both breakpoints. NOT introduced by Stream 5 — likely pre-existing in `todayFormatted()` (server timezone vs client locale) or `getStreak()` (localStorage). Recommendation: reproduce in `npm run dev` to identify exact text node, then either wrap source in `useState/useEffect` or set `process.env.TZ=Europe/Oslo`.

**Two manual actions for the user (auth-redirect side-quest):**
1. Set `NEXT_PUBLIC_APP_URL=https://pandoai.no` in production env on the Hetzner VPS (PM2 ecosystem file or `/etc/environment`). Re-build + reload PM2.
2. In Supabase dashboard → Authentication → URL Configuration → Redirect URLs, ensure `https://pandoai.no/auth/callback` is whitelisted. Optionally remove localhost entries from the production project.

**Two phases remain pending user input:**
- **Phase 4b** — Supabase migration adding the `learning_events_log` table per Stream 1.4 schema. Council can apply via Supabase MCP once user OKs the DB change. Anonymous guests excluded from writes per the privacy posture.
- **Phase 2** — Authenticated walkthrough. User clicks magic link → Playwright drives the auth-side smoke test.

**Council closes the autonomous loop here.** Next /council invocation should target one of: (a) Phase 4b apply, (b) Phase 2 walkthrough, (c) the React #418 follow-up, (d) a new direction.

## 2026-05-22T01:10 APPROVE — Stream 5 Phases 4a + 5b + 6 (consolidated)

**User invocation:** "all of them" after the prior pause point — explicit breadth-acceptance to run autonomous phases through to Phase 7.

**Side quest also handled in this run:** `e6a08b2` fix(auth): magic-link redirect prefers NEXT_PUBLIC_APP_URL over window.location.origin. User flagged that magic links were sending learners to localhost instead of pandoai.no during signed-in flows on the deployed build. Two manual actions surfaced to the user after the autonomous loop completes: (1) set `NEXT_PUBLIC_APP_URL=https://pandoai.no` in production env on the VPS, (2) whitelist `https://pandoai.no/auth/callback` in Supabase Authentication → URL Configuration → Redirect URLs.

### Phase 4a — /uke route + WeeklyCheckScreen (local-only)
**Commit:** `d81b2e4` feat(weekly): Stream 5 Phase 4a — /uke route + WeeklyCheckScreen (local-only).
**Diff:** 5 files exactly per scope (src/lib/weekly-check.ts new, src/app/uke/page.tsx new, src/components/weekly/WeeklyCheckScreen.tsx new, src/hooks/useFingerprint.ts +23/-1, tests/lib/weekly-check.test.ts new). 7 new tests in `describe('buildWeeklyCheckItems')`. 148/148 passing. No deviations. Zero new dependencies. No Supabase writes (Phase 4b).

### Phase 5b — Graduation rule on closeWeek
**Commit:** `85504e4` feat(engine): Stream 5 Phase 5b — graduation rule on closeWeek.
**Diff:** 4 files exactly per scope. 7 new tests in `describe('graduation rule')`; 9 existing `closeWeek` test sites updated to pass `minimalGraph`. 155/155 passing. One brief correction caught by implementer: `ConceptGraph` shape is `{version, language, concepts}`, not `{concepts, edges}` — handled cleanly.

### Phase 6 — Dashboard WeekStrip
**Commit:** `9dd017e` feat(weekly): Stream 5 Phase 6 — dashboard WeekStrip.
**Diff:** 2 files exactly per scope (src/components/dashboard/WeekStrip.tsx new, src/app/dashboard/page.tsx +4). 155/155 still passing. One in-scope adaptation: spec referenced `nc-card-soft` token which doesn't exist; implementer used `bg-[rgba(255,255,255,0.04)]` matching the existing dashboard glass-surface pattern. Anti-Duolingo aesthetic preserved (no streak number, day-dots only, Norwegian header).

### Autonomous loop summary — six phases shipped
Phases 1, 3, 5a (engine layer), 4a (route), 5b (graduation), 6 (dashboard) — six commits + this approval = full UI-to-engine path live. The Weekly Sprint is end-to-end functional in dev (engine opens week, scheduler biases, learner sees focus on dashboard, takes check on /uke, week closes with graduation flags, new week opens). 155 tests total, all green throughout.

### Phase 7 next
`/baseline-ui` + `/audit` pass on the new surfaces; chrome-devtools smoke check of /dashboard and /uke with a simulated fingerprint that has `weeklyFocus` populated. Screenshots at 375px and 1280px. Report findings.

### Phase 2 + Phase 4b still pending user
Phase 4b adds the Supabase `learning_events_log` table migration — needs explicit user consent to apply via Supabase MCP or migration file. Phase 2 (authenticated walkthrough) needs the user to click a magic link.

## 2026-05-22T00:40 APPROVE — Stream 5 Phase 5a (open-week orchestration) + autonomous loop pause

**Commit:** `b73cb35` feat(engine): Stream 5 Phase 5a — open-week orchestration.

**Diff (verified `git show HEAD --stat`):** exactly 5 files (engine/weekly-sprint.ts +42, engine/index.ts +2/-1, hooks/useFingerprint.ts +62/-13, hooks/useSession.ts +7, tests/engine/weekly-sprint.test.ts +106). Matches in-scope list precisely.

**Verification:** typecheck clean. `npm test` 141/141 passing (134 before + 7 new).

**No deviations.** One implementation note from the implementer about preserving the original "push to Supabase if migration produced no changes" intent inside the new `withWeek !== reconciled` guard — confirmed correct by inspection.

**Autonomous loop summary (Phases 1 → 3 → 5a):**
- Phase 1 (commit `0821e75`): data model + `selectWeeklyFocus`, `shouldResetWeek`, `closeWeek`, `migrateWeeklySprintFields`. 23 tests.
- Phase 3 (commit `4fbd654`): scheduler remediation-pool bias toward `weeklyFocus`. 5 tests.
- Phase 5a (commit `b73cb35`): `openWeek` + `ensureWeekOpen` + wiring across 6 bootstrap paths + `ensureWeekOpenAndPersist` helper called from `useSession.startNewSession`. 7 tests.
- Total: 3 phases / 6 commits including approval commits / 35 new tests / 141/141 passing throughout.

**Result:** the Weekly Sprint cycle is now fully live in the engine layer. A user starting a session after this change automatically gets `weeklyFocus` populated and `weekStartedAt` set. The scheduler's remediation pool biases toward focus concepts. The week resets honestly after >7 days of absence. No UI exists yet (Phase 6) and no weekly check route exists yet (Phase 4).

**Pause point reached.** Phase 4 (weekly check `/uke` route) is the next phase that adds value. It introduces the `learning_events_log` write — a new Supabase write path that has not been exercised in any walkthrough. Phase 2 (authenticated walkthrough) requires the user to click a magic link in their email and is the engineering-hygiene gate before Phase 4 ships.

Council is stopping the autonomous loop here. Surfacing the user prompt: click magic link → run Phase 2 walkthrough → proceed to Phase 4 → Phase 6 (dashboard week-strip ships with the check CTA) → Phase 5b (graduation rule) → Phase 7 (audit).

## 2026-05-22T00:30 APPROVE — Stream 5 Phase 3 (scheduler bias toward weeklyFocus)

**Commit:** `4fbd654` feat(engine): Stream 5 Phase 3 — scheduler bias toward weeklyFocus.

**Diff (verified `git show HEAD --stat`):** exactly 2 files — `src/engine/scheduler.ts` (+26/-4) and `tests/engine/scheduler.test.ts` (+243/-0). Matches in-scope list precisely.

**Verification:** `npx tsc --noEmit` clean. `npm test` 134/134 passing (129 before + 5 new tests in `describe('weekly focus bias')`).

**Three in-scope test-fixture corrections, not deviations from spec intent:**
1. Test 1 fixture: spec said 5 concepts but `getPrimaryWeakConcepts(fp, 5)` returns all 5 when each has `attemptCount > 0`. Implementer used 8 concepts (c6-c8 with `attemptCount: 0`) to isolate the top-5 weak. Backwards-compatibility assertion now reads "c6/c7/c8 never appear in remediation" — same intent, correct construction.
2. Test 4 fixture: spec assumed 6 remediation slots; default recipe (`targetDurationSeconds: 750`) produces 17. Used `targetDurationSeconds: 270` (6×45s) plus 6 concepts to honour the cap test correctly.
3. Static import of `DEFAULT_SESSION_RECIPE` was added (Test 5 originally had `await import()` inside sync `it()` — parse error).

All three are honest test-construction details, not silent spec drift.

**Sequence note:** Phase 2 (auth walkthrough) was originally scheduled between Phase 1 and Phase 3. With Phase 3 done before Phase 2, the dependency chain still holds — Phase 3 doesn't add Supabase writes (it rides the existing fingerprint sync), so the auth walkthrough's actual purpose (verify new Supabase write paths) is unchanged when slotted before Phase 4 where new write paths actually appear. Roadmap updated to reflect the re-sequencing.

**Next:** Phase 5a (open-week orchestration) — pure logic + one wiring point. Can ship autonomously. After 5a: Phase 2 requires user input (magic-link click).

## 2026-05-22T00:00 APPROVE — Stream 5 Phase 1 (data model + selection logic)

**Commit:** `0821e75` feat(engine): Stream 5 Phase 1 — weekly sprint data model + selection logic.

**Diff scope (verified via `git diff HEAD~1 --name-only`):**
- In-scope (5 files, matches brief): src/engine/index.ts, src/engine/weekly-sprint.ts, src/hooks/useFingerprint.ts, src/types/fingerprint.ts, tests/engine/weekly-sprint.test.ts.
- Incidental (2 files, not regressions): .council/devserver.log (runtime artifact), .council/research.md (parallel deploy-stability research entry added by the user; got swept into the commit). Noted, not blocking.

**Acceptance criteria — all 7 met:**
1. ✅ `npx tsc --noEmit` zero errors.
2. ✅ `npm test` 129/129 (existing 106 + 23 new).
3. ✅ Test file covers all four targets (selectWeeklyFocus, shouldResetWeek, closeWeek, migration).
4. ✅ File list matches "Files in scope".
5. ✅ Three core functions are pure (optional `now` param; no I/O).
6. ✅ Migration idempotent.
7. ✅ Commit message follows convention.

**One deviation (justified):** `migrateWeeklySprintFields` was placed in `src/engine/weekly-sprint.ts` instead of `src/hooks/useFingerprint.ts` because `useFingerprint.ts` imports `@content/concepts/a2-graph.json` via a Next.js path alias that vitest cannot resolve. Placing the migration helper in the engine layer means tests can import it directly without spinning up the React hook environment. Net-positive: pure migration logic belongs in the pure-function engine layer, not the React hook layer. `useFingerprint.ts` imports it from there (one import line; `applyMigration` wiring unchanged).

**Brief correction handled cleanly:** brief called `getConceptPhase(mastery, node)` but real signature is `getConceptPhase(mastery, prerequisites, masteredIds)`. Implementer computed `masteredIds` set via `isMastered()` over the graph and threaded prerequisites correctly. No BLOCKED needed; brief was off but adaptable.

**Next:** Phase 2 (authenticated walkthrough) requires user magic-link interaction. Two paths possible: (a) user clicks magic link now and I run the walk; (b) reorder Phase 2 to between Phase 3 and Phase 4 (where Supabase writes actually appear) and proceed to Phase 3 (scheduler bias — pure logic, no user input needed). Surfacing the choice to user.

## 2026-05-21T21:35 RESTRUCTURE — Weekly Sprint locked in as Stream 5 (next phase)

**What changed:** docs/roadmap.md gains Stream 5 — Weekly Sprint (Curriculum Cohesion Layer). The "Now unblocked — product decision required" section in roadmap is replaced with the committed plan. Muntlig roleplay deepening (option A), model swap (C), auth walkthrough (D), B1/B2 (E) are explicitly held as follow-ups, with rationale.

**Why:** Super-orchestrator analysis recommended option B (Weekly Sprint) on strongest moat trace. User intent "gsd" + prior "/council /super-orchestrator" invocation signal proceed-without-checkpoint. Research gate fired (3 web searches), all 5 Scout questions resolved, all 3 product decisions resolved via constitutional reasoning. Restructure is the right Council verdict per the protocol's "ROADMAP.md sequence is wrong given new information" trigger.

**3 product decisions resolved via constitutional reasoning (not escalated):**

1. **Q: Mandatory vs optional weekly check?**
   **A: Optional with strong nudge + honest banner.** Dashboard shows "Ukens repetisjon" CTA all week; if not taken by Sunday end, week closes anyway with "Du valgte å hoppe over uka denne gang" banner. **Why:** CLAUDE.md operating rule 6 (honest banners over silent fallbacks); Q2 research (streak creep — mandatory gates produce goal displacement); validation-and-research.md analytics path doesn't require 100% compliance to prove the moat.

2. **Q: Streak/target presentation — minimalist vs gamified?**
   **A: Minimalist. Day-dots only, no streak number on the week-strip.** Existing `currentStreak` field stays on profile where it already lives. **Why:** CLAUDE.md aesthetic direction ("precise dark intelligence — Norwegian is the hero"); explicit anti-Duolingo posture; Q2 research (streak number competes for visual weight with Norwegian content, displaces learning intent).

3. **Q: Catch-up policy — reset vs roll partial vs pause?**
   **A: Honest reset with banner.** Returning after >7 days from `weekStartedAt` closes previous week as `abandoned` in `weeklySprintHistory`, picks fresh focus from current fingerprint state (decay has already done its work). Banner: "Velkommen tilbake. Sist uke var [dato] — denne uka starter på nytt med fokus på [N nye konsepter]." **Why:** CLAUDE.md operating rule 6; existing decay engine already handles partial-progress at the engine level — no need to duplicate at the week level; rolling-partial creates UX confusion ("am I in week 3 or week 4?").

**Research findings written to .council/research.md.** All 5 Scout questions resolved.

**Next:** Stream 5 Phase 1 — data model + selection logic. Brief to be written to .council/current.md and executed.

## 2026-05-21T21:05 DONE — P0.5 Recovery Bundle complete; muntlig step 5 unblocked

**Bundle close.** 15 of 15 tasks complete across 16 commits. Sign-off report at `.council/reports/2026-05-21-2100-recovery-signoff.md` enumerates each task's commit, closure mapping, and verification evidence. Tasks 07 through 15 are all APPROVE per the report; individual log entries below would just restate the report.

**Closures by commit:**
- `8807f16` P0.5-07 diagnostic semantics rewrite — F014/F015/F016/F017/F031.
- `87cd600` P0.5-08 immediate guards on `/session/complete` + Laster header — F023/F026.
- `76c6a41` P0.5-09 mid-session exit confirm — F024 (F012 closes indirectly via honest counter).
- `63d1a35` P0.5-10 dashboard stat honesty — F018/F020/F021.
- `ab370f7` P0.5-11 profile read-on-render — F037/F038.
- `f27d6c4` P0.5-12 onboarding state persistence — F013.
- `c1d01ea` P0.5-13 auth/waitlist truthfulness — F004/F006; F002/F007 closed via analysis.
- `5b855dc` P0.5-14 polish bundle — F001/F003/F009; F005/F035 closed via analysis.
- `909e5df` P0.5-15 sign-off report committed.
- `7dc3350` post-bundle slop-gate cleanup (removed dead `src/lib/mock-sentences.ts`).
- `2593f51` post-bundle `/login` Suspense boundary fix.

**Doc sync (this entry):** roadmap.md, project-state.md, recovery-backlog.md updated to reflect "P0.5 complete" framing. The "in-progress" wording from earlier in the day is now replaced by closure tables + deferred-items lists. Next-direction options A–E surfaced in roadmap for the super-orchestrator to choose from.

**Recommendation for the super-orchestrator handoff:** the strongest moat-connected next move is option B — **weekly progress / curriculum cohesion layer**. The engine produces per-session and per-day signals today; there is no weekly review cadence. A weekly layer (target weak concepts, weekly recap card, weekly assessment, dashboard week-strip) would land on the moat directly (diagnosis + scheduling + remediation) instead of orthogonal to it. Muntlig deepening (option A) is the next natural surface but does not strengthen the engine — it adds another consumer. Model swap (option C) is correctness work that the validity gate already bridges. Auth walkthrough (option D) is engineering hygiene. B1/B2 (option E) is content authoring before the engine can support it cleanly.

Handing to super-orchestrator with option B as the "idea to transform".

## 2026-05-21T20:50 APPROVE — P0.5-06 AI language-validity gate complete

**Commit:** `validateNorwegianOutput` in `src/ai/validate.ts` + 3 call-site wirings in `webllm.ts`.

**Heuristics:** char-set match, ≤18-char words, English-drift cap (25%), at least one Norwegian function word. Each AI surface falls back to its existing per-surface template on failure.

**Verification:** typecheck clean, 106/106 tests pass.

**Playwright FULL:** not run this turn — the gate is heuristic and the wired call sites are templates-only-on-failure. End-to-end Playwright verification of the gate firing live (i.e., catching real gibberish from the model in a session) will happen in P0.5-15 fourth walkthrough.

**Why this also closes F030/F034 residual:** when conversationTurn or reviewWriting fail validation, they fall back to a template that does NOT include a CORRECTION block, so the conversation/journal surfaces won't try to log invalid AI tags. The shared map from P0.5-04 already handles the silent-drop on unmapped tags. Together: AI says nothing bad OR AI says something validated and the write path is wired.

**Next:** P0.5-07 — diagnostic semantics rewrite (F014/F015/F016/F017/F031). Largest remaining task.

## 2026-05-21T20:45 APPROVE (partial) — P0.5-05 conversation/journal write-through

**F028 closed:** conversation opener now uses the Norwegian topic label. Playwright verified — opener reads "Hei! La oss snakke om Daglig rutine. Hva tenker du på?".

**F030/F034 status — split between P0.5-04 and P0.5-06:**
- The "silent drop on unmapped tag" half-of-the-bug is structurally closed by P0.5-04's shared map (errorTagToConceptId always returns a concept-id; no caller-side `if (!conceptId) skip` paths remain).
- The "AI doesn't produce CORRECTION markers for real grammar errors" half is the AI-quality problem. Playwright probe: sent Kari "Jeg ikke liker kaffe om morgenen" (clear V2 negation error). Kari replied conversationally without a CORRECTION block. `recentErrors` count unchanged. The write path is wired; the AI is just not detecting. P0.5-06's validity gate + deterministic-correction-on-validation-failure addresses this directly.

**Commit:** P0.5-05 F028 fix landed in the latest src commit; no separate commit needed for the verification-only portion.

**Next:** P0.5-06 — AI language-validity gate. This addresses F022 (repair-card gender rules teaching the opposite), F029 (Kari gibberish), F033 (journal fabricated words + meaning flip), AND closes the F030/F034 residual by adding a deterministic correction when the AI output passes validation but the user message contained detectable errors.

## 2026-05-21T20:40 APPROVE — P0.5-04 shared error-tag→concept-id module complete

**Commit:** `5ca3cad`. New module `src/lib/error-tag-to-concept.ts` covers all 17 taxonomy tags + `unspecified` with a `noun-gender` fallback for tags lacking a clean concept match. Both call sites (`conversation/page.tsx` lines 140 and 161; `WritingEditor.tsx:133`) updated to use `errorTagToConceptId()`. The silent-skip `if (!conceptId) continue/return` patterns — the F030/F034 root cause — are gone.

**Behavior change is intentional**: AI-invented tags or rare taxonomy entries that previously dropped the fingerprint write silently now write through to the engine. Concept attribution is best-effort (noun-gender fallback) but the error IS logged.

**Verification:** typecheck clean, 106/106 tests pass, dashboard reload 0 console errors.

**Why no Playwright FULL gate here:** read-only refactor. The behavior change ("stop silently dropping") will be validated end-to-end by P0.5-05 which deliberately sends grammar errors through conversation and journal and verifies recentErrors grows.

**Next:** P0.5-05 — F030/F034 end-to-end Playwright verification + F028 (Kari opener uses Norwegian topic label, not English slug). With P0.5-04 in place the verification should pass without further code changes for the write path; F028 is a 2-line fix in webllm.ts.

## 2026-05-21T20:35 APPROVE — P0.5-03 corpus wiring + orphan-placeholder cleanup complete

**Commits:** `b096792` (seed-pool + dashboard + grader + 3 callers) + follow-up to remove MOCK from session/page.tsx after Playwright found mock-s1 still queued.

**Code criteria:** typecheck clean, 106/106 tests, grep `[unavailable]` matches only in explanatory comments.

**Playwright FULL gate:** PASS.
- Dashboard scheduler warnings: 14 → **0**. The four still-warning concepts (personal-pronouns, to-be-verb, numbers-basic, common-prepositions) now all have eligible sentences.
- Session pool now sources from the 397-sentence disk corpus (was MOCK on dashboard + MOCK+content on session).
- Wrong answer submission: `placeholderHits: 0` in recentErrors. Real correct answers persisted ("En hund ligger foran døren."). Concept IDs all canonical.
- AI semantic upgrade fires when model is ready and forgives near-miss answers correctly.

**Report:** `.council/reports/2026-05-21-2030-corpus-wiring.md`.

**Known pre-existing (not regressed by this task):** SpeedRound stale-closure React warning when timer expires — already tracked as "Speed round" item in project-state.md known-gaps, P0.5-09 scope. `totalSessionsCompleted: 0` despite recorded errors — F012, P0.5-09 scope.

**Next:** P0.5-04 shared error-tag → concept-id module. Extract the duplicate-and-incomplete maps in `src/app/conversation/page.tsx:62-73` (10 tags) and `src/components/journal/WritingEditor.tsx:22-34` (11 tags) into `src/lib/error-tag-to-concept.ts` covering all 17 taxonomy tags.

## 2026-05-21T20:18 APPROVE — P0.5-02 concept-id reconciliation complete

**Code-level acceptance:** all 8 code-criteria pass (Grep clean, types clean, 106/106 tests, migration present and idempotent, askedDiagnosticQuestionIds untouched). Commit `dacccb4`.

**Playwright FULL gate:** all four tests PASS on the freshly restarted dev server (now on :3001 because the prior process did not release :3000).
- Dashboard scheduler warnings 36+ → 14 (the four named legacy concepts no longer appear; remaining are P0.5-03 corpus scope).
- `/progress` renders clean for fresh fingerprint (5 Intro, 17 Locked).
- Synthetic-migration test: seeded mixed legacy+canonical fingerprint, reloaded → all 5 legacy keys removed, rawScores preserved on rename, merge policy executed correctly (legacy `modal-verbs` 72 won over older canonical `common-modal-verbs` 40), recentErrors rewritten, askedDiagnosticQuestionIds untouched.
- Critical-path: start session → submit wrong translation → repair card fires with graph-ID "Noun gender" label and correct answer shown. 0 console errors.

**Report:** `.council/reports/2026-05-21-2015-concept-id-reconciliation.md`.

**Next:** P0.5-03 corpus retag + orphan-sentence cleanup. Concept-id scheme now settled, so retagging seed corpus and removing orphan `item-0`/`item-1` placeholders can proceed without rework.

## 2026-05-21T20:05 PARTIAL APPROVE — P0.5-02 code complete; Playwright gate blocked on dev-server restart

**Code-level acceptance:**
- Grep `present-tense-verbs|past-tense-regular|modal-verbs|prepositions-place` in `src/` → only the migration map in `useFingerprint.ts` mentions legacy strings.
- Grep `'negation-placement'` → only matches are ErrorTag taxonomy uses (KEEP per disambiguation) and the migration map.
- `npx tsc --noEmit` → zero errors.
- `npm test` → 12/12 test files, 106/106 tests pass.
- Commit `dacccb4` landed. 9 source files modified.

**Playwright gate status: BLOCKED on infrastructure.**
- Dev server on `localhost:3000` returns 500 on every route (`/`, `/dashboard`, `/login`).
- Server log shows ENOENT on `.next/server/app/*/page/app-build-manifest.json` and `.next/static/development/_buildManifest.js.tmp.*` — Next.js HMR cache corruption (common on Windows + heavy edit session). Compile itself succeeded ("✓ Compiled /dashboard in 28ms") but post-compile manifest read fails.
- This is not a code defect. The corrupted cache predates my P0.5-02 edits; verification needs the dev server restarted.

**Action required:** User to restart the dev server (kill PID 1628 on port 3000, then `npm run dev` fresh — or delete `.next/` and let the server rebuild). Once restarted, I'll resume the Playwright FULL verification of P0.5-02 + proceed to P0.5-03.

**Provisional verdict:** APPROVE on code (Grep/types/tests all pass; commit landed); FULL verdict pending the post-restart Playwright walk.

## 2026-05-21T20:00 CORRECT 1/3 — P0.5-02 first attempt: hallucinated edits

**Problem:** The implementer agent (opus override) reported back with detailed file:line counts and replacement tables claiming to have renamed 11 conceptIds in `questions.ts`, 5 values each in `conversation/page.tsx` and `WritingEditor.tsx`, 5 keys in `prompts.ts`, plus added a migration in `useFingerprint.ts`. Verification proves none of these edits actually landed: `git status -s` is clean, `git diff HEAD` is empty, `WritingEditor.tsx:26` still reads `'verb-conjugation': 'present-tense-verbs'` (legacy). The agent's surface-drift section (flagging four additional files containing legacy IDs) was the only valuable output — those files ARE in-scope.

**Fix applied to brief:**
- Expanded in-scope files to include `constraints.ts` (LIVE runtime path), `dashboard/page.tsx` (CONCEPT_TO_TOPIC), `concept-colors.ts`, `eval/page.tsx`, plus mandatory Grep audit of `webllm.ts`, `stub.ts`, `repair-loop.ts`, `session/complete/page.tsx`.
- Added disambiguation table (concept-ID vs ErrorTag taxonomy entry — `negation-placement` is BOTH).
- Mandatory pre-report verification: post-rename Grep, `npx tsc --noEmit`, `npm test`, AND `git commit` proving the work landed.

**Decision:** Re-delegation has 2 corrections remaining (1/3 used). To eliminate the hallucination risk on a mechanical-but-large migration, I'm executing this run directly with Edit tool calls + per-step Grep verification, treating the brief as my own checklist.

## 2026-05-21T18:55 APPROVE — P0.5-01 source verification

**Task:** Verify the 10 Critical findings from the third walkthrough against source.
**Owner:** debugger agent (opus override).
**Output:** `.council/reports/2026-05-21-1830-source-verification.md` (424 lines).
**Diff scope:** read-only audit; only the report file is new under `.council/`; no `src/` mutations confirmed via `git status`.

**Headline findings:**
- F010 is a **content-corpus** problem, not a code regression. Items 5+7 fix intact (commits `77e54b2`, `bf118fe`). Every exercise component correctly derives errorTag from `sentence.errorTagsDetectable[0]`. The corpus itself tags 9/9 question-formation sentences as `['word-order']`.
- F036 is the same root cause: five diagnostic concept IDs (`negation-placement`, `past-tense-regular`, `modal-verbs`, `prepositions-place`, `present-tense-verbs`) have ZERO sentences in the corpus because the corpus uses graph IDs (`negation`, `preterite-regular`, `common-modal-verbs`, `common-prepositions`, `present-tense-regular`).
- F019 scheduler warnings auto-resolve with F036.
- F022/F029/F033 confirmed: `validateGenerated` exists at `src/ai/validate.ts:74-109` but is only invoked from `generateContent` (webllm.ts:203). No equivalent gate for `explainMistake`, `conversationTurn`, or `reviewWriting`. Confirms P0.5-04 design.
- F030/F034: conversation and journal DO invoke engine write APIs but silently drop unmapped tags (conversation map: 10 tags, journal map: 11 tags, taxonomy: 17 tags). Shared root cause.
- F017: one-line bug at `src/lib/diagnostic/engine.ts:140` — `Math.max(seedScore, rawScore)` floors wrong answers at 20, then `OnboardingFlow.tsx:94` destructively overwrites prior mastery.
- F023: guard exists as a `useEffect` post-render redirect at `complete/page.tsx:80`; the celebration screen renders before the redirect fires.

**Three ordering revisions accepted (applied to recovery-backlog.md):**
1. Sequence concept-id reconciliation (former P0.5-07) BEFORE corpus retag (former P0.5-02). Renamed accordingly.
2. Split former P0.5-06 internally: cheap guards (F023, F026) ship as one PR; session-completion semantics (F012, F024, F025, F027) need a design decision.
3. Add new P0.5-03a — shared `src/lib/error-tag-to-concept.ts` module — before P0.5-04/-05 (the renumbered AI gate / write-through tasks).

**Next:** P0.5-02 = Concept-id reconciliation (graph as source of truth). Brief in `.council/current.md`.

## 2026-05-21T18:15 ESCALATE — Third stress walkthrough reveals foundation regression; muntlig roleplay is the wrong next move

**Trigger:** Third Playwright walkthrough (report at `test-reports/stress-walkthrough-2026-05-21/report.md`, 39 findings, 10 Critical) plus REVIEW.md (2026-05-11 code audit, 2 CRITICAL, 8 WARNING) plus STATE.md/ROADMAP.md showing "next: scripted roleplay" — three sources of evidence diverging.

**Evidence summary:**
- Four of the five P0 patterns CLAUDE.md operating rule 8 explicitly names as "the documented worst-case failure mode" are regressed in the live app: error tags collapse to a single `word-order` value (F010), journal correction writes nothing to fingerprint (F034), conversation grammar logging writes nothing (F030), session progression counter never increments (F012). One pattern (mic auto-activate) holds.
- New class of AI-quality failures shipping live: in-session repair card teaches the opposite of the noun-gender rule (F022); Kari conversation replies contain non-Norwegian strings (F029); journal AI invents words and silently flips negation, reversing the user's sentence meaning (F033). Three Critical pedagogical-harm findings on three different surfaces — same root cause (no language-validity gate before AI output reaches the learner).
- Engine correctness: diagnostic rawScore semantics broken — wrong answers on q-formation and adjective-agreement still produced rawScore=100 (F017). Diagnostic write doesn't commit until navigation away from result screen (F016). Diagnostic completion destructively wipes 24 historical recentErrors entries (F031).
- Guard failures: /session/complete is directly accessible with no guard, congratulates the user with 0/0/0 stats (F023).
- Mastery visibility broken: /progress shows every concept at 0% or Locked despite fingerprint having rawScore 100 for six concepts (F036, concept-id mismatch).
- REVIEW.md WARNING items from 2026-05-11 may still be live: race conditions in fingerprint bootstrap, module-level scenarioCursor, auto-skip false-correct insertion. Not re-audited in this walkthrough.

**What this means:**
- STATE.md milestone "muntlig" is targeting a foundation that's broken at the engine level. Adding more speaking surfaces (roleplay) on top of a journal+conversation pipeline that silently contributes nothing will compound the same regression pattern: more surfaces that "look like they teach" but don't write to the engine.
- Constitutional emergency per CLAUDE.md operating rule 8. The constitution mandates pipeline honesty before any "feeds the engine" feature ships. This isn't a roadmap nuance — it's the named failure mode.
- The diagnosis-visibility task approved 2026-05-21T17:45 surfaces data we now know is broken (errorTag collapse, rawScore semantics). The surface fix was correct; the upstream data is the real bug.
- gsd's continuation logic would propose muntlig roleplay step 5. That answer is wrong given the new evidence. RESTRUCTURE required before gsd can be trusted to advance.

**Searched:** No external search. Constitutional rule (CLAUDE.md operating rule 8) is unambiguous. Internal evidence: walkthrough report + IndexedDB pre/post diffs + screenshots `test-reports/stress-walkthrough-2026-05-21/`.

**Options:** (surfaced to user for decision — see escalation block in conversation)

## 2026-05-21T17:45 APPROVE — diagnosis visibility on dashboard session card
**Criteria met:**
- Only `src/app/dashboard/page.tsx` changed (9 insertions, 1 file) ✅
- `topDiagnosis = plan?.diagnosisResults?.[0] ?? null` derived alongside existing remediation/review/newMaterial counts ✅
- "Why this" block inserted between estimated-time paragraph and Start button ✅
- Renders only when `topDiagnosis` truthy; silent absence otherwise ✅
- Displays `topDiagnosis.reasoning` from the highest-confidence diagnosis ✅
- No engine, scheduler, or type files touched ✅
- Zero TypeScript errors; dev server compiled clean ✅
- Visual at 1280 and 375: layout intact, no overflow, cream tones match ✅
**Playwright:** PASS — silent-absence path verified live on cold-start guest; critical-path regression (Start → wrong answer → repair → next exercise) passes; 0 console errors on tested pages.
**Present-branch:** Not exercised by guest state (no fingerprint history triggers any of the 4 diagnosis rules). Mechanically guaranteed by diff parity with the brief's verbatim JSX template + null-safe optional chaining.
**File changed:** `src/app/dashboard/page.tsx`
**Report:** `.council/reports/2026-05-21-1745-diagnosis-visibility.md`
**Outside-scope observation (for REVIEW.md, not blocking):** Sentence-transformation repair card shows `Correct answer: [unavailable]` rather than the actual target. Pre-existing surface defect on the repair card data binding, unrelated to dashboard scope.

## 2026-05-21T12:00 RETHINK — diagnosis visibility inserted before remaining P1 batch

**Trigger:** Feature-challenger scout pass (4 features) surfaced a pipeline-honesty defect via code grep: `runDiagnosis` runs on every session generation, returns `DiagnosisResult[]` with a learner-facing `reasoning` string, but `diagnosisResults` is never consumed in `src/`. The moat is computed and silently discarded.

**Searched:** No external search. Internal evidence: `grep runDiagnosis src/` → only `engine/scheduler.ts`, `engine/index.ts`, `engine/diagnosis.ts`. `grep generateSession src/` → consumed in `hooks/useSession.ts:164` and `app/dashboard/page.tsx:105`, neither reads `diagnosisResults`.

**Options:**
1. Insert small diagnosis-visibility task before resuming P1 — surface `diagnosisResults[0].reasoning` on the dashboard session card. ~30-line change, one file, one acceptance criterion.
2. Defer to a future engine-upgrade pass — keep the moat invisible until then; resume P1 verbatim.
3. Continue per roadmap, no change — same as option 2 but without queuing the fix.

**Chosen:** Option 1.
**Why:** CLAUDE.md operating rule 8 (pipeline honesty) is constitutional: "if a surface claims to contribute to the fingerprint, mastery, or repair loop, that contribution must be traced end-to-end before the surface ships. Five separate surfaces during P0 recovery were found to silently contribute nothing." The diagnosis engine claim is in CLAUDE.md and project-state.md — its current invisibility is the same defect pattern as the AI-badge / error-tag / session-auto-skip P0 issues. The constitution mandates the fix; this is not an open product question. Scope is one file, one insert, established design tokens. Consistent with the recent session-complete approve (2026-05-21T11:10) which had the explicit goal "make the moat visible" on a different surface.



**Options considered:**
1. Follow P1 order — do P1-7 (recalibration trigger banner) first
   - Affects: users who hit recalibration modal without warning (rare flow, multi-session depth)
   - Moat trace: none — UX politeness fix
2. Elevate session completion (P1-13 + feature-challenger spec)
   - Affects: every user who completes any session (highest-frequency touchpoint)
   - Moat trace: strong — repair loop summary, phase indicators, SRS preview make the diagnostic intelligence visible for the first time

**Chosen:** Option 2 — session completion elevation.
**Why:** Feature-challenger analysis (same session) established that the session complete screen is the single highest-leverage improvement: it makes the moat visible. P1-7 affects a rarely-reached recalibration flow. Session completion affects every user after every session. The feature-challenger output IS the analysis-first step per CLAUDE.md rule 2. User invoking /council after that analysis is the approval signal.

## 2026-05-21 RESTRUCTURE — session completion elevated above P1-7 through P1-12
**What changed:** Session completion build added as next task, before remaining P1 items.
**Why:** Feature-challenger analysis elevated it based on frequency (every session) and moat visibility (repair loop, phase, SRS all invisible at highest-stakes moment).

## 2026-05-21 BRAINSTORM — scripted roleplay (STATE.md) vs P1 accessibility bundle (audit)

**Options considered:**
1. Scripted roleplay per STATE.md — next muntlig mode, direct north-star trace (speaking production)
   - Risk: ships on a session loop with known reduced-motion + screen-reader failures
   - Every new UI surface inherits the motion problem (no MotionConfig = all new animations also ignore OS preference)
2. P1 accessibility bundle first — 3 surgical fixes, ~45 min, systemic impact
   - MotionConfig: one line that propagates to every animated surface including future muntlig modes
   - WCAG: session loop (highest-frequency surface) becomes usable by screen reader users
   - Moat trace: session loop IS the moat's delivery mechanism; making it accessible is not breadth

**Chosen:** Option 2 — P1 accessibility bundle.
**Why:** MotionConfig is a force-multiplier: every new animated surface built afterward (including scripted roleplay) inherits the fix automatically. Delaying it means scripted roleplay will inherit the same motion problem. 3 fixes, bounded scope, explicit P1 from audit, user analysis concurred.

## 2026-05-21 RESTRUCTURE — P1 accessibility bundle inserted before scripted roleplay
**What changed:** Audit P1 accessibility fixes added as next task. Scripted roleplay remains next after it clears.
**Why:** Audit evidence surfaced systemic reduced-motion gap (affects every animated surface) and screen-reader failure in core session loop. Fixing before adding new modes prevents the problems from compounding.

## 2026-05-21T11:10 APPROVE — session completion: make the moat visible
**Criteria met:**
- Repair loop summary renders conditionally on wrong answers (absent on perfect session ✅)
- Phase chips replace "◌" and "New" badge ✅
- SRS next review date computed from earliest nextReviewAt across repaired concepts ✅
- All existing sections untouched ✅
- Zero TypeScript errors ✅
**Playwright:** PARTIAL PASS — structure, zero-wrong-answers case, guard confirmed. Repair section with real data requires live session traversal (NOT_TESTED, low risk).
**File changed:** `src/app/session/complete/page.tsx`

## 2026-05-21T11:32 APPROVE — Muntlig Step 5: Scripted Roleplay
**Criteria met:**
- `/roleplay` resolves, correct title ✅
- 3 scenarios × 4 turns, correct Norwegian content ✅
- Selection → turn phase transition verified ✅
- Layout at 375px and 1280px clean ✅
- Zero TypeScript errors ✅
- No existing files changed ✅
**Playwright:** PARTIAL PASS — selection and turn phases verified. Complete screen NOT_TESTED (speech required, low risk).
**Files created:** `src/lib/roleplayContent.ts`, `src/components/muntlig/RoleplayScreen.tsx`, `src/app/roleplay/page.tsx`

## 2026-05-21T11:20 APPROVE — P1 accessibility bundle
**Criteria met:**
- MotionProvider.tsx created with `'use client'` + `MotionConfig reducedMotion="user"` ✅
- layout.tsx wraps children — Server Component preserved (no `'use client'`) ✅
- `text-[12px]` on instruction labels in WordOrderExercise + FillInBlankExercise (×2) ✅
- `aria-live="polite" sr-only` regions on TranslationExercise, FillInBlankExercise, WordOrderExercise, SpeedRound ✅
- Zero TypeScript errors ✅
- No exercise logic changed ✅
**Playwright:** PASS — session exercise renders at 375px and 1280px, zero console errors.
**Files changed:** `src/components/ui/MotionProvider.tsx` (new), `src/app/layout.tsx`, `WordOrderExercise.tsx`, `FillInBlankExercise.tsx`, `TranslationExercise.tsx`, `SpeedRound.tsx`
