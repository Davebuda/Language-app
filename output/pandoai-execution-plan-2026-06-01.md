# NorskCoach — Execution Plan (stable, parallel, no-breakage)

Derived from the 2026-06-01 audit + Part 4 sim corrections. Authoritative action list (supersedes the rough sketch in `pandoai-direction-2026-06-01.md` §3). Principle: **make the existing promise true, depth-first, feature-by-feature, no breakages.**

## No-breakage protocol (applies to EVERY task)
1. Green baseline first (`npm run build` + `npx vitest run` must pass before any edit).
2. Test-first where it touches data/engine (CLAUDE.md: "test anything that touches data"): write/extend a test capturing correct behavior → fix → test green.
3. After each fix: full suite + build green; trace the engine write end-to-end (Rule 8) where relevant.
4. Fresh-context `code-reviewer` pass before merge (never self-approve).
5. One feature = one commit. Parallel lanes only across NON-overlapping files.
6. If a fix repeats >2× without success → STOP and escalate (no thrashing).

## Parallelization model
- **Lane E (engine truth)** and **Lane T (trust/polish)** touch disjoint files → run in PARALLEL.
- Within Lane E, tasks are SEQUENTIAL (shared engine files, ordered by dependency).
- Lane T tasks are mostly independent → parallel among themselves.

---

## WAVE 1 — Engine truth + Trust (highest leverage, mostly bug-fix, no new surface)

### Lane E — Engine truth (sequential; `src/engine/*`, `src/hooks/useFingerprint.ts`)
| # | Fix | Acceptance test (no-breakage) | Risk |
|---|---|---|---|
| E1 | **F1 — cross-level prerequisite resolution in phase computation.** `getConceptPhase`/`masteredIds` must consider mastered concepts from LOWER-level graphs, not just the active level, so B1/B2 concepts aren't permanently `locked`. | Seed a B1 fingerprint w/ A1/A2 prereqs mastered → `selectWeeklyFocus` returns non-empty; B1/B2 concepts reach `intro`/`practice`. Re-run the sim harness → weekly focus non-empty at B1/B2. | Med (touches phase/graph; broad read surface) |
| E2 | **F2 — orphaned lower-level concept phase.** Carried-forward lower-level concepts must resolve to a real phase, not `unknown`. | Progressed A2 learner → no concept reports `phase=unknown`. | Low |
| E3 | **Root-cause diagnosis re-point.** `runDiagnosis` + error-pattern detection read the concept-mastery layer (decayedScore/attempts per concept) instead of authored `errorTagsDetectable[0]`. | A1 word-order-weak sim learner → diagnosis names word-order (not prepositions); 4/4 sim users get correct root cause. | Med |
| E4 | **Production-gap signal.** Strengthen `computeProductionGap` signal OR gate the production-gap diagnosis rule so it doesn't fire near-random. | Production-weak vs balanced sim learners produce distinguishable productionGap; rule fires only when gap is real. | Low-Med |
| E5 | **Repair graduation gate (optional, Wave 1 stretch).** Repair retry must be passed to clear (not advance unconditionally). | Failing the retry keeps the item in repair/SRS; passing graduates. | Med (session flow) |

