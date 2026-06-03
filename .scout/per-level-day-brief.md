# Scout Brief: "The Per-Level Day" — daily/weekly progression system

**Date:** 2026-06-02 · **Run mode:** deep (4 targeted lanes) · **Caveat:** perplexity + Exa keys 401 → WebSearch/WebFetch fallback; confidence tagged. Complements `.scout/last-brief.md` (per-level meters: Strava/Memrise/Apple already covered).

---

## The four un-scouted questions → answers

### (a) Daily OBJECTIVE framing
- **Skill-shaped objectives are honest; quantity targets are hollow.** Only **Babbel** (can-do: "Order food"), **Khan** (mastery-state Familiar→Proficient→Mastered on a named skill), **Elsa** (adapting score) open with a real *skill* objective. Duolingo/Memrise/Sololearn lead with XP/word/lesson *counts* — documented as "illusion of mastery." [Confirmed]
- **No app reframes the *kind* of objective by CEFR band** — difficulty escalates, but the objective type stays the same. NorskCoach's A1-foundations → B2-activate-words shift is **genuine whitespace.** [Inferred]
- **→ Recommend:** open each day with a Norwegian *skill* objective reframed per level, tied to a Khan-style wall that closes **only when the engine records real production**; promote the existing diagnostic "focus reason" to the objective's "why."

### (b) Appropriate daily VOLUME by level
- **Differentiate by level — but on the right axis.** New-item ceiling is a roughly **flat cognitive constant (~15–20 new/day; retention collapses past ~20/session)** — it does NOT scale up with proficiency. [Confirmed]
- **What SHOULD rise with level: total volume (via review+production pools), PRODUCTION SHARE, and item difficulty** — not new-item count. Production share should rise **monotonically** with level (Swain pushed-output; receptive always outpaces productive). CEFR hours rising per level (~60–80h A1 → ~500–600h B2) corroborate more *sustained* dosage later. [Confirmed]
- **→ Recommend:** keep new pool modest/flat (~5–8/day); ramp total modestly by level (~20 → ~32); **shift recognition→production ratio up by level** rather than just adding questions; respect a 10–25 min session ceiling (split, don't bloat). NorskCoach's flat 25-for-all is the gap — the fix is *ratio*, not just *count*.

### (c) Objective/mission exercise UNITS
- **Multi-question-one-objective is the validated default**, not an exception — every serious app encodes classroom **gradual release (model → guide → release / "I do, we do, you do")**. NorskCoach's instinct is structurally correct. [Confirmed]
- **Brilliant is the cleanest model:** concept intro → guided problems with **fading scaffolds** (wrong → hint, never the answer) → cold practice set. Duolingo lesson ≤17 Qs, "recognize first → type by the end." Busuu: teach-all-language-before-asking-you-to-produce, ends on production. [Confirmed]
- **The fading scaffold is what distinguishes an objective UNIT from a flat drill.** Units = **3–8 signal-questions, one concept/error-tag, always close on unscaffolded production**; ONE objective header + per-step bar; gate at unit level. [Confirmed]
- **→ Recommend:** make model→guide→release **visible** per step; conjugation-drill + nuance-discrimination should **reuse the read→recite→write shell** (the `/skriv` 3-step pattern already shipped).

### (d) Anti-exhaustion CONTENT strategy (ranked, cheapest-first)
1. **Exercise-type multiplication + auto-cloze (ship now, $0, zero AI risk).** One vetted sentence → translation + cloze + word-order + listening = **~4–6× effective daily items** — genuinely different *retrieval modes*, not padding. **Auto-blanking the sentence's own `error_tags_detectable` token deterministically generates cloze** → closes the "0 cloze at B1/B2" gap with no new authoring. [Confirmed]
2. **SRS spaced reuse as a feature.** Re-showing passed items on the existing 1→3→7→14→30 ladder is legitimate spaced repetition (review:new 5:1+ is normal), + cue-faded receptive→productive reframings (Bjork desirable difficulty). Free. [Confirmed]
3. **AI-gen behind a linguist gate as an *offline corpus accelerator*** (never live). NB-Llama/Ollama few-shot seeded from vetted sentences → mechanical + self-consistency gate → linguist spot-review survivors. Groq free tier makes gen ≈$0; **reviewer time is the bottleneck.** Mechanical gate alone passes only ~11–34% real-quality Norwegian — grammar-constrained decoding guarantees *format*, never *correctness*. [Confirmed]

---

## Synthesis — "The Per-Level Day" (one connected system)
Each day at each level **opens with a level-shaped skill objective** → the session serves it with a **production-share that rises by level** (not just more items) and **objective units** (read-respond ✓, cloze, conjugation-drill, nuance-discrimination) built on gradual-release → **every answer lays a proportional brick on a per-level daily WALL** (A1 foundations / A2 combinations / B1 clauses produced / B2 words activated) → **days stack into a weekly SPRINT** re-framed as that level metric. Sustained by **exercise-type multiplication + auto-cloze + SRS reuse** (cheap) with **AI-gen-behind-linguist-gate** as the offline corpus accelerator.

## Sequencing reality (cheapest → hardest)
1. **Auto-cloze + exercise-type multiplication** — biggest daily-depth win, near-zero cost, closes B1/B2 cloze gap. **Do first.**
2. **Per-level production-share ramp** (scheduler recipe by level) — evidence-backed, code-only (no new content).
3. **Per-level daily WALL + weekly SPRINT UI** (the brick representation, level-lensed) — gated behind Move-2 honesty fixes.
4. **Daily objective header** — the visible spine tying it together.
5. **B2 objective types** (nuance-discrimination → conjugation-drill) + the +472 corpus deepen — highest authoring cost, slowest.

Honesty rails throughout: no fake progress; every brick = a real engine write; AI always has a non-AI fallback; guided/scaffolded worth less than free production.
