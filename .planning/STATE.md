---
gsd_state_version: 1.0
milestone: stabilization
milestone_name: Stabilization — harden the shipped core loop; prove the moat
status: in progress
stopped_at: Baseline ultraaudit AUDIT-CLEAN (5/5 PASS) 2026-06-08; recourse four-lever program defined; lever 1 (hygiene + standing gate) in progress.
last_updated: "2026-06-08"
last_activity: 2026-06-08 — recourse re-anchor + baseline ultraaudit (AUDIT-CLEAN) + working-tree drift reconciled (benign; corpus already committed) + standing audit:gate codified.
head: db88cf5
test_count: 685 passing (tsc clean)
deployed: pandoai.no (Hetzner) — live matches HEAD
---

# Project State

## Project Reference

**Project:** NorskCoach — diagnostic Norwegian language learning web app
**Moat:** Diagnosis → Scheduling → Remediation (root-cause coaching no competitor does)
**North star:** make the learner produce + speak Norwegian
**Current focus:** STABILIZATION — harden the shipped core loop, keep the tree audit-clean, prove the moat with real users.

> **Note (2026-06-08):** This file previously described the long-closed "P0.5 Recovery Bundle"
> (Stream 5 era, last_updated 2026-05-22). That milestone and the 7-phase QA-walkthrough plan are
> done. Authoritative current state is `CLAUDE.md` → "Current State" (2026-06-06 box). This file is
> now the stabilization-phase tracker.

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
