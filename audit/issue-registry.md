# NorskCoach — Issue Registry (Phase 5 triage)

> Audit 2026-06-22 · HEAD `a72f7b7`. Sources: 5 parallel read-only cluster agents + own corpus/grader verification. Status: verified / likely / suspected / unverifiable-statically.
> Severity: **Critical** (blocks core learning / makes correct behavior impossible) · **High** (damages trust, progress accuracy, or session completion) · **Medium** (confusing/misleading but recoverable) · **Low** (polish/copy/minor UX).

## CRITICAL

### A-01 · B2 fill-in-blank is systematically unwinnable (`notes` overloaded as answer + explanation) — **✅ RESOLVED 2026-06-22 (uncommitted)**
> **Fix:** migrated all 182 B2 fill-in-blank `notes` to the bare answer (text before the em-dash), restoring the A1/A2/B1 convention; embedded `/` alternatives (e.g. `måtte/ville`) split into `accepted_answers`. Grader/component unchanged (both already read `notes`). CI gate added to `tests/content/fill-in-blank-integrity.test.ts` ("no fill-in-blank notes is annotation-shaped"). `audit:gate` AUDIT-CLEAN, 812 tests. Explanations recoverable from git history if ever wanted.

- **Route/feature:** `/session` fill-in-blank, B2. **Layer:** content/schema + grader contract.
- **Repro:** Any B2 fill-in-blank. Type the correct blank word (e.g. `forbedrer`). Grader expects `notes` verbatim = `"forbedrer — V2 rule after fronted adverbial 'ifølge flere studier'"` → marked wrong.
- **Expected:** correct word graded correct. **Actual:** correct word marked wrong, phantom `word-order`/concept error logged, SRS reset to 0, diagnosis fingerprint poisoned.
- **Evidence (own verification):** `deriveCorrectAnswer` fill-in-blank → `notes ?? ''` (grade-utils.ts:21-22). Corpus count: A1 0/121, A2 0/103, B1 0/149, **B2 182/184** fill-in-blank notes are `answer — explanation` shaped (`content/sentences/b2.json`). `tests/content/fill-in-blank-integrity.test.ts:25-33` only asserts notes non-empty → never caught it.
- **Contract A:** `notes` = "internal authoring note" (content.ts:19). **Contract B:** grader treats `notes` as the literal answer (grade-utils.ts:22, FillInBlankExercise.tsx:176). Author used it for both.
- **Risks:** data integrity ⚠️⚠️ · learner trust ⚠️⚠️ · progression ⚠️⚠️ · product honesty (Rule 6/8, VC §3.1) ⚠️⚠️.
- **Scheduling note:** fill-in-blank is in B2 CORE allowed types (level-contract.ts:118); 184 sentences exist → reachable. Exact live frequency: unverified (runtime).
- **Test:** fixture/CI — assert no fill-in-blank `notes` contains `—`/`–`/`"`/`;` or >3 tokens; unit — `checkAnswer(leadingToken, notes)` true for every fill-in-blank sentence.

## HIGH

### S-01 · Repair RETRY (and any exercise) on AI-GENERATED content freezes — grader returns null — **✅ RESOLVED 2026-06-22 (uncommitted)**
> **Fix:** `gradeAnswer` now accepts an optional `fallbackContent`; the 3 server-graded components (Translation/Listening/SpeedRound) pass the resolved content they already hold when `sentence.source === 'generated'`. Id-resolution is still tried first, so **seed grading is unchanged**; this only rescues ids that resolve nowhere. `classifyError`/`POS_MAP` stay server-side (no client-bundle bloat). The answer key already ships to the client in the session content map, so passing it back leaks nothing. +3 tests (`tests/engine/grade-fallback.test.ts`: generated grades, wrong stays wrong, F011 null guard preserved). tsc clean, `audit:gate` AUDIT-CLEAN. **Design note:** evidence showed the line-84 "answer not exposed to client" rationale was already void (the full sentence map incl. `norwegian` ships to the browser) — so a future simplification could unify all grading client-side, but the conservative fallback approach changes nothing about the working seed path.

