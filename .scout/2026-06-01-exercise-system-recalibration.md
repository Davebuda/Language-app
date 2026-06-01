# Exercise-System Recalibration — Review Document

**Produced:** 2026-06-01 (scheduled 4h-pause resume). **Status:** ANALYSIS ONLY — awaiting approval. No code written.
**Trigger:** Corpus audit found the app declares 10 `ExerciseType` values but only 6 are real. This recalibrates the path so the *full* exercise system serves the moat + north star without re-triggering the project's documented breadth-not-depth failure mode.
**Reviewed by:** architect subagent (separate context). Its blocking flags are carried below unresolved — they are yours to decide.

---

## 1. The real status of all 10 exercise types (verified, not declared)

| Type | Renderer | Seed content | Scheduler pool | Verdict |
|---|---|---|---|---|
| translation-to-norwegian | `TranslationExercise` | heavy, all levels | Production + New | **LIVE core** |
| fill-in-blank | `FillInBlankExercise` | all levels | Production + New | **LIVE core** |
| word-order | `WordOrderExercise` (lazy) | all levels | Production | **LIVE core** |
| translation-to-english | `TranslationExercise` | all levels | Recognition | **LIVE core** |
| listening-comprehension | `ListeningExercise` | A1/A2 only (~99–114); **B1=1, B2=0** | Recognition + Lytt block | **LIVE, B1/B2 content gap** |
| speed-round | `SpeedRound` | A1/A2 only; **B1=1, B2=0** | Recognition | **LIVE, B1/B2 content gap** |
| sentence-transformation | *shared* `TranslationExercise` — no distinct logic | **0 everywhere** | Production (listed **first**) | **PHANTOM** |
| dictation | *shared* `ListeningExercise` — mechanically identical to listening | **0 everywhere** | none | **PHANTOM / duplicate** |
| reading-comprehension | `NotYetAvailable` banner | 0 | none | **Honest stub** |
| free-writing | `NotYetAvailable` banner | 0 | none | **Honest stub** |

**Two safety facts that change the picture:**
- `firstEligibleType` (scheduler.ts:158) only assigns a type if a sentence actually tags it. So the 4 contentless types are **dormant — never scheduled today.** Not actively broken.
- BUT `ExerciseCard.tsx:87–97` routes `sentence-transformation`→Translation and `dictation`→Listening with no distinct logic. The day anyone tags a sentence with those types, it **silently renders as a different exercise** — a latent Operating-Rule-6 violation. R1 (re-tagging) is exactly the operation that could trip it, which is why honesty cleanup must come first.
- `dictation` and `listening-comprehension` are the **same exercise** ("listen and type what you heard"). One pedagogy, two labels.
- B1/B2 already have audio (360 MP3s each) and `ListeningExercise` has a TTS fallback. So the B1/B2 listening/speed-round gap is a **JSON re-tagging gap, not a sentence-authoring gap.**

---

## 2. The reframe (resolves the moat-vs-north-star tension)

CLAUDE.md says the moat is "**not** the exercise types." True — but that doesn't make exercise types optional. They are:
1. **The delivery mechanism for the north star** — production/speaking output happens *through* exercise types.
2. **The sensor array for the moat** — each type surfaces distinct error tags. word-order catches V2; fill-in-blank catches gender/agreement; cloze catches discourse-level choices. More *distinct* types = wider diagnostic aperture = a stronger diagnosis moat.

**The earned-place test** (use this to judge every type):
> A type earns its place iff it (a) elicits an error signal an existing type doesn't, **OR** (b) pushes genuine production/speaking output — **AND** (c) traces a real write to the fingerprint/mastery/SRS. A re-skin that adds neither new signal nor new production is cut.

This dissolves "build all 10." The goal is the **minimum complete roster** that maximizes signal + production within free-per-user and depth-first constraints.

---

## 3. Recalibrated path (architect-reviewed)

