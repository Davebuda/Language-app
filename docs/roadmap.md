# NorskCoach — Roadmap

The current build sequence with every research-validated priority locked in. This document supersedes earlier scattered planning. If you want to know what's next, what's deferred, and why — start here.

## Current Position

The engine is complete and verified. The UI transformation is in progress (UI-0 done, UI-1.0 typeface done, UI-1.1 onboarding done; UI-1.2 session loop next). Two research passes (one on muntlig zero-cost solutions, one on engine validation) closed every major second-guess and surfaced three correctness gaps in what was assumed working.

The plan now interleaves three streams: surgical engine corrections from the validation research, the continuing UI transformation, and the muntlig module as the next major build after both converge.

---

## Stream 1 — Engine Corrections

These four changes are correctness, not optimization. They emerged from the validation research and address things that have been silently degrading the system. **They are not peers — 1.1 is a correctness gate; 1.2–1.4 are deferred until UI-1.2 is verified done.** Order within 1.2–1.4 matters; see the operating sequence below.

### 1.1 Swap to NB-Llama-3.2-3B — CORRECTNESS GATE, starts now

**Why:** Vanilla Llama-3.2-3B has known failure modes on Norwegian — English drift, V2 word-order violations, fabricated compound words. Every shipped AI surface (conversation, constraint evaluation, semantic grading, mistake explanations) is currently running on a degraded model. This is a live correctness defect across the entire AI surface, not an enhancement. The National Library of Norway has released NB-Llama-3.2-3B, fine-tuned on Norwegian Bokmål and Nynorsk, same architecture, same web-llm runtime.

**Scope:** Change the model identifier in the WebLLM initialization. Run `/eval` harness (19 tasks × 3 runs, browser-based, outputs JSON for manual rating — not automated). Fluent Norwegian speaker reviews the downloaded JSON and rates outputs. Native speaker review is the verification gate, not eval numbers alone.

**Eval harness state:** Real and runnable at `/eval`. Covers generate, explain, detect, conversation, review. Human-evaluated output, not automated pass/fail. Exists now; no harness build needed before the swap.

**Native speaker — provisional gate (Option B):** No native speaker lined up. The user reviews the `/eval` JSON output at their current Norwegian level. A1's pass condition is provisional: (a) no English drift visible in outputs, (b) no V2 word-order violations, (c) no obvious grammar errors detectable at the user's level. Native speaker review is queued as a follow-up validation that must complete before any muntlig content generation depends on the model. This makes the gate unblocking but not final.

**Acceptance:** Conversation responses, mistake explanations, sentence generation, and constraint evaluation all run on NB-Llama; native speaker confirms no English drift and correct V2 word order in generated sentences.

**Runs in parallel with:** UI-1.2 scoping pass (different subsystem — AI worker, not session loop UI tree). Does not run concurrently with UI-1.2 build; A1 must complete before the build starts to avoid confounding regressions.

**Priority:** Highest. Unblocks muntlig. Fixes a live defect.

### 1.2 Shorten decay half-life — deferred to post-UI-1.2

**Why:** Current half-life is 46 days. Forgetting-curve research shows the steepest decay happens in the first month. The floor-of-35 concept is correct; the half-life is too slow.

**Scope:** Change the half-life constant in `applyDecayWithFloor` from 46 to ~25 days. No other changes. The floor stays at 35.

**Acceptance:** Trace at minimum three points along the decay curve (not just one): rawScore 85 at 30 days, rawScore 60 at 45 days, rawScore 50 at 60 days — confirm all sit materially lower under the new constant without punching through the floor of 35.

**Priority:** Medium. One-constant change. Do as a standalone move after UI-1.2 ships.

### 1.3 Calibration window for first 5 sessions — deferred to post-A2, analysis-first

**Why:** Diagnostic-seeded estimates have wide confidence intervals for the first ~5 sessions. The engine should gather data aggressively and personalize less aggressively until real performance data accumulates.

**Scope:** Add a `calibration_sessions_remaining` counter to the fingerprint (initialized to 5 after diagnostic). While > 0, the scheduler skews toward variety: wider concept pool, reduced repeat-concept allowance, slightly higher new-material weight. Decrement on session completion. Standard behavior resumes after 5.

**Architecture note — requires analysis pass before coding:** This is not a one-constant change. Three questions must be answered before a line is written: (1) does the counter live in the fingerprint blob or as a separate field? (2) how do existing users (no calibration flag in their fingerprint) get initialized — default to 0 or treated as post-calibration? (3) does the scheduler read the flag from the Zustand store directly or from a derived selector? Brief 2–3 option analysis required; stop for approval before building.

**Acceptance:** First 5 sessions cover more distinct concepts than later sessions; the fingerprint records the calibration flag; standard behavior resumes correctly after session 5.

**Priority:** Medium. Improves first-impression experience. Slot after A2.

