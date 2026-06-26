---
gsd_state_version: 1.0
milestone: stabilization
milestone_name: Stabilization — harden the shipped core loop; prove the moat
status: in progress
stopped_at: 2026-06-22 (later) — DEEP PRINCIPAL-QA AUDIT + T1.4 + 5 audit fixes SHIPPED + DEPLOYED (runtime HEAD 0d598c3; docs HEAD 9a4de92). 7-phase read-only audit → audit/ dir (system-map, live-audit-log, issue-registry, root-cause-map [10 clusters], diagnostic-plan, fix-plan, regression-checklist). KEY META-FINDING: most of the 13 reported issues were ALREADY FIXED (diagnostic off-by-one, mic auto-start, WebLLM gibberish, SSR/CSR mismatch, journal mastery-poison, seed-path retry all refuted) — re-verify, don't re-report. FIXED+DEPLOYED (all audit:gate AUDIT-CLEAN, Rule-9 reconciled, visual-QA'd where UI changed): T1.4 root_cause in-session label (4fc8e58); A-01 CRITICAL B2 fill-in-blank unwinnable — notes was "answer — explanation", 182/184 rows migrated + CI gate (82fc798); S-01 generated-content grader freeze — optional fallbackContent (f4b8521); R-01 orphaned muntlig lanes → dashboard "Muntlig" sub-panel (afe282b); G-02+S-02 non-punitive speed-round (0d598c3, docs/decisions/2026-06-22-non-punitive-speed-round.md). Remaining backlog all Medium/Low (audit/issue-registry.md). Dashboard-expression layout exploration done (scout + 5 directions), awaiting a pick.
last_updated: "2026-06-26"
last_activity: 2026-06-26 — Plan C / T1.6 (diagnosis steers snakk + new-material) deployed (6ef0132), after G-03 + Kari calibration + 5 audit fixes earlier the same day. Loop: started "make Kari helpful" → Recourse → Investigate (Kari stranded from the engine) → Solve+Council (Council KILLED an unsafe deterministic V2 verifier) → G-03 (clean the diagnosis input) → Plan C (broadcast the diagnosis). Every commit audit:gate AUDIT-CLEAN, Rule-9 reconciled, deployed in two passes. LOCKED PROCESS LESSON still holds (visual QA via throwaway qa-* route → Playwright → delete route + rm -rf .next before final gate); NEW pattern this session: empirical model bake-off (query Groq /models, probe candidates on real failure cases) before any model swap.
head: 6ef0132 (runtime/deployed 2026-06-26 — Kari calibration + 5 audit fixes + G-03 + Plan C/T1.6)
test_count: ~935 (audit:gate green; + conversation-format bracket-strip, translate-en-accepted-answers-integrity, scheduler-diagnosis-steer-pools [snakk lead/label + cold-start guard + review-agnostic boundary])
deployed: pandoai.no (Hetzner) — runtime at 6ef0132, IN SYNC with origin/main. Two deploy passes 2026-06-26 (b09ff69 then 6ef0132), each under Operating Rule 9 (reconcile 3 trees + gate ALONE before every deploy); live-verified (eval 404, site 200, Kari 70B smoke).
remaining_tier1: T1.4 DONE (root_cause label). **T1.6 DONE 2026-06-26** (6ef0132) — diagnosis steers snakk (root-cause lead + label) + new-material modality (cold-start-guarded); review/SRS-due stay diagnosis-AGNOSTIC (locked boundary test passes). Remaining: T1.5 ladder production/muntlig cluster, T1.7 journey copy. Then Tier-2 (AI-forward tutor-feel). NB-Llama deferral HOLDS — Council killed a deterministic V2 verifier (Rule-8 false positive on "Kanskje jeg kommer"→"Kanskje kommer jeg" + near-zero coverage on minimal-span corrections); V2-from-conversation stays show-don't-grade.
---

# Project State

## Update 2026-06-26 — Kari calibration + 5 audit fixes + G-03 + Plan C (T1.6) SHIPPED + DEPLOYED (head 6ef0132)

Two deploy passes to pandoai.no under Operating Rule 9, every commit `audit:gate` AUDIT-CLEAN, live-verified.