- **Route:** `/session` repair retry, when the failed item was AI top-up content (or any generated id). **Layer:** grader↔content-resolution boundary.
- **Repro:** Fail a generated-content item → repair → "Prøv igjen". Retry re-presents the same generated sentence (cache pre-seeded, useSession.ts:381-387) but grades via `gradeAnswer(sentence.id)` which resolves ids only against local JSON / Supabase (actions.ts:28-68) → generated id in neither → `null`.
- **Expected:** retry grades + advances. **Actual:** `graded===null` → exercise resets `submitted=false`, no feedback, no advance, answer silently dropped (TranslationExercise.tsx:87-93). Session soft-traps on the retry; only escape is exit X.
- **Note:** this is the live re-incarnation of QA-3d for the AI path. The SEED path is genuinely fixed (re-presents exact failed sentence). Also affects any normal exercise on generated content, not just retry.
- **Risks:** progression ⚠️⚠️ · learner trust ⚠️⚠️ · AI reliability ⚠️.
- **Test:** integration — cache a generated id absent from corpus, drive wrong→repair→retry, assert grader null surfaces an honest fallback (currently none).

### G-02 · SpeedRound is EN-graded with NO recourse and 0 accepted_answers — **✅ RESOLVED 2026-06-22 (uncommitted, also closes S-02)**
> **Fix (non-punitive speed-round):** a speed-round MISS no longer triggers the repair loop or resets SRS or logs a fingerprint error — speed-round is rapid recall graded by brittle exact-match English, so a "wrong" is unreliable (valid paraphrase / speed typo / empty timeout). `submitResult` exempts `exerciseType==='speed-round' && !correct` from `recordFingerprintResult` + repair, and advances. The component reveals the canonical answer ("Riktig svar: …") with a "Neste" button instead of relying on the repair loop; correct answers still brick + advance immediately. Closes **S-02** (empty-timeout punishment) by the same change. Visual-QA'd at 4 widths (real SpeedRound driven to the reveal state → `.claude/screenshots/qa-recourse/speedround-*.png`). tsc clean, `audit:gate` AUDIT-CLEAN. Recommended test (regression-checklist §C): hook-level — a speed-round miss does not enter repair / does not reset SRS.

- **Route:** `/session` speed-round. **Layer:** component (recourse parity gap).
- **Repro:** Valid English paraphrase under the timer → hard-wrong; no self-attest path (translation has one, SpeedRound.tsx:47-72 vs TranslationExercise.tsx:106-116).
- **Expected:** paraphrase accepted or recourse offered. **Actual:** marked wrong + phantom error + SRS reset, worsened by time pressure. B1/B2 EN-graded sentences have 0 accepted_answers.
- **Risks:** learner trust ⚠️⚠️ · data integrity ⚠️ · same lie the translate-EN recourse (0a99780) was built to fix, still live here.
- **Test:** e2e — speed-round paraphrase asserts a recourse affordance OR exclude EN-grading where no accepted_answers exist.

### R-01 · Muntlig lanes (`/listen`, `/drills`, `/shadow`) are orphaned — no in-app entry point — **✅ RESOLVED 2026-06-22 (uncommitted)**
> **Fix:** added a "Muntlig" sub-panel to the dashboard, rendering `LaneTrackRow` for `MUNTLIG_LANES` (Lytt→/listen, Uttale→/drills, Skygging→/shadow) with their hints + done-state. Placed INSIDE the "Mer øving og status" disclosure (not the hero) so the T1.1 conductor IA stays intact; supplementary, so NOT folded into the daily denominator. CLAUDE.md's "Muntlig section links to all three" claim is now TRUE. Visual-QA'd at 375/768/1280/1920 (throwaway qa-muntlig route mounting the real LaneTrackRow on the real cream/dark surfaces → `.claude/screenshots/qa-recourse/muntlig-*.png` → route deleted + .next cleared). tsc clean, `audit:gate` AUDIT-CLEAN. Recommended follow-up test (regression-checklist §F): e2e asserting the dashboard DOM links each muntlig route.

- **Route:** dashboard. **Layer:** dashboard composition. **Cosmetic-or-real:** real — 3 built, fingerprint-feeding surfaces unreachable.
- **Repro:** Inspect dashboard; `CORE_LANES` (lane-completion.ts:61) omits `MUNTLIG_LANES` (:62). Grep: no `/listen|/drills|/shadow` href in `src/`.
- **Expected (per CLAUDE.md):** "Dashboard Muntlig section links to all three." **Actual:** no Muntlig section; URL-only access.
- **Risks:** product honesty (doc drift) ⚠️ · North-Star (speaking) capability silently lost ⚠️⚠️.
- **Test:** assert dashboard DOM links each of `/listen`, `/drills`, `/shadow` (or document as removed).