### 1.4 Anonymized event logging — deferred to post-A3

**Why:** All learner state is a JSON blob. There is no way to query "does the repair loop accelerate learning?" — the architectural moat is unproven without data. The fix doesn't compromise local-first privacy; it adds a parallel write of anonymized events.

**Scope:** A new Postgres table `learning_events_log`. Schema: `{event_type, concept_id, correct_bool, timestamp, anonymous_session_id}` — no user id, no content. Write fire-and-forget on session completion for auth users. Anonymous guests excluded. Nothing reads it back in v1; it exists for future analytics.

**`anonymous_session_id` scheme — decided:** Per-user-hashed (one-way hash of the user id). Rationale: the log's purpose is longitudinal — "does repair loop usage correlate with mastery gains over time?" Per-session-random cannot answer that. Per-device-stable compromises the privacy story. Per-user-hashed gives per-learner continuity while keeping the analytics dataset structurally separate from user-identifying data.

**Acceptance:** Sessions produce log rows; no PII in the schema; anonymous guests produce no rows; existing learner-facing flows unchanged.

**Priority:** Medium. Cheap to add now; impossible to retroactively backfill. Slot after A3. Has future-value-only payoff and can wait the longest of the four corrections.

---

## Stream 2 — UI Transformation (in progress)

Aesthetic and component foundation laid. Continuing through the screens in the architect's reordered sequence (simplest surface first to prove the visual language; most complex last).

### UI-0 — Foundation (DONE)

Diff triage, aesthetic direction declared, token contract resolved (--nc-red* is the single brand system, violet dropped), commit sequence staged.

### UI-1.0 — Typeface + Primitive Audit (DONE)

Schibsted Grotesk selected as single family. Shadcn primitives audited; install at the surface that needs them, not speculatively. Type scale documented in `docs/ui-1/` and inherited by subsequent screens.

### UI-1.1 — Onboarding Pass (DONE)

White-buttons-on-dark-canvas slop fixed. Tokens remapped. `role="progressbar"` accessibility added without a Radix install. PlacementQuiz cleanup. The type scale was applied and verified — T1 prompt is the dominant element. The "Norwegian dominates" principle was sharpened in docs to apply to learning surfaces, not assessment surfaces.

### UI-1.2 — Session Loop (NEXT — scoping starts now, build starts after A1 ships)

The single most important screen. The moat made visible — repair loop card, all exercise subtypes, explanation surfaces. On this screen the "Norwegian is the hero" principle is load-bearing and non-exempt. Folds in the GrammarExplainerCard height:auto fix.

The scoping pass (architect-led) runs in parallel with A1. The build does not start until A1 is verified done — this prevents any regression ambiguity between model-output changes and UI changes.

**Acceptance — concrete and measurable:** Norwegian prompt must be at minimum 1.6× the type-size of any answer option, sit in the upper third of the card, and use the highest font weight on screen. A breakpoint screenshot passes if all three conditions are met; it fails if any are not. Tune the ratio after the first screenshot if needed, but commit to the measurable form before building. Four breakpoints: 375px, 768px, 1280px, 1920px.

### UI-1.3 — Dashboard

Composition pass once the session loop has set the component vocabulary. Wires or removes dead buttons (hamburger, notifications, share).

### UI-2 — Remaining Screens

Conversation, Progress, Landing. Order TBD by architect when UI-1 closes.

### UI-3 — Cleanup

Dead `nc-*` classes removed, dead buttons resolved one way or the other, single Lighthouse pass.

---

## Stream 3 — Muntlig Module (next major build after UI-1 converges)

The full speaking-practice system. Designed, costed, and validated as zero-cost-buildable in `docs/muntlig/architecture.md`. Will require:

