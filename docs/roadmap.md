# NorskCoach — Roadmap

The single source of truth for what's done, what's next, what's deferred, and why. Supersedes earlier brainstorm and plan documents. When this disagrees with anything in chat history or earlier docs, this wins.

*Updated after the second research round (Perplexity, full system review).*

---

## The State of the Project

### The engine is complete and verified

The adaptive engine — the thing that makes this app different from Duolingo — is built, traced, and verified correct. Every piece below has been confirmed in code:

- **Diagnostic placement.** 12-question adaptive quiz, IRT-style, seeds the fingerprint at rawScore 60 (correct) / 20 (wrong).
- **Mistake fingerprint.** JSON blob in IndexedDB, syncs to Supabase. Tracks per-concept mastery, confidence, decay, errors, production gap, speaking minutes, input/production preference.
- **Mastery scoring.** Phase-adaptive exponential moving average with slip detection (a single miss after a strong streak counts for only 30% weight).
- **Decay.** Currently 46-day half-life toward floor of 35. Half-life to be shortened to 21–30 days — see "Must change" below.
- **Phase model.** locked → intro → practice → consolidation → maintenance, computed live.
- **Concept dependency graph.** A1 + A2 fully authored. B1/B2 deferred.
- **Scheduler.** Recipe 40/30/20/10, pulls 5 weak concepts, SRS-driven review pool, repeat cap, production guarantee, shuffle.
- **Diagnosis engine.** Four root-cause rules running on real error data.
- **Repair loop.** Template explanation + 2 micro-drills + retry + SRS scheduling on the ladder 1→3→7→14→30 days.
- **Error tagging.** Uses sentence's real `error_tags_detectable`, not guessed from exercise type. Fingerprint is no longer poisoned.
- **Content dedup.** No repeated sentence within a session.
- **Full pipeline parity.** Session, conversation, AND journal all feed the identical mastery + SRS pipeline. This makes the speaking-first principle structurally honest.

### Features in code

- Diagnostic (`/onboarding`)
- Dashboard
- Session loop (`/session`) with repair loop
- Conversation mode (`/conversation`) with AI tutor and constraint system
- Journal (`/journal`) with AI writing review
- Reading (`/reading`) — hardcoded texts, no scoring
- Recalibration (`/recalibrate`)
- Progress, profile

### Features designed but not built

- Muntlig speaking modes (shadowing, scripted roleplay, pronunciation drills, listen-and-respond) — spec in `docs/muntlig/architecture.md`
- Listening module (authentic-audio six-phase engagement)
- Vocab SRS
- B1/B2 concept graphs and content
- Reading comprehension scoring

### Stubs and dead UI

- `/vocab`, `/shadow` are "notify me" placeholders
- Landing page email form is cosmetic
- Several dashboard buttons (hamburger, notifications, share) are dead

### UI transformation status

In progress. Engine is done; the working system needed a real face.

- **UI-0 complete:** dirty diff triaged, aesthetic direction declared ("precise dark intelligence — Norwegian is the hero"), token contract resolved to a single red system.
- **UI-1.0 complete:** typeface decided as Schibsted Grotesk (designed by Norwegian media company for Scandinavian digital reading), shadcn primitive audit done.
- **UI-1.1 complete:** onboarding pass — quiz button slop fixed, accessibility added, typography scale documented as a system.
- **UI-1.2 session loop** — next sub-phase, not started.

---

## What Changes Based on the Latest Research

The second Perplexity research round closed every remaining second-guess. The findings split cleanly into three categories.

### Must change — act on these immediately

These are correctness fixes, not optimizations. They're cheap, research-backed, and several have been silently degrading the app.

**1. Switch the local model to NB-Llama-3.2-3B.**