**Deploy A (head b09ff69) — 5 audit-backlog fixes + Kari:**
- **E-01** (e002dbd): `/eval` AI-harness guarded out of production (server-component `notFound()` when `NODE_ENV==='production'`; live 404) — closed an unauth Groq-spend leak.
- **R-02** (17e821c): `/reading` honest below-level banner for B1/B2 via `getReadingContentLevel` (mirrors roleplay/listen) — last surface still silently substituting below-level.
- **AI-01** (c5dbdc3): journal "Rettet versjon" now weaves ONLY gate-CONFIRMED corrections (pure `buildCorrectedText` lib + caveat for withheld) — show-don't-grade extended to the displayed text, not just mastery.
- **D-01** (61a4fe1): onboarding AWAITS the diagnostic seed before navigating (kick-off in `handleDiagnosticComplete` + extracted `buildSeededFingerprint`) — closed a fast-click level-reset-to-A1 race.
- **S-05** (cd09caa): unresolvable session item → honest "Hopp over" `UnresolvedItemCard` (advance only, NO fingerprint write — Rule 8) instead of an infinite skeleton.
- **Kari conversation calibration** (b09ff69): evidence-driven (8 API probes + 4-model bake-off + Playwright before/after under `.claude/screenshots/snakk-kari-*`). Routed the Kari turn to **llama-3.3-70b-versatile** (new `CONVERSATION_MODEL` env, default 70B; 8b stays for high-volume JSON generation = free-tier budget), temp 0.85→0.6, rewrote `buildConversationPrompt` (anti-echo / never repeat the learner's mistake, exactly ONE follow-up question, level-true vocab, natural register, English-redirect, dropped the leaky [brackets] Rule 6), hardened `stripTutorScaffolding` against stray `[merk:…]`. Live-proven: native A1 + correct V2 catch ("I dag jeg er trøtt"→"I dag er jeg trøtt").

**Deploy B (head 6ef0132) — signal cleanup + diagnosis broadcast:**
- **G-03** (19de089): 162 B1/B2 `translate-EN` `accepted_answers` (30/34 B1, 132/133 B2), conservative "a false-accept is worse than a false-reject" contract + new `translate-en-accepted-answers-integrity` gate. Kills the chronic B1/B2 exact-match-fail → self-attest → correct-at-HALF-weight muddying of the diagnosis input. Separate review pass rejected one meaning-drift alt ("Calm down" for "Slå deg ned").
- **Plan C / T1.6 DONE** (6ef0132): diagnosis now steers the snakk + new-material pools (the architect-redefined moat-safe scope). ① Snakk block leads with the diagnosed root cause + affected concepts and labels the root-cause speaking item `root_cause`; ② new-material modality tilts to the diagnosis focus via `resolveNewMaterialFocus` with a **cold-start guard** (never force production output on a zero-attempt concept — i+1 scaffolding). Review/SRS-due stay diagnosis-AGNOSTIC — locked boundary test (an unrelated SRS-due concept still schedules under a strong off-target diagnosis). 8 new tests.

**Process highlight (Council saved a bad build):** a Recourse → Solve → Council loop on "feed Kari's V2 catches into the moat" — the critic + architect KILLED a proposed deterministic V2/word-order verifier before any code: a Rule-8 false positive ("Kanskje jeg kommer"→"Kanskje kommer jeg" is valid Norwegian) + near-zero real coverage (corrections are minimal spans "jeg er→er jeg", not full clauses). The pivot to G-03 (clean the signal) + Plan C (broadcast the diagnosis) came directly from that verdict. V2-from-conversation stays show-don't-grade; NB-Llama deferral holds.

## Update 2026-06-24 — interactive corrections + universal learner notebook SHIPPED + DEPLOYED (9 commits, head b35cca2)

A new product layer beside the stabilization work (direction/plan in `docs/`; full decision in `docs/decisions/2026-06-24-notebook-deterministic-recall.md`; authoritative detail in CLAUDE.md "Current State" 2026-06-24 box). All 9 commits `audit:gate` AUDIT-CLEAN, Rule-9 reconciled, deployed to pandoai.no via `bash deploy/deploy.sh` (CI build-checks but does NOT deploy — VPS secrets unset). Shipped: 2nd-person feedback rewrite; clickable word-selection popup (verified-corpus vs AI-"Forslag" vs honest-empty, AI-01); `/vocab` is now the universal notebook (IndexedDB v1→v2 + `learner_notebook` Supabase table w/ RLS, guest-capable + auth sync); promoted items return as deterministic `translation-to-norwegian` on their OWN SRS (`src/lib/srs.ts`), `submitResult` branches so notebook practice NEVER touches `conceptMastery` (Rule 8 + T1.6). Verified: fresh-context code review (5 fixes incl. guest→login data-loss), Playwright visual QA, real-IndexedDB integration tests (`fake-indexeddb`), live prod smoke. Test count ~894 (audit:gate green).

## Project Reference

**Project:** NorskCoach — diagnostic Norwegian language learning web app
**Moat:** Diagnosis → Scheduling → Remediation (root-cause coaching no competitor does)
**North star:** make the learner produce + speak Norwegian
**Current focus:** STABILIZATION — harden the shipped core loop, keep the tree audit-clean, prove the moat with real users.

> **Note (2026-06-08):** This file previously described the long-closed "P0.5 Recovery Bundle"
> (Stream 5 era, last_updated 2026-05-22). That milestone and the 7-phase QA-walkthrough plan are
> done. Authoritative current state is `CLAUDE.md` → "Current State" (2026-06-06 box). This file is
> now the stabilization-phase tracker.

## Update 2026-06-19 (late) — p3 + p6-gating + W1 shipped (11 commits, pushed)

Single long session (/recourse → autopilot → council → align). All `audit:gate` AUDIT-CLEAN, pushed to `origin/main` (HEAD `251de03`).

- **p3 Diagnosis-moat visibility — DONE (all 3 pillars, live-verified):** dashboard diagnosis depth (`47532fd`), repair "Fanget · «klasse»" chip + "why this" justification (`5b21fcf`).
- **p6 gating half — DONE:** per-level Content Contract + coverage gate (`77a1636`); Q-matrix multi-skill tagging (`469b847`, `ad41c24`) so foundational concepts are tagged on B1/B2 sentences; **remediate-at-level** selection + CEFR ceilings on every pool path (`f1f0564`) — VERIFIED: a B2 gender-weak learner draws from 127 B2 gender sentences, not 40 A1 ("jeg vil ha kaffe"); at-level generation validator (`bcefc61`); coverage-gate honesty fix (`b033606`).
- **AI gibberish fixed** (`3dd11ad`): local 1B repair explanations gated off (fluent Norwegian non-words slipped the validator); server 8B path gated; re-enable on NB-Llama.
- **W1 B1/B2 listening parity — DONE** (`251de03`): enabled listening-comprehension on +96 B1 / +75 B2 vetted sentences with existing MP3s (no new content/audio/linguist). Coverage gate listening gap CLOSED.
- **Decisions surfaced:** W4 re-scoped (B2 gender diagnosis already works via classify-error high-confidence + rule 1; residual is only medium-confidence tags); speed-round left as an honest B2 gap (rapid-recall ≠ B2 register).
- **Remaining p6:** W2 module ladder (cloze/reading/skriv across levels), W3 grammar gates, W5 honesty fixes (roleplay A2 silent A1 fallback; /listen A2 thin) — mostly content-authoring/linguist-gated.

## Update 2026-06-19 — /recourse re-anchor (this file was 2 HEADs stale)

Since the 2026-06-08 snapshot below, the tree moved to HEAD `f3d9056` (~11 commits):
- **p2 Corpus & content integrity → DONE.** The "non-blocking content debt" WARNs listed further down
  (334 nonstandard blank markers, 39 over-length, 38 norwegian-invalid, 1 blank-without-fib) were burned
  to 0 across `e4af006` (canonical `___`) · `dae02ee` (kill 38 false positives) · `b15b49e` + `ad3a058`
  (→ 0 WARNs) · `6be3e5d` (robust splitter).
- **Drill SRS fix shipped** (`f3d9056`) — Phase 0 of the 2026-06-16 expression-chunk scout: per-word
  `vocabWordSrs`, ≥2-day spacing, reads the fingerprint (closed a Pipeline-Honesty gap) + reveals `carrier.en`.
- **Landing "Logg inn" routing** (`1a85d2c`) + **shared gender gate refactor** (`9668088`).
- **p3 REOPENED as active.** The phase was "gender corrector + coach visibility"; the gender corrector
  shipped (Lever 3, done) but *coach visibility* was only minimally delivered (one dashboard line) while
  the diagnosis engine computes far more. User chose **moat-visibility rewire** as the next bet:
  surface the root-cause diagnosis + repair-loop coaching + per-word SRS the engine already produces,
  inside existing surfaces (depth-not-breadth, no new surface). **Scoped proposal pending approval — no code yet.**

## Current Position

Phase: STABILIZATION. Phase 1 (core session engine) runtime-verified closed on HEAD (Playwright walkthrough + green suite + clean tsc, 2026-06-03). All 2026-06-05/06 live-bug + moat-visibility sweep fixes deployed (server-side Groq generation, corpus integrity 112→0, 39 B1 word-order keys, repair-loop phantom filter, conversation+journal AI corrections decoupled from the fingerprint, root-cause diagnosis surfaced as the dashboard coach line).

Verified 2026-06-08 (baseline ultraaudit, 5/5 PASS with evidence):
- Corpus integrity: `npm run audit:corpus` 0 ERRORS (68 concepts / 2,834 sentences — A1 879 · A2 758 · B1 620 · B2 577; all ≥30/concept).
- Type safety: `npx tsc --noEmit` 0 errors.
- Tests: vitest 685/685 green (one tolerable Windows worker-fork teardown flake; resolves on retry).
- Returning-user read safety: locked guard 10/10; `normalizeFingerprint` (`src/types/fingerprint.ts:163`) backfills.
- AI-never-grades-mastery: both correction flags hardcoded `false`; AI-error write paths provably dead while gated.
- Moat visibility: `runDiagnosis()[0].reasoning → dashboard coachReason → ProductionWall` chain intact.

## Recourse four-lever program (2026-06-08)

Sequenced to respect HARD RAIL #1 (depth-not-breadth): one code lever in-flight at a time; ops runs parallel.

| # | Lever | Class | Route | Status |
|---|---|---|---|---|
| 1 | Hygiene + standing ultraaudit gate (`npm run audit:gate`) | hygiene | execute directly | ✅ DONE (`0abbabf`) |
| 3 | Noun-gender deterministic corrector (re-arms conversation + journal) | build (depth) | scout ✅ → gating ✅ → plan ✅ → BUILT ✅ → committed `467b252` → DEPLOYED ✅ | **DONE 2026-06-08 — live at pandoai.no (routes 200, server HEAD 467b252), audit:gate AUDIT-CLEAN / 698 tests** |
| 2 | NB-Llama-1B compile (Wave 0.5) | infra | scout ✅ → make-plan-pro → executor | DEFERRED — scout done (`.scout/last-brief.md`); modest/unproven value, does NOT gate Lever 3 |
| 4 | Get real users (unblocks Wave 5 V2 + moat-proof) | ops | feature-challenger (activation funnel) → feature-to-layout | PARALLEL LANE |

**Lever 3 design (APPROVED 2026-06-08, gender-only filter):** Gating CODE-CONFIRMED — the gates re-enable on "a deterministic gate exists" (`conversation/page.tsx:251`, `journal/WritingEditor.tsx:168` comments), NOT a better model → Lever 2 does not gate Lever 3. Lexicon = **Norsk ordbank Bokmål 2005 (CC-BY 4.0)**, gender stored as a SET per lemma to avoid the two-gender false-flag ("en bok" is valid). Build: `gender-map.ts` (build-time, freq-trimmed) → deterministic verifier (lemma-normalize → set-membership; CONFIRM only when learner gender ∉ set ∧ proposed ∈ set; REJECT both-valid/OOV) → re-arm conversation+journal as a per-correction FILTER (only verified gender/article-class corrections move mastery; V2/conjugation stay show-don't-grade). Verifier+map+tests first; gate-flip + Rule-8 live trace last. Lexicon research: `.scout/lane-gender-lexicon.md`.

**Re-sequenced 2026-06-08:** Lever 2 scout (`.scout/last-brief.md`) found the nb-llama-1B swap cheap but low-impact — NB frames the 1B as an "adaptation probe" with no published proof it beats generic Llama-3.2-1B, and a *deterministic* gender corrector is dictionary-based, independent of which LLM generates content. So **Lever 2 does not gate Lever 3**; the moat win (re-arming gated-off corrections) moves first. New critical path: **3 → (then maybe 2 as content-parity fast-follow). Lever 2 model pick if/when run: `NbAiLab/nb-llama-3.2-1B-Instruct` (drop-in, reuse stock MLC wasm), with a ScandEval verify-before-ship gate.**

## Lever 3 — DONE 2026-06-08 (committed `467b252`, DEPLOYED to pandoai.no)

8/8 tasks, `audit:gate` AUDIT-CLEAN (corpus 0 / tsc clean / 698 tests / returning-user 10/10). Server on HEAD `467b252`; `/conversation` + `/journal` return 200. The same push also caught production up from `db88cf5` → so `0abbabf` (standing gate) is now live too.
- **Lexicon:** `scripts/build-gender-map.ts` → committed `src/lib/gender-map.ts` (281KB, 21,947 forms / 5,677 lemmas; form→gender-bitmask 1=m·2=f·4=n). Source = Norsk ordbank Bokmål 2005 (CC-BY 4.0) ∪ top-15k OpenSubtitles-freq ∪ corpus nouns; source data lives in gitignored `.tmp/ordbank/`. Two-gender stored as bit-union (bok=3) → no false flag.
- **Verifier:** `src/lib/gender-verifier.ts` `verifyGenderCorrection({original,corrected}) → confirmed|rejected|not-applicable`. Confirms ONLY on an article-gender mismatch where learner∉set ∧ proposed∈set; OOV/two-gender/definite-swap/spelling → no write. Compound longest-suffix fallback (≥4-char suffix). Ignores the AI's claimed tag.
- **Gates (filter, not flag):** `src/components/journal/WritingEditor.tsx` + `src/app/conversation/page.tsx` — dead booleans removed; only `confirmed` gender corrections (re-tagged `noun-gender`) reach `repairBatchFromSurface`/`repairFromSurface`. All other AI error classes stay show-don't-grade. `validate.ts` + deterministic fallback provably untouched.
- **Tests:** `tests/lib/gender-verifier.test.ts` (9, incl. two-gender trap + poisoning + OOV) + `tests/integration/gender-corrector-trace.test.ts` (Rule-8 both directions: confirmed→mastery moves+error logged+SRS reset; poisoning/two-gender/OOV→fingerprint untouched).
- **Honest verification gap:** the Rule-8 trace exercises the real verifier + real write engine via a helper that MIRRORS the gate logic; the React component wiring is type-checked + matches that logic but was NOT live-traced in-browser (Groq nondeterminism makes forcing a specific gender correction unreliable). A Playwright live smoke is the remaining optional rigor.
- **V2/conjugation:** still gated (no deterministic check) — unchanged.

## Deferred-by-decision (parked, not forgotten)

- Deterministic V2/conjugation correction (harder than gender; proper fix = NB-Llama) — lever 2/3.
- MCQ engine — gated on a 2nd consumer (`docs/mcq-engine-contract.md`).
- `acceptedOrders` population for word-order corpus.
- Translate-EN paraphrase tolerance (exact-match rigidity).
- Wave 5 V2 engine (FSRS-7, BKT, adaptive decay) — blocked on real users + usage data.
- B1/B2 cloze passages (0 exist; separate linguist-gated content task).

## Non-blocking content debt (corpus WARN, tracked not gating)

From `audit:corpus`: 334 nonstandard-blank-marker rows (5 underscores vs canonical 3), 39 over-length-for-level, 38 norwegian-invalid (no NO function words), 1 blank-without-fib. Kept as WARN in the standing gate — visible, not blocking.

## Decisions logged this session (2026-06-08)

- Ran a 5-dimension baseline ultraaudit as a Workflow → AUDIT-CLEAN. Codified the 4 load-bearing checks as a standing recurring gate (`npm run audit:gate`, `scripts/ultraaudit.mjs`) with a one-retry rule on the Windows vitest flake.
- Reconciled working-tree drift: the 12 `output/staging-b1-*.json` + merge/fix `.mjs` scripts are build inputs whose content is ALREADY committed (B1 at 50–56/concept). No unlanded content at risk. `output/` scratch + stray PNGs now gitignored.
- Refreshed this STATE.md (was 2-milestones stale) and corrected the vision-doc content baseline.