- Batch-generating Norwegian audio with chatterbox-tts-norwegian (offline, stored as static files)
- Seeding content from the NoCoLA dataset (144,867 learner-corrected Norwegian sentences, free)
- Implementing the four modes: shadowing, scripted roleplay, pronunciation drills, listen-and-respond
- Self-listening playback + rule-based heuristics for pronunciation feedback (not phoneme-level scoring, which is impossible at zero cost — and that's research-supported as pedagogically fine)
- Visible JavaScript countdown for listen-and-respond timing

Do not start muntlig until NB-Llama is in place — there's no point building local-AI content variation on a model that produces bad Norwegian.

See `docs/muntlig/architecture.md` for the full spec.

---

## v2 / Deferred Backlog

Things that are real, designed or discussed, and correctly parked until the working system is whole.

- **FSRS or ARTS adaptive spacing** — research says it outperforms fixed ladder by 20–30% in review load. v1 fixed ladder is "adequate and defensible." Migrate in v2 when there's data to tune against.
- **Bayesian Knowledge Tracing instead of EMA** — more principled mastery model. EMA + slip detection approximates BKT's core idea and is "good enough for v1." Migrate in v2 if data shows it's needed.
- **Vocabulary SRS** — schema exists, no content seeded, no UI. Full feature build, deferred.
- **Listening module** — designed (the six-phase authentic-content engagement), content sourcing is the hard part. Defer until a Norwegian content partner is secured or audio generation pipeline is in place.
- **B1/B2 concept graph** — currently selecting B1/B2 shows an honest banner explaining the user is practicing A2 at higher intensity. Building real B1/B2 concept graphs is content authoring work, deferred.
- **Reading comprehension scoring** — `/reading` shows hardcoded texts without scoring. Needs concept-tagged passages and question generation. Deferred.
- **Pronunciation scoring at phoneme level** — research confirmed this is impossible at zero cost. Defer permanently or until revenue justifies a paid API (Speechace, Azure Speech).
- **Adaptive per-user decay half-life** — Duolingo-style HLR personalized per user and item. Strong improvement; v2.

---

## Validated As Fine — Stop Second-Guessing These

The validation research closed these debates. They're settled. Do not reopen them without new evidence.

- **12-question adaptive diagnostic** — rough placement (±1 CEFR sublevel), acceptable with calibration window and recalibration feature in place.
- **Constrained-response practice** — research-backed (Swain, Conti EPI). Your phase model handles the constraint ratio correctly (heavier constraints in intro/practice, lighter in consolidation/maintenance).
- **Decay toward a floor of 35** — concept correct, just tune the half-life (see Stream 1.2).
- **Input/production preference with per-level defaults** — A1 input-heavy, A2/B1 balanced, B2 production-heavy, user-overridable. Smart and SLA-supported.
- **JSON blob fingerprint for v1** — defensible local-first architecture. Address analytics blindness with the event log (Stream 1.4), not by re-architecting the fingerprint.
- **Repair loop with template explanations + AI upgrade** — every error tag has a template; AI replaces it async when available. Both paths work.

---

## The Competitive Truth

The validation research was explicit: the engine architecture (fingerprint + repair loop + phase model + production-gap tracking) is genuinely differentiated. No Norwegian app does root-cause diagnosis. Lingu has adaptive placement but not continuous adaptation. Babbel and Busuu have Norwegian but fixed curriculum and paid.

The feature set (SRS, exercise types) is table stakes. Everyone has those.

The moat is the diagnostic coaching intelligence — but it's an architectural bet, not proven differentiation, until there's usage data showing the repair loop actually accelerates learning versus simpler approaches. That's why the event logging (Stream 1.4) isn't just analytics; it's the only way the moat ever gets proven.

---

## Operating Sequence

The literal next moves, in order, until further notice:

0. ~~Resolve the native speaker question for A1.~~ **Resolved — Option B.** User reviews `/eval` JSON at their current Norwegian level. Native speaker review queued as follow-up before muntlig content generation.
1. **A1 model swap + UI-1.2 scoping pass run in parallel.** A1 touches only the AI worker. UI-1.2 scoping is architect-led (enumerate exercise subtypes, verify the acceptance test, bound the GrammarExplainerCard fix scope). No build code written yet.
2. **A1 verifies (native speaker reviews `/eval` JSON output).** Once verified, the AI worker is stable for the duration of the UI work.
3. **UI-1.2 builds and verifies against the concrete acceptance test.** Four breakpoint screenshots required. One move; no engine corrections run concurrently.
4. **A2 (decay half-life).** Standalone, one-constant change, multi-point trace verification. After UI-1.2 ships.
5. **A3 (calibration window).** Analysis pass first (fingerprint schema, migration, scheduler integration — 2–3 options, stop for approval). Build after analysis is approved. After A2.
6. **A4 (event log).** Migration + write call. `anonymous_session_id` scheme is already decided (per-user-hashed). After A3.
7. **UI-1.3 dashboard, then UI-2 remaining screens, then UI-3 cleanup.**
8. **Muntlig module** as the next major build phase.
9. **v2 backlog** when the working app has real users and real data.

Anything proposed outside this sequence is breadth, and breadth without justification is the failure mode we've already paid for.

---

## The Moat (Permanent Context)

Three things working together. Everything serves these:

1. **Diagnosis** — knowing precisely what the learner is failing at, including root causes.
2. **Scheduling** — generating a personalized session that mixes remediation, review, new material, and interleaving.
3. **Remediation** — every wrong answer triggers explain → micro-drill → retry → schedule for spaced review.

AI is a power tool. AI is never the headline. Every AI path has a non-AI fallback.

---

## The North Star (Results Principle)

The app exists to make the user speak more Norwegian and build sentences confidently. Two layered outcomes: production fluency and speaking confidence. Every feature pushes toward production. The muntlig module is the most literal embodiment of this and exists for it.

---

## When in Doubt

Re-read the moat and the north star. Every decision should trace to one of them. If it doesn't, it's probably out of scope — raise it, don't build it.