The single most important finding. Vanilla Llama-3.2-3B has poor Norwegian support. The National Library of Norway has released NB-Llama-3.2-3B, fine-tuned on Norwegian Bokmål and Nynorsk, same architecture, same web-llm runtime. This is close to a drop-in swap. Every AI feature shipped so far (conversation, constraint evaluation, semantic grading) has been running on a model that drifts to English and breaks V2 word order. Fix this before any new AI feature is built, including muntlig.

**2. Reduce decay half-life to 21–30 days.**

The 46-day half-life is too slow. Research shows the steepest forgetting happens in the first month. The floor concept (decay toward 35, not zero) is correct and stays — Duolingo does the same. Just the half-life shortens. One constant change in the engine.

**3. Add a calibration window for the first 5 sessions.**

Diagnostic-seeded adaptation works, but its confidence intervals are wide. The first 5 sessions should explicitly be "calibration mode" — gather data aggressively (more variety in concept selection, less aggressive optimization toward the diagnostic's initial estimates). After 5 sessions, re-estimate mastery using real performance data. This reconciles the earlier cold-start debate: the loop adapts from session one, but it shouldn't over-trust the diagnostic until it has real signal.

**4. Start writing anonymized event logs.**

One additional Postgres table — concept_id, correct/incorrect, timestamp, exercise type — written on session completion. This doesn't change the JSON-blob fingerprint architecture; it just adds an analytics path alongside it. Critical because: the moat (adaptive engine vs. simpler approaches) is an architectural bet until proven with data, and without event logs that proof is impossible to construct later.

### Should change in v2 — correctly deferred

These are real improvements, but the v1 versions are research-confirmed as "adequate and defensible." Don't touch them now; revisit when v1 is stable and there's signal.

- Migrate to FSRS or ARTS instead of the fixed SRS ladder. Adaptive spacing meaningfully outperforms fixed intervals, but the fixed ladder is fine for v1 and the bigger pedagogical win comes from the repair loop and concept dependencies you already have.
- Implement proper Bayesian Knowledge Tracing instead of EMA. BKT is more principled (your slip-detection is essentially a hand-tuned BKT p(slip) parameter), but EMA + slip is good enough for v1.
- Dual storage architecture for the fingerprint. The JSON blob is fine for v1; the event log added above gives you the cross-user analytics path without breaking the local-first architecture.

### Validated as fine — stop second-guessing

The research explicitly confirmed these are correct as built. Don't re-open them.

- The 12-question diagnostic (rough placement ±1 CEFR sublevel is acceptable when followed by real-performance calibration).
- Constrained-response practice (Swain's Output Hypothesis, Conti EPI — your phase-adaptive constraint ratio is correct).
- Decay-to-floor (Duolingo and forgetting-curve research agree — learners retain latent knowledge).
- Input/production user preference (smart). Research suggests level-based defaults: A1 input-heavy, A2–B1 balanced, B2 production-heavy.
- Per-concept dependency graph (more important for grammar than perfect spacing intervals).

### The honest competitive question

The research answered this directly. The engine architecture — fingerprint + repair loop + phase model + production-gap tracking — is genuinely differentiated. No Norwegian app does root-cause diagnosis. Lingu has adaptive placement but not continuous adaptation. Babbel/Busuu have Norwegian but fixed curriculum and paid. The feature set (SRS, exercise types) is table stakes; the moat is the diagnostic coaching intelligence.

But: this is an architectural bet, not proven differentiation, until usage data shows the repair loop actually accelerates learning versus simpler approaches. That's the strategic reason event logging cannot wait for v2.

---

## The Updated Build Sequence

The model swap moves to the top. Everything else slots behind it. This sequence is durable — Claude Code and the architect work to it, not chat history.

### Phase A — Engine corrections (small, mandatory, cheap)

**A1.** Swap to NB-Llama-3.2-3B in web-llm. Re-validate all AI tasks (mistake explanations, semantic grading, constraint evaluation, conversation replies) against the Norwegian eval harness. Have native speaker review outputs.

**A2.** Reduce decay half-life to 21–30 days (single constant change in `engine/fingerprint`).

**A3.** Add the 5-session calibration window flag and gather-data-aggressively behavior to the scheduler.

**A4.** Add the anonymized event-log table and write to it on session completion (and on repair-triggered, level-changed, conversation-completed).

### Phase B — UI transformation (in progress, continues)

- **B1.** UI-1.2 session loop (next sub-phase, gated through the architect).
- **B2.** UI-1.3 dashboard.
- **B3.** UI-2 remaining screens (conversation, progress, landing).
- **B4.** UI-3 cleanup (dead buttons, dead classes, single Lighthouse pass).

### Phase C — Muntlig module (designed, ready to build, depends on Phase A1)

The complete zero-cost speaking practice system, specced in `docs/muntlig/architecture.md`. Four modes:

- Shadowing
- Scripted roleplay scenarios
- Pronunciation drills
- Listen-and-respond

Built on NB-Llama for content variation, batch-generated open-source Norwegian TTS for audio (Chatterbox-Norwegian + small native corpus for highest-value sentences), self-listening + rule-based heuristics for pronunciation (no phoneme-level scoring at zero cost is possible, confirmed), NoCoLA dataset (144k native-corrected Norwegian sentences, free) as the seed corpus.

Cannot start before Phase A1 (model swap). The content generation pipeline depends on the model actually producing valid Norwegian.

### Phase D — Deferred backlog

These were designed or discussed and are correctly parked. Don't build until earlier phases are stable.

- Vocab SRS (full feature, schema exists but unused)
- Listening module (six-phase authentic-audio engagement, needs content sourcing)
- B1/B2 concept graph authoring + content
- Reading comprehension scoring
- v2 engine upgrades (FSRS, BKT, dual storage proper)
- Dead UI cleanup (hamburger menu, notifications, share, landing email form)

---

## Operating Principles

These have been hard-won across this project. They are the rails for every decision going forward.

1. **Depth, not breadth.** Don't add feature surface while foundations are incomplete. The cost of breadth-while-foundations-open has been documented and felt in this project.
2. **Analysis-first on decisions; direct on mechanics.** Architectural choices need 2–3 options analyzed against criteria. Mechanical changes go directly to diff. Don't analyze one-liners; don't build architectural changes without analysis.
3. **Verify, don't assume.** Concrete traces against acceptance criteria before declaring done. This caught the cold-start audit being wrong, confirmed conversation parity, and surfaced the diagnostic question structure ambiguity in UI-1.1. Mandatory.
4. **One move at a time.** Finish, verify, summarize, stop. Don't chain into the next move unprompted.
5. **Surface drift, don't route around it.** If a request seems to contradict the moat, the north star, or this roadmap, raise it as an explicit question.
6. **No silent substitution.** Honest banners over silent fallbacks (e.g. B1/B2 running A2 content).
7. **Scope discipline on prompts.** Fix X means fix X. Note adjacent issues, don't act on them.

---

## The Moat (Permanent Context)

Three things working together. Everything serves these:

1. **Diagnosis** — knowing precisely what the learner is failing at, including root causes under surface mistakes.
2. **Scheduling** — generating a personalized session that mixes remediation, review, new material, and interleaving.
3. **Remediation** — every wrong answer triggers explain → micro-drill → retry → schedule for spaced review.

AI is a power tool. AI is never the headline. Every AI path has a non-AI fallback.

---

## The North Star (Results Principle)

The app exists to make the user speak more Norwegian and build sentences confidently. Two layered outcomes: production fluency (can construct sentences) and speaking confidence (actually does, in low-stakes varied contexts). Every feature must push toward production. The muntlig module is the most literal embodiment of this principle and is why Phase C exists.

---

## When in Doubt

Re-read the moat and the north star. Every decision should trace to one of them. If it doesn't, it's probably out of scope — raise it, don't build it.