### R0 — Honesty cleanup *(do first; mechanical; smallest)*
Resolve the two phantoms so the type system stops over-promising and the latent Rule-6 bug is killed **before** R1 can trip it.
- `dictation` → merge into `listening-comprehension` (identical pedagogy).
- `sentence-transformation` → stop the silent fallback to Translation.
- **Acceptance:** no type in the union routes to a renderer that implements a *different* exercise.
- **⚠ Decision required — see Blocking Decision A** (remove from union vs. route to honest banner).

### R1 — Content-gap fill *(depth: finishes existing surface; mechanical; tagging only)*
Re-tag B1/B2 sentences with `listening-comprehension` + `speed-round` so every *implemented* type works at every level. Audio + TTS already exist → near-zero authoring.
- **This is hardening the current phase, not new surface.** Highest leverage / lowest risk item in the plan.
- **Acceptance (mandatory, per Rule 8 + roadmap.md:25 procedural lock):** a fingerprint **pre/post diff** — a B1 listening item, answered in a real session, lands an error-log entry and moves a mastery/SRS value. "The tag now appears" is *not* acceptance.
- **Scope fence:** tagging only. A B1 sentence missing audio is an adjacent issue to *note*, not fix in this pass.

### R2 — Cloze passage *(already decided + gated; runs on its own track)*
The one genuinely new exercise. Justified by north star (discourse-level pushed output) + moat (per-gap diagnostic signal). Already specced (`docs/superpowers/specs/2026-06-01-cloze-passage-design.md`), already an *explicit* user override of Rule 1 (Wave 6.3, logged so the deviation is visible), already architect-gated. **Proceed via its existing plan — do not entangle with R0/R1.**

### Cut / Defer
- **free-writing → CUT** (keep honest banner). The **journal already does focus-biased free writing + AI correction feeding the engine.** A second free-writing surface is duplicate surface with no new signal — fails the earned-place test.
- **reading-comprehension → DEFER** (keep honest banner). Recognition-heavy, weakest north-star fit. Lowest priority backlog.
- **sentence-transformation as a real build → DEFER to backlog** (NOT a sequenced step — see Blocking Decision C). Architect's position: it is a *second* breadth exception masquerading as "recalibration"; one sanctioned breadth exception (cloze) at a time. Its strongest argument ("highest unbuilt diagnostic value") is also its biggest tell.

---

## 4. On the original Task 5 (feature-challenger + feature-to-layout-director)
**Correctly NOT invoked.** Those skills design *new surface*. After architect review there is **no surviving new surface to design this cycle**: R0/R1 are mechanical, R2 is already specced, R3 is deferred to backlog. Invoking them now would manufacture the breadth the recalibration exists to prevent. They re-enter only if Blocking Decision C sanctions `sentence-transformation`.

---

## 5. Blocking decisions (yours — resolve before any code)

**A. R0 mechanism — the plan's one genuine reversible decision.**
Remove `sentence-transformation` + `dictation` from the `ExerciseType` union (cleaner, but discards the type if R3 is ever sanctioned), **or** route their fallbacks to the honest `NotYetAvailable` banner (contained, reversible, preserves the option)?

**B. Cloze (R2) sequencing contention with R0/R1.**
Cloze is IN DESIGN now. Does R0 run *before* cloze implementation (architect's rec — R0 is tiny and removes a bug R1 could trip), then cloze proceeds, then R1? Or does everything queue behind cloze? "One move at a time" (Rule 4) means this can't stay implicit.

**C. `sentence-transformation` — backlog candidate or real build this cycle?**
Architect flags building it as BLOCKING breadth. If you want it real, it needs its **own** explicit Rule-1 override on record (like cloze got) + a feature-challenger pass *before* it enters any sequence. Default recommendation: **defer to backlog.**

---

## 6. Recommended answer (if you want the depth-first default)
A → **route to honest banner** (reversible, preserves option). B → **R0 now, then cloze, then R1.** C → **defer to backlog.**
This keeps exactly one breadth exception in flight (cloze), finishes the existing surface (R1), and ships zero net-new exercise types beyond the one already sanctioned.