## MEDIUM

### D-01 · Onboarding seed write not awaited before navigation → level-persistence race — **likely**
- **Route:** `/onboarding` → `/dashboard`/`/session`. **Layer:** state/persistence.
- **Repro:** Fast click "Start første økt" after diagnostic. Seed is fire-and-forget (OnboardingFlow.tsx:222-225); `commit()` navigates without awaiting (:227-233); destination `useFingerprint` bootstrap unconditionally reloads from IndexedDB (useFingerprint.ts:254-263) → if `saveFingerprint` hasn't flushed, store clobbered to pre-seed fp or A1.
- **Expected:** dashboard shows diagnostic level (e.g. B1). **Actual:** under a fast click, can reset to A1 + lose seeded mastery. Usually masked by ReadyStep dwell.
- **Risks:** data integrity ⚠️⚠️ · progression ⚠️.
- **Test:** integration — defer `saveFingerprint`, run seed then mount `useFingerprint`, assert level = diagnostic level not A1. Fix: await seed before push, or skip bootstrap reload when store already holds this user's fp.

### S-02 · SpeedRound timeout submits empty answer → full repair loop + SRS reset — **✅ RESOLVED 2026-06-22 (closed with G-02)**
- **Route:** `/session` speed-round. **Layer:** UI/engine (classify-error on empty).
- **Repro:** Let timer hit 0 → `submitAnswer('')` (SpeedRound.tsx:37) → graded wrong → repair loop + error logged with `userAnswer:''` + SRS reset.
- **Expected:** a timeout is not the same evidence as a wrong attempt. **Actual:** phantom-quality error feeds diagnosis, resets SRS.
- **Risks:** data integrity ⚠️ · progression ⚠️. **Test:** unit — `classifyError('',…)` low-confidence; integration — timeout shouldn't reset SRS like a deliberate wrong answer.

