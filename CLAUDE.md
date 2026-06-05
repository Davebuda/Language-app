# NorskCoach — Project Context for Claude Code

## What This Is

An adaptive Norwegian language learning web app. Not a course — a coach. It builds a per-user mistake fingerprint, generates a personalized session every time, and runs every wrong answer through a repair loop with spaced-repetition follow-up.

**One-line positioning:** A personal Norwegian tutor that finds your weak spots, explains why they happen, and fixes them with targeted practice — and pushes you to actually speak.

This file is the single source of truth for how to work on this project. If anything you believe about the project conflicts with this file, this file wins. If this file conflicts with observed code, stop and flag it — do not silently work around it.

## The Moat

Three things working together. Everything serves these:

1. **Diagnosis** — knowing precisely what the learner is failing at, including root causes under surface mistakes.
2. **Scheduling** — generating a personalized session that mixes remediation, review, new material, and interleaving.
3. **Remediation** — every wrong answer triggers explain → micro-drill → retry → schedule for spaced review.

External research (see `docs/validation-and-research.md`) confirmed this combination is genuinely differentiated against Lingu, Babbel, Busuu, and the Norskprøven prep ecosystem. No competitor does root-cause diagnosis. The moat is the diagnostic coaching intelligence — not the SRS, not the exercise types, not the model.

AI is a power tool that supports the coaching. AI is never the headline. Every AI path has a non-AI fallback.

## The North Star (Results Principle)

The app exists to make the user speak more Norwegian and build sentences confidently. Two layered outcomes: production fluency (can construct sentences) and speaking confidence (actually does, in low-stakes varied contexts). Every feature must push toward production. A pure-recognition feature fails this test unless wrapped with an output requirement.

The "Norwegian dominates the screen" principle applies to learning surfaces (session loop, translation, fill-in-blank, word-order, journal, muntlig). It does not apply to assessment surfaces (diagnostic, recalibration) where English instructions with Norwegian options are correct by design — instruction clarity matters more than immersion when measuring placement.

## Tech Stack (ACTUAL — not aspirational)

- **Platform:** Web. Next.js (App Router), TypeScript strict, Tailwind.
- **Backend:** Supabase (Postgres + Auth + RLS).
- **State:** Zustand stores; fingerprint persists to IndexedDB, syncs to Supabase fire-and-forget for auth users.
- **AI (hybrid):** Desktop: WebLLM in a Web Worker via WebGPU (Llama-3.2-1B-Instruct, ~400MB, client-side). Mobile: Groq API via `/api/ai` server route (Llama 3.1 8B, server-side, requires `GROQ_API_KEY`). Fallback: template/rule responses when neither path is available. Profile page shows current AI mode (Lokal/Sky/Maler). Core engine does NOT depend on AI — every AI path has a non-AI fallback. Future upgrade: NB-Llama (Norwegian-fine-tuned) for both paths.
- **Typography:** Schibsted Grotesk (single family, display 700 / body 400). Designed by Schibsted (Norwegian media) for Scandinavian digital reading; æ/ø/å are primary design requirements.
- **Hosting target:** small EU VPS + Supabase EU region. Free per user is a hard constraint.

There is no iOS app, no Swift, no MLX, no SwiftUI. Earlier design docs describing those are historical artifacts from a deferred native plan. Do not act on them.

## Current State (core loop RUNTIME-VERIFIED on HEAD 2026-06-03; minor residuals remain)