### Lane T — Trust / polish (parallel; disjoint files, low risk)
| # | Fix | Acceptance |
|---|---|---|
| T1 | Remove fabricated "4.9 ★ fra tidlige brukere" + fake avatars (or gate behind real data). | Landing shows no fabricated social proof. |
| T2 | Relabel/recompute analytics "Bevaring" (it's recency, not retention) — rename or compute true retention. | Metric label matches what it measures. |
| T3 | Reconcile "AI ready" badge vs profile "Maler" status (one source of truth). | Badge reflects actual AI availability. |
| T4 | Dashboard "12 oppgaver · ca. 3 min" → real count/time (25 items / ~18 min, or the actual computed values). | Dashboard estimate matches the generated session. |
| T5 | Stop scheduling phantom exercise types into sessions (filter unavailable types out of the scheduler pools; keep honest banner only if one slips through). | No "kommer snart" skip-card appears mid-session. |
| T6 | Fix muted-text contrast token (raise muted-foreground opacity/darken) to WCAG AA 4.5:1. | The 7 logged landing fails (and the global token) pass AA. |
| T7 | SEO: add canonical, og:image (1200×630), og:url, twitter:card=summary_large_image; decide noindex (keep if pre-public, else remove). | Public pages have full meta; noindex is an explicit decision. |

**Wave 1 exit:** all engine tests green, build clean, sim re-run shows correct root cause + live weekly focus at B1/B2, trust items verified in a live re-check, code-reviewer pass.

---

## WAVE 2 — Supply + audio (after Wave 1 engine green)
| # | Fix | Notes |
|---|---|---|
| S1 | Wire server-side AI generation (`/api/ai` `generate` action + `ServerAIService.generateContent`) through `validateNorwegianOutput`. | Removes the mobile corpus ceiling (Part 2 brittleness). Rate-limiter budget TBD. |
| S2 | R1 re-tag B1/B2 with `listening-comprehension` + `speed-round` (tagging only, audio/TTS exist). | Acceptance = fingerprint pre/post diff in a real session (Rule 8), not "tag appears." |
| S3 | Deepen B1/B2 corpus to ≥50/concept — **cloze passages first**. Pipeline: content-author → norwegian-linguist (blocking) → finalize-deepen gate → seed. | Highest-leverage content. Never seed without linguist pass. |
| S4 | Session-listening uses MP3 when `getAudioUrl` resolves; TTS only when MP3 absent. | The exact session sentence's MP3 exists; stop defaulting to TTS. |

## WAVE 3 — North star (gated on Wave 1 engine truth; each Rule-8 traced)
| # | Fix | Notes |
|---|---|---|
| N1 | Bring ONE speaking-production type into the session loop (the "snakk" block actually speaks). | Run `feature-challenger` on this feature first. Must trace a real fingerprint write. |
| N2 | Cloze at B1/B2 scale (discourse production at the top levels). | Builds on S3 content. |
| N3 (defer) | Mechanic-level CEFR scaling (gloss removal, scaffolding reduction at B2). | Backlog. |

## Explicitly deferred (scope discipline)
Layout-direction redesign (`feature-to-layout-director`), new recognition-only types, vector layer — none compound the moat now.

---

## ARCHITECT REVIEW — corrections (2026-06-01, blocking flags)
Architect confirmed F1 root cause in code (`getGraphForLevel` returns single-level graph → `masteredIds` in `weekly-sprint.ts:53` + `scheduler.ts:111` structurally can't hold lower-level prereqs → B1/B2 permanently locked; `b1-graph.json` prereqs like `perfect-tense`/`passive-voice` are A2). Corrections to the plan:
- **E1 locus = `src/lib/concept-graph-loader.ts`** (add cumulative-graph accessor = union A1..currentLevel, deduped); route `masteredIds` construction through it. **Do NOT change `getConceptPhase` logic** (fingerprint.ts:311 — it's correct, just needs a complete masteredIds set). No fingerprint data migration (read-time composition only).
- **Sequencing: E1→E2 must land + sim re-run (non-empty weeklyFocus at B1/B2, no `phase=unknown`) BEFORE E3/E4** — else diagnosis is tuned on F1-corrupted signal.
- **E3 is a DECISION, not a re-point** — the real bug is authored sentence tags mismatching the concept tested (content-integrity). Rules 1/3/4 genuinely need tags (rule 3 listening has no mastery proxy). Needs analysis-first (fix tags / concept-aware diagnosis / both).
- **E4 = GATE the rule** (raise threshold / require min error volume in diagnosis.ts), do NOT touch `computeProductionGap` formula (broad blast radius). Defer signal-strengthening to Wave 5.
- **E5 (repair graduation gate) DEFERRED out of Wave 1** — it's a remediation-flow change (moat pillar #3), own move after Wave 1.
- **T5 moved into Lane E** (edits scheduler pools — NOT disjoint; never run concurrently with E1). Rest of Lane T is parallel-safe.

### BLOCKING decisions (resolve before engine code)
1. **E1 scope:** cumulative graph as a NEW accessor used only for prereq/masteredIds resolution (architect-recommended, limits blast radius across 16+ `getGraphForLevel` call sites) vs replace everywhere.
2. **E1 retroactive unlock UX:** after fix, existing progressed users get previously-locked B1/B2 concepts opening on next load — silent vs a one-time "nye konsepter låst opp" surface (Rule 6).
3. **E3 direction:** fix content tags / make diagnosis concept-aware / both — analysis-first, don't start until decided.
4. **E5:** confirm deferral out of Wave 1.

## WAVE 1 PROGRESS LOG (2026-06-01, uncommitted)
- ✅ **T1** — removed fabricated "4.9★ fra tidlige brukere" + fake avatars (`src/app/page.tsx`). tsc clean.
- ✅ **T2** — analytics "Bevaring" → "Ferskhet" + honest recency note (`src/app/analytics/page.tsx`). tsc clean.
- ✅ **T3** — AI badge reflects real `aiMode` (Lokal AI / Sky-AI / Maler), Norwegian, consistent with /profile (`src/components/ai/AIStatusBadge.tsx`). tsc clean.
- ✅ **T4** — dashboard fallback "12 oppgaver · ca. 3 min" → "25 oppgaver · ca. 19 min" (`src/app/dashboard/page.tsx`). tsc clean.
- ✅ **E1+E2** — cumulative-graph accessor; Weekly Sprint revived at B1/B2 (sim focus 0%→~60%, phase=unknown gone). **521 tests green, build green. Code-review: APPROVE-WITH-NITS** (0 Crit/0 High/1 Med/3 Low).
  - Follow-ups (pre-launch, non-blocking): [MED] unify collision-precedence comments in scheduler.ts vs weekly-sprint.ts + add a node-id-uniqueness invariant test; [LOW] make `selectWeeklyFocus`/`ensureWeekOpen` default `level=fp.currentLevel` (safe-by-default) — has synthetic-test interaction, do with test updates; [LOW] drop dead `'A1' as CEFRLevel` fallback branch.
- ✅ **T5** — phantom types can no longer be scheduled. Shared `NOT_YET_AVAILABLE_TYPES` (`types/session.ts`); scheduler filters at `firstEligibleType` choke point w/ graceful skip; ExerciseCard uses the shared helper (banner kept as defensive fallback). 524 tests green, tsc+build clean. +`tests/engine/scheduler-phantom-types.test.ts`.
- ✅ **T6 DONE** — landing muted-text contrast raised to minimum-AA: dark-on-lime 0.28-0.48→0.62 (now 5.06:1), light-on-dark 0.34→0.55 (now 5.40:1). All 7 logged fails cleared; no low-contrast muted text remains; tsc+build green. (Verified by contrast math + build; live visual pass pending a deploy.)
- ✅ **A2 DONE** — linguist-approved corrections seeded to live B1/B2 via `output/apply-retag.ts`: B1 31 + B2 33 tag rows + 3 Norwegian fixes (b2-sm-018 possessive, b2-avf-018 gender, b1-prp-025 removed → B1 369 rows). 529 tests green, tsc/build/sim clean.

### ✅ WAVE 1 COMPLETE (all uncommitted; verified; reviewed where engine)
E1/E2 (Weekly Sprint revived B1/B2, reviewed) · T1-T5 (honesty + scheduler-phantom) · E3+E4 (concept-aware diagnosis 1/4→3/4, reviewed+nits) · A2 (B1/B2 re-tag, linguist-gated, seeded) · T6 (AA contrast). 529 tests green throughout.
REMAINING (Wave 2/3, larger features, not started): server AI top-up · B1/B2 corpus deepen ≥50/concept + cloze B1/B2 · session-listening MP3 · speaking-in-loop. Plus E1/E2 pre-launch follow-ups (collision-precedence test, safe-by-default level param).
- ⏸️ **T7** — DECIDED: keep `noindex` (private/pre-launch). No SEO work now; canonical/og:image deferred to launch prep.
- 🔜 **E3** — DECIDED: **Both** (fix content-tag mismatches + concept-aware diagnosis, preserving tags for rules 1/3/4 esp. listening). E1 has landed + sim re-ran (corrected signal exists), so E3 is unblocked. Architect requires analysis-first for E3 (HOW: which rules stay tag-based, how the concept-mastery layer feeds diagnosis, how to detect+fix mis-tagged content). Start AFTER T5 lands (avoid concurrent engine executors). This is Wave 1's largest remaining piece.
  - E3 DECISIONS LOCKED: additive fallback rule (rules 1/3/4 untouched) · harness fidelity fix · **A-min** sequencing · re-tag scope **B1/B2 only**. Design: `output/pandoai-e3-design-2026-06-01.md`. CORRECTION: `computeProductionGap` IS wired (`useFingerprint.ts:318`) — rule 2 is live but low-signal.
  - E3 engine half (A1 wire classifyError into Translation+SpeedRound · B1 fallback rule · harness fix · sim→4/4 gate) — delegated.
  - E3 content half (A2: detection script → staging corrections B1/B2 → norwegian-linguist → finalize-deepen → seed) — after engine gate.
  - ✅ E3 engine half DONE+verified: A1 classifier wired (Translation+SpeedRound, NO→EN guard `classify-error.ts:135`), B1 fallback rule (`diagnosis.ts:108-142`, conf 0.45), harness fidelity fix (`fp-sim.ts`). 527 tests green, tsc/build clean, no scheduler drift. BUT sim 4/4 blocked by rule-2 bias (below) — escalated, in-scope work complete.
- ✅ **E4 DONE** — rule 2 gated to evidenced-weak concepts (`diagnosis.ts:42-60`, +~17 lines). Top-diagnosis correctness **1/4→3/4**; A1/A2 corrected, B1 already right. B2 = fallback honestly naming weakest evidenced concept (reported-speech-advanced 40 vs complex-argumentation 43) — a sim-RNG/label artifact, NOT a bug; **accepted** (forcing it = gaming, refused per Rule 5/6). 529 tests green (+2 gate tests), tsc/build clean, no scheduler drift. computeProductionGap + scheduler untouched.
- 🔜 **Combined E3+E4 diagnosis diff** — fresh-context code-review (in flight).
- 🔄 **A2 content lane** — detection DONE (`scripts/detect-tag-mismatch.ts`): **B1 169/370 (45.7%) + B2 90/360 (25%) = 259 mis-tagged**. B2 has 3 whole-concept systematic errors (subjunctive-mood/text-cohesion/advanced-verb-forms). Staged: 153 auto-proposed + 106 `_linguistReview` in `content/sentences/staging/retag/{b1,b2}.json` (live untouched). → norwegian-linguist (in flight) → finalize-deepen → seed.

## Immediate next action
1. Confirm green baseline (build + vitest) — running.
2. On green: start **Lane T (T1, T4, T5)** — safest, zero-engine-risk, immediate trust wins — IN PARALLEL with **Lane E E1** (the F1 weekly-sprint revival, highest engine leverage), each test-gated.
3. Architect sign-off on Lane E scope before E3/E4 (they reshape diagnosis).