### S-03 · Repair injection cap silently swallows repair items (incl. retry) — **verified**
- **Route:** `/session`, error-heavy late session. **Layer:** store/engine. **Honesty (Rule 6).**
- **Repro:** Items at cap (`originalItemCount*2`, session-store.ts:53-57) → `injectRepairItems` no-ops → `continueAfterRepair` still advances (useSession.ts:396-397). Explanation promised a drill+retry that never renders.
- **Risks:** product honesty ⚠️ · progression ⚠️. **Test:** unit — at cap no items added; integration — capped repair still SRS-schedules the concept (defer, don't lose) + surfaces a note.

### S-04 · NotYetAvailable "skip" records `correct=true` → inflates accuracy / lays a brick — **verified**
- **Route:** `/session` phantom-type or unresolved-cloze skip. **Layer:** UI/engine. **Honesty.**
- **Repro:** Skip button emits `correct:true` (ExerciseCard.tsx:65-73) → counted in accuracy + production count (complete/page.tsx:108-109).
- **Expected:** a skipped/never-attempted item is neutral. **Actual:** counted correct.
- **Risks:** data integrity ⚠️ · product honesty ⚠️. **Test:** unit — phantom-skip excluded from accuracy/mastery (carry a `skipped` flag).

### S-05 · Unresolved item → indefinite LoadingSkeleton (soft stall) — **verified**
- **Route:** `/session`, item whose seed pool is empty (all passed / AI not ready / no at-or-below content) and not a cloze. **Layer:** UI/engine.
- **Repro:** `resolveItem` caches nothing (useSession.ts:218 only sets when picked exists) → `SessionScreen` renders skeleton forever (gate `!!currentContent`). 3s auto-skip was deliberately removed (useSession.ts:479-484). Only escape: exit X (loses session).
- **Expected:** honest per-item skip. **Actual:** dead-end for that session. **Risks:** progression ⚠️ · product honesty ⚠️. **Test:** integration — empty seed pool eventually offers honest skip, no positive write.

### AI-01 · Journal "Rettet versjon" displays ALL unverified AI corrections as authoritative — **verified**
- **Route:** `/journal`. **Layer:** display vs gate. **Honesty/trust.**
- **Repro:** `buildCorrectedText` applies every AI `err.correct` to the shown corrected text (WritingEditor.tsx:20-40), independent of the `confirmedRepair` mastery gate (:182-184). A wrong-but-valid correction (e.g. Groq `en jobb→et jobb`) is woven into the shown "Rettet versjon" as truth even though the gate rejects it for mastery.
- **Expected:** corrected text shouldn't assert unverified corrections as fact. **Actual:** show-don't-grade holds for mastery but not for the displayed corrected text → praise/corrected-text can disagree with what moved mastery.
- **Risks:** learner trust ⚠️ · AI safety ⚠️. **Test:** unit — a wrong-but-valid gender correction is NOT silently woven into `correctedText` without a caveat.

### E-01 · `/eval` AI-quality harness ships to production with NO guard — **verified**
- **Route:** `/eval`. **Layer:** routing/ops. **Cost/abuse.**
- **Repro:** No `NODE_ENV`/flag guard (eval/page.tsx); publicly reachable at `pandoai.no/eval`; runs 24 tasks × 3 against the live AI → an unauthenticated visitor can drive real Groq API spend + force on-device model download.
- **Risks:** AI cost/abuse ⚠️⚠️. **Test:** prod build — `GET /eval` 404s/redirects.

### R-02 · `/reading` silently serves A1/A2 to B1/B2 on direct visit (no banner) — **verified**
- **Route:** `/reading`. **Layer:** content/UI. **Honesty (Rule 6).**
- **Repro:** `SEED_TEXTS` is A1/A2 only; filter pills hardcoded `['all','A1','A2']` (reading/page.tsx:139). A B1/B2 learner hitting `/reading` directly gets A1/A2 with no disclosure. Mitigated for lane users (dashboard reroutes Les→/skriv at B1/B2).
- **Risks:** product honesty ⚠️ — the one learning surface that still silently substitutes below-level. **Test:** mount `/reading` with B1 fingerprint → B1 texts or a below-level banner.

### G-03 · Translate-EN accepted_answers coverage ~6% (B1/B2 = 0) → constant recourse friction — **verified**
- **Route:** `/session` translation-to-english. **Layer:** content coverage.
- **Detail:** EN-graded with accepted_answers: A1 16/99, A2 8/114, B1 0/34, B2 0/133 → 24/380 (~6%). Recourse (0a99780) means correctness isn't *lied* about, but B1/B2 path is "exact-match fail → self-attest every time" → trains reflexive "Ja", records everything at half mastery weight → muddy mastery signal.
- **Risks:** data integrity (muddy signal) ⚠️ · learner friction ⚠️. **Test:** coverage WARN when an EN-graded B1/B2 sentence has no accepted_answers.

### G-05 · Word-order grades single canonical order; B1/B2 acceptedOrders = 0 — **verified**
- **Route:** `/session` word-order. **Layer:** content coverage.
- **Detail:** `acceptedOrders` populated on 10/298 (A1 6, A2 4, B1 0, B2 0). Valid V2 fronting variants marked wrong → phantom error + SRS reset. Grader is sound (word-order.ts:19-33); slash-key corruption IS fixed (no `/` in corpus, tile split on space). Residual = `acceptedOrders` population (CLAUDE.md "deferred").
- **Risks:** data integrity ⚠️ · learner trust ⚠️. **Test:** WARN gate for multi-clause B1/B2 word-order with no acceptedOrders.

### R-05 · Accessibility — interactive non-button elements without keyboard/labels — **verified**
- `/reading` word `<span onClick>` (reading/page.tsx:257-264): no role/tabIndex/keyboard handler. `/` landing text-fallback submit button label `→` only (page.tsx:610-616), no aria-label. **Risks:** accessibility ⚠️⚠️. **Test:** axe/Lighthouse a11y on `/`, `/reading`; every interactive control needs an accessible name + keyboard operability.

## LOW

| ID | Issue | Route | Status | Evidence |
|---|---|---|---|---|
| G-04 | Supabase grade fallback drops `acceptedAnswers`/`acceptedOrders` → valid paraphrase rejected on Supabase-sourced sentences | /session | verified | actions.ts:41,45-56 |
| G-06 | A2 `Lars'` genitive apostrophe unmatchable without `'` | /session FIB | verified | answer.ts:7-14; 1 corpus row |
| D-02 | `/conversation` `level` snapshots non-reactive store → 1-frame A1 flash (self-heals) | /conversation | verified | conversation/page.tsx:90,122-125 |
| AI-02 | `convSource` null→green "Sky" chip before first turn resolves | /conversation | likely | conversation/page.tsx:98,528-538 |
| AI-03 | Server A1/A2 explanation returns raw Groq text un-validated | /api/ai | verified | route.ts:83-88 |
| AI-04 | Rate limiter per-instance + IP-keyed on spoofable header | /api/ai | verified | route.ts:22-42,238 |
| R-03 | `/reading` word-tap = cosmetic dead-end ("Ordoppslag kommer snart" on every word) | /reading | verified | reading/page.tsx:257-264,303 |
| R-04 | `/analytics` orphaned (no in-app link) | /analytics | verified | grep clean |
| R-06 | `/login?error=auth_failed` copy says "lenke" but auth is OTP | /login | likely | login/page.tsx:24-27 |
| R-07 | `/ord` no below-level gate for direct non-B2 visitor | /ord | suspected | dashboard:221 (gate only at link level) |
| S-06 | Latent: retry `retryExerciseType` vs pre-seeded content-shape coupling | /session | suspected | repair-loop.ts:90-92; useSession.ts:383 |
| S-07 | Cloze repair uses generic micro-drills, not the failed passage (design asymmetry) | /session cloze | verified | useSession.ts:432-442 |

## CONFIRMED-FIXED / NOT-REPRODUCED (re-verified hypotheses — do NOT re-report as new)

| Reported issue | Verdict | Evidence |
|---|---|---|
| Translate-EN compares English input vs Norwegian source | **FALSE** | grade-utils.ts:17-19 returns `english` |
| Translate-EN marks valid answers wrong (no recourse) | **MITIGATED** — recourse self-attest shipped (0a99780); residual = coverage (G-03) | TranslationExercise.tsx:112-116 |
| Diagnostic explanation describes the NEXT question (off-by-one) | **NOT REPRODUCED** — frozen `answeredQuestion` | DiagnosticQuiz.tsx:77,107,244 |
| Diagnostic level doesn't persist | **MOSTLY OK** — real race exists (D-01), common path fine | OnboardingFlow.tsx:160-161 |
| Dashboard/profile/progress SSR/client level mismatch | **NOT REPRODUCED** — all client components, loading-guarded | dashboard/profile/progress page.tsx:1 |
| Blank exercises render / auto-skip / trap | **NO auto-skip** (removed); honest banners; soft-stall + skip=correct are the real residuals (S-04, S-05) | ExerciseCard.tsx:106-133; useSession.ts:479-484 |
| Repair retry SKIPS the failed question | **SEED path FIXED** (re-presents exact sentence); generated path freezes (S-01) | repair-loop.ts:144; useSession.ts:381-384 |
| Repair micro-drills serve phantom types | **FIXED** (930df13) | repair-loop.ts:81-85 |
| WebLLM null/gibberish breaks AI feedback | **REFUTED** — fallbacks everywhere; local 1B explain gated off (3dd11ad) | webllm.ts:192-389,246-260 |
| Conversation auto-starts mic without consent | **REFUTED** — gesture-gated; no getUserMedia on mount | conversation/page.tsx:332-361,669; useSpeechRecognition.ts:67-117 |
| Journal corrections poison mastery / self-contradict | **MASTERY-SAFE** via confirmedRepair (only 4 verified classes); display-layer residual (AI-01) | gender-correction-gate.ts:37-64; WritingEditor.tsx:182-185 |
| "No unverified AI moves mastery" invariant | **HOLDS** — confirmedRepair single gate, all 3 write sites routed through it | conversation/journal/skriv WRITE |
| Returning-user normalize backfills assumed fields | **HOLDS** | fingerprint.ts:175-189; indexeddb.ts:51 |
| `/vocab` honest stub, `/recalibrate` redirect | **CONFIRMED** | vocab:23; recalibrate:4 |
| Muntlig below-level banners (listen/roleplay/shadow) | **CONFIRMED** | ListenRespond:200; Roleplay:633; Shadowing:196 |
| Landing logged-in shows "Min side" | **CONFIRMED** (8848309) | page.tsx:163-164 |