> **2026-06-03 update — supersedes the earlier "not reliably completable" correction.**
> That earlier correction was based on a walkthrough of a **stale deployed build**. A
> runtime re-verification of HEAD (`1d3beb4`) — local production build + Playwright
> walkthrough (fresh guest: onboarding → 12-Q adaptive diagnostic → dashboard → progress →
> session → forced repair) plus full test suite (645 pass + 1 documented flake) and tsc
> clean — found the locked Phase-1 "Critical" findings **DO NOT reproduce on HEAD**:
> the core session loop **is reliably completable**; the repair loop's "Prøv igjen"
> **re-presents the exact failed sentence** (moat remediation pillar works — verified by
> typing the failed sentence on the retry and having it grade correct + advance);
> translate-to-English grades against `english`; word-order tiles are a proper tap-to-build
> surface with submit gated until arranged; diagnostic commits the level (dashboard + progress
> show it, no A1 fallback); phantom exercise types show honest "kommer snart" banners.
> WebLLM falls back to deterministic templates cleanly (Option C) with no console errors.
> **HEAD deployed to pandoai.no 2026-06-03 — live now matches verified HEAD.** Remaining work
> is minor / non-critical: translate-EN paraphrase rigidity (exact-match), word-order corpus
> doesn't populate `acceptedOrders` + audit one `du/deg` key, repair explanation occasionally
> generic vs the specific error tag. Evidence + verdicts:
> `output/qa-walkthrough-remediation-plan-2026-06-03.md`; live audit in memory
> `project_qa_walkthrough_2026_06_03`. The design bullets below are now runtime-corroborated
> for the core loop; AI-output quality (contract #2) residuals remain template-guardrailed.

The adaptive engine is built but is being stabilized; the following describe intended design:

- **Diagnostic placement** — IRT-style adaptive quiz, seeds the fingerprint (rawScore is pure accuracy: correctCount/attemptCount × 100, confidence 0.4). Cold-start traced and confirmed: new users get real adaptation from session one. Note: DiagnosticResult.rawScore is 0-1 IRT scale, distinct from ConceptMastery.rawScore which is 0-100 EMA scale.
- **Mistake fingerprint** — JSON blob in IndexedDB + Supabase. Per-concept: rawScore, confidenceScore, decayedScore, attempts, uniqueDaysActive, streak, recentOutcomes, SRS state (nextReviewAt, srsLevel). Plus error log (200 cap), error patterns, production gap, speaking minutes, input/production preference.
- **Mastery scoring** — phase-adaptive EMA (α: intro 0.40 → practice 0.25 → consolidation 0.15 → maintenance 0.08), slip detection (a wrong answer after 4/5 recent correct counts at 30% weight), geometric-mean confidence.
- **Decay** — exponential half-life, decays toward floor of 35 (not zero). Half-life is **25 days** (Stream 1.2 shipped); see `src/engine/fingerprint.ts:12`.
- **Calibration window** — first 5 sessions use a 30/30/30/10 recipe variant (Stream 1.3 shipped); see `src/hooks/useSession.ts:188`.
- **Phase model** — locked → intro → practice → consolidation → maintenance, computed live.
- **Scheduler** — recipe 40/30/20/10 (remediation/review/new/interleaving), pulls up to 5 focus concepts (3 weakest by decayedScore + up to 2 SRS-due), SRS-driven review pool, repeat cap (interleaving pool bypasses the repeat cap via `addItem` not `addItemCapped`), production guarantee, Fisher-Yates shuffle. **Weekly Sprint bias (Stream 5):** the 40% remediation pool biases toward `weeklyFocus` via priority ordering (focus concepts first, then weak, then unlocked). **Passed-sentence filtering:** the scheduler consults `passedSentenceIds` and excludes passed sentences from remediation, new-material, and interleaving pools. Review items explicitly allow passed sentences (`excludePassed: false`) for intentional spaced repetition. When all sentences for a concept are passed, the concept is skipped for non-review purposes; AI top-up generates fresh content. Every `SessionItem` carries a required `selectionReason` (`weak_concept` | `review_due` | `decaying` | `new_material` | `interleaving` | `weekly_focus` | `repair_target` | `cold_start`) justifying its inclusion. **CEFR-level sentence filter:** `filterSentencesByLevel` in scheduler.ts ensures sentences are filtered to the learner's current level or below — an A1 learner never sees B1+ sentences even for shared concepts.
- **Weekly Sprint engine (Stream 5)** — `selectWeeklyFocus`, `shouldResetWeek`, `closeWeek`, `openWeek`, `ensureWeekOpen` in `src/engine/weekly-sprint.ts`. Graduation rule promotes/demotes on close.
- **Diagnosis engine** — 4 root-cause rules on real error data. Output surfaced on dashboard session card.
- **Repair loop** — template explanation + 2 micro-drills + retry + SRS scheduling on the ladder 1→3→7→14→30 days. Wrong answers reset SRS level to 0 (full restart of the ladder).
- **AI validity gate** — all AI surfaces flow through `validateNorwegianOutput` in `src/ai/validate.ts`. Failed validation → per-surface template fallback.
- **Prompt hardening (Stream 1.1 Step 1)** — all 5 prompt builders in `src/ai/prompts.ts` carry Norwegian-enforcement system rules.
- **Event logging (Stream 1.4 writes)** — `src/lib/logEvents.ts` writes anonymized per-exercise and per-weekly-check rows to `learning_events_log` for auth users; guests excluded.
- **Error tagging** — uses sentence's real `error_tags_detectable`, not guessed from exercise type.
- **Content dedup** — no repeated sentence within a session. Cross-session: `passedSentenceIds` prevents passed sentences from reappearing in normal progression. When a non-review item's seed pool is fully passed, `useSession.ts` shows the forced repeat with an honest `isReviewFallback` "Repetisjon" badge instead of silently recycling it (Rule 6), and queues AI top-up — but server-side generation is not yet wired (`ServerAIService.generateContent` returns `null`; no `generate` action in `/api/ai`), so fresh generation currently works only on the WebGPU/WebLLM desktop path.
- **Full pipeline parity** — session, conversation, journal, AND weekly check all feed the identical mastery + SRS pipeline.
- **Cloze passages (Wave 6.3, shipped + closed 2026-06-02)** — discourse-level fill-in-gap exercise. Per-gap fingerprint write + repair (Rule 8, test-proven), level-honest scheduling (an A1 learner never gets an above-level cloze — test-proven Rule 6), at most one per session. A1/A2 passages live; B1/B2 cloze passages pending (separate content task). See `src/lib/cloze.ts`, `src/lib/passage-pool.ts`, `src/components/session/exercises/ClozePassageExercise.tsx`.
- **Production-from-surface (2026-06-02)** — `recordProductionFromSurface` in `src/engine/repair-from-surface.ts`: the correct-production sibling of `repairFromSurface`. One mastery brick on a correct written production; no error logged; productionGap untouched. **Guided/scaffolded frames earn reduced weight via an EMA learning-rate scale** (`learningRateScale` on `updateConceptMastery`, default 1) — scales the step, not the outcome, so a correct answer never lowers mastery; guided frames also freeze the SRS ladder. Built for the read-respond WRITE step.
- **Production wall → "I dag" command card (2026-06-02, committed `d9b28c2`)** — the brick→daily→weekly compounding model made visible, and the dashboard lead block. All-levels, per-level lens via the pure view-model `src/lib/production-wall.ts` (`deriveProductionWallView` + `LENS_CONFIG`: A1 grunnmur / A2 kombinasjon / B1 produksjon / B2 ordforråd — B2 hero reads `vocabCoverage`, not bricks). Component `src/components/dashboard/ProductionWall.tsx`. **Hero is a REAL count, never a %** — production+guided bricks count; recognition/exposure render but never move the hero (the differentiator, test-locked). Bricks = `DailyProgress.bricks {exposure,recognition,production,guided}`, distinguished by FILL+TEXTURE not colour (WCAG AA greyscale), written at the exposure/recognition/production/guided sites. **Merged surface:** the former separate production meter and "Start dagens økt" lime hero are now one card — dark STATUS half (objective + production count + week-sparkline glance + level chip) → lime ACT half (coach-reason whisper + start CTA, whole zone → `/session`) → optional "Produksjonsmur" drawer (full brick wall + legend + labelled weekly sprint + min snakket + gap). Strategic weight hierarchy: two anchors only (the count + "Start dagens økt").

Built features: diagnostic, dashboard (lead "I dag" command card — merged production meter + start-økt CTA — plus WeekStrip + lane strip), session loop, repair loop, conversation mode (AI tutor + constraints + focus bias), journal (focus-biased prompts), reading (concept-tagged texts with exposure logging), progress, profile (with level display + preference toggle), weekly retrieval check at `/uke`, scripted roleplay at `/roleplay` (focus-aware scenarios), shared repair module (`repairFromSurface`), AudioPlayer component (browser TTS fallback), analytics surface (`/analytics`), AlertDialog primitive.

Retired surfaces: `/vocab` → honest "Kommer i versjon 2" banner. `/recalibrate` → redirects to `/uke`.

Live muntlig modes: `/shadow` (shadowing — listen + repeat + word matching), `/drills` (pronunciation drills — 4 sound groups + heuristic feedback), `/listen` (listen-and-respond — 8 questions with focus-biased ordering). All three feed the fingerprint and lane completion system. Dashboard "Muntlig" section links to all three.

In-session exercise types (real): translation (×2), fill-in-blank, word-order, listening-comprehension, speed-round, **cloze-passage** (A1/A2). Phantom types (`sentence-transformation`, `dictation`) route to an honest `NotYetAvailable` banner (Wave 6.6).

Stubs / not built: vocab SRS, reading comprehension scoring, **read-respond UI** (engine + grader + content built; 3-page `/skriv` UI is the next build — see `output/ui-handoff-brief.md`).

## Current Phase

**STABILIZATION — Phase 1 effectively closed on HEAD (2026-06-03).** The "SHIP-READY" claim
stays retired (don't re-assert it without a full fresh audit), but the 7-phase plan's
**Phase 1 (core session engine) is runtime-verified resolved on HEAD**: the walkthrough that
flagged it ran against a stale deploy; a Playwright re-verification of HEAD (`1d3beb4`) plus
green tests (645 + 1 flake) and clean tsc confirmed graders, word-order, repair-retry routing,
diagnostic level commit, and phantom-type honesty all work. **HEAD deployed to pandoai.no
2026-06-03.** Remaining of the plan: minor contract-#1/#2 residuals (translate-EN paraphrase
rigidity; word-order `acceptedOrders` corpus population + one `du/deg` key; repair-explanation
specificity) and Phases 2–7 polish (AI demote/Option C hardening, talkback, journal). Authority +
verdicts: `output/qa-walkthrough-remediation-plan-2026-06-03.md` ("RUNTIME-VERIFIED" section in
memory `project_qa_walkthrough_2026_06_03`). Historical ship-ready context: `docs/vision-and-plan.md`.

**Since ship-ready — Wave 6 exercise pipeline (2026-06-01 → 06-02):** Shipped: cloze passage (6.3, closed with Rule-6 + Rule-8 tests), R0 phantom honesty (6.6), R1 B1/B2 retag (6.7, linguist-gated). Engine/honesty fixes: live `computeProductionGap` + observed-error classifier (`src/lib/classify-error.ts`), Lytt listening-only fix, shadow mistag fix. **read-respond** (read→recite→write skriv module, rows #2+#4): engine helper + deterministic grader + `ReadingPassage` type + 6 linguist-gated B1 passages — **BUILT + tested; UI is the next build (Lane B)**. Not started: B2 nuance-discrimination + conjugation-drill (#3), Nor→Nor transformation (#5), per-level-progression UI. Full status: `docs/vision-and-plan.md` Wave 6.

**What's shipped:**
- Stream 5.5 Phases 3-8 (all surfaces laned, repair externalized, stubs retired, recalibration retired)
- Wave 0: CLAUDE.md sync, `/listen`+`/drills` muted, F027 repair-loop cap
- Wave 1: Audio pipeline — 1,117+ MP3 files generated via edge-tts (nb-NO-PernilleNeural), AudioPlayer wired to real paths with browser TTS fallback. All 4 CEFR levels have audio coverage.
- Wave 2: Analytics surface v1 + moat metric defined + history cap confirmed
- Wave 3: Dashboard composition, progress trajectory, 27 dead CSS classes removed, BottomNav Norwegian
- Wave 4: B1 concept graph (12 concepts), B1 corpus (360 sentences, 30/concept), all 16 files migrated to `getGraphForLevel`, B1 level selectable
- Wave 4.5: B2 concept graph (12 concepts), B2 corpus (360 sentences, 30/concept), B2 audio (360 MP3s)
- Norwegian-dominates pass across ALL learning surfaces (~99% Norwegian)
- Auth: email login is **6-digit/8-digit OTP** (`verifyOtp`, device-independent), NOT magic link. Migrated 2026-06-05 from device-locked PKCE magic link (commits `d4ecdef` + `4e018ec`); `/auth/callback` + `exchangeCodeForSession` kept for future Google OAuth. Production email via Resend SMTP (`no-reply@pandoai.no`). Verified end-to-end cross-device live. See memory `project_auth_redirect_config`.
- Market-readiness audit: security headers, error boundaries (Norwegian), loading skeletons, CEFR sentence filter, API rate limiter (30 req/min), `.env.local.example` credentials cleaned

**Next (operational, not code):** ~~Rotate Supabase keys~~ (done 2026-05-29), ~~deploy to pandoai.no~~ (live), ~~auth completion~~ (done — OTP login shipped + verified e2e 2026-06-05). Remaining operational: Google OAuth one-tap (optional; `/auth/callback` already retained for it). V2 engine (Wave 5) blocked on real users.

## Operating Rules (HARD RAILS — these caused real problems when absent)

1. **Depth, not breadth.** Do not add feature surface. Finish and harden the current phase before proposing anything new. Adding features while foundations are open is the documented failure mode of this project.

2. **Analysis-first on decisions; direct on mechanics.** If a task involves a reversible architectural or design choice, produce an analysis with 2–3 options and tradeoffs and STOP for approval. If a task is mechanical and well-understood, do it directly and show the diff. Do not run analysis loops on one-line fixes; do not build architectural changes without analysis.

3. **Verify, don't assume.** Before declaring anything done, produce a concrete trace against stated acceptance criteria. "It should work" is not verification. A wrong audit was caught this way; conversation parity was confirmed this way. This is mandatory. **Verification must include a returning-user fingerprint, not only a fresh guest** — a fingerprint persisted under an older schema is the real production population, and guest-only live smoke shipped a returning-user dashboard crash on 2026-06-03. The locked guard is `tests/integration/returning-user-read-safety.test.ts` + `tests/types/returning-user-fixture.ts`: any read surface that assumes a field a legacy fingerprint lacks must fail there. When adding a field to `MistakeFingerprint`, confirm `normalizeFingerprint` backfills it and extend the fixture.

4. **One move at a time.** Finish the current move, verify it, summarize what changed, then stop. Do not chain into the next move unprompted.

5. **Surface drift, don't route around it.** If code conflicts with this file or a spec, or if a request seems to contradict the moat or north star, raise it as an explicit question. Do not silently reinterpret the request to make it fit.

6. **No silent substitution.** Never make a feature appear to work when it doesn't (the old B1/B2-runs-A2 pattern). Honest banners over silent fallbacks.

7. **Scope discipline on prompts.** If asked to fix X, fix X. Do not also refactor Y, restyle Z, or build the thing you think should come next. Note adjacent issues; don't act on them without approval.

8. **Pipeline honesty.** If a surface claims to contribute to the fingerprint, mastery, or repair loop, that contribution must be traced end-to-end before the surface ships. A UI that shows a correction card is making a claim about the learning engine, not just about pixels. Five separate surfaces during P0 recovery were found to silently contribute nothing: the AI badge, error tags, session progression, journal correction, and conversation grammar logging. Before any "feeds the engine" feature ships, trace the write: confirm an entry lands in the error log, the mastery score changes, or the SRS state updates — in a real session, not in theory.

## The Architect Subagent

This project has an architect subagent at `.claude/agents/architect.md`. Its job is direction, sequencing, and pushback — NOT writing code. Consult it before starting any phase, when a request might be breadth-not-depth, when scope is unclear, or when a decision has architectural weight. The architect proposes and challenges; the main session executes after approval. Treat its scope/direction flags as blocking until resolved with the user.

## Documents That Outrank This File On Their Specific Domains

- `docs/vision-and-plan.md` — the unified vision, ship-ready definition, dependency map, and wave-ordered execution plan. The forward-looking source of truth for what to build next.
- `docs/roadmap.md` — the historical build record with per-phase closure notes, research citations, and procedural locks.
- `docs/muntlig/architecture.md` — the full muntlig module architecture (audio, pronunciation, content, branching, timing). When muntlig is built, this is the spec.
- `docs/validation-and-research.md` — the research findings on model quality, SRS, decay, mastery, cold-start, competitive position. The reasoning behind the engine corrections lives here. Read this if you wonder why a decision was made.
- `docs/ui-1/` — aesthetic direction, token contract, typeface analysis, shadcn audit, type scale. The UI phase's source of truth.

If those docs conflict with each other or with this file, surface the conflict — don't pick.

## When in Doubt

Re-read the moat and the north star above. Every decision should trace to one of them. If it doesn't, it's probably out of scope — raise it, don't build it.

## How to Start a Session

1. Read this file fully.
2. Read `docs/roadmap.md` for the current sequence.
3. State the current phase and what's in scope.
4. For anything non-trivial, propose a plan and stop for approval (Operating Rule 2).
5. Do not ask the user to re-explain the project. It's all here.
