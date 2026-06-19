# Strategy: Per-Level Content Contract (level gates)

> 2026-06-19 · grounded in a live + code audit (HEAD `f3d9056`). Decisions locked by the user:
> **Remediation rule = remediate-at-level (C).** **Empty-pool policy = generate-at-level, honest-disable only on generation failure.**
> This is a STRATEGY for approval, not an implementation. Depth-not-breadth: it hardens the moat's targeting, it does not add a new surface.

## Why this matters (vision tie-in)
The exercises *are* the product. A learner gains exactly what the engine serves them. Today the engine can serve a B2 learner an A1 listen-and-translate ("Jeg vil ha kaffe") — which teaches a B2 learner nothing and quietly contradicts the north star (production *at the learner's level*) and the moat (root-cause remediation that actually advances them). The contract makes "what a learner gets at each level" an explicit, enforced package instead of an emergent accident.

## Audit evidence (what's actually wrong)
Live: a seeded B2 learner weak on `personal-pronouns` opened a session with a `LYTT` block (listening-comprehension, tagged *Gjennomgang*, item 1/14). The corpus has **99 A1 / 114 A2 / 1 B1 / 0 B2** listening sentences — a B2 listening item cannot exist, so A1/A2 was served.

Code root cause (ranked):
1. `filterSentencesByLevel` (`scheduler.ts:16`) is a **ceiling, never a floor** — passes all A1→B2 down.
2. Cumulative concept graph + `getPrimaryWeakConcepts` (`diagnosis.ts:180`) rank weak A1 roots into a B2 learner's focus with **no level floor**.
3. `difficulty` (1–3) exists on every sentence but is **never read** in selection (zero filter hits).
4. **No exercise-type × level gate** (`scheduler.ts:177`).
5. Generation under-levels by mastery; `validateGenerated` (`validate.ts:204`) checks length, **not** level-appropriateness.

**Corollary:** gating exposes a *content-debt map* — you cannot serve B2 listening because none exists. Gates + content are one problem.

## The artifact: a per-level Content Contract
A single data module — the source of truth every selection/generation seam reads — defining, per CEFR level:
- **Allowed exercise types** (e.g. is `listening-comprehension` offered at B2? only if content/generation can meet it).
- **Difficulty band** — floor + ceiling (the `difficulty` 1–3 field, finally used).
- **Remediation rule = remediate-at-level (C).**
- **Generation constraints** — target level + target concept; validated at-level.
- **Empty-pool policy = generate-at-level → honest-disable on failure.**

It *extends the already-approved per-level-progression design* (A1 foundations / A2 combination / B1 production / B2 lexical-nuance — see memory `project_per_level_progression`), turning it from aspirational into enforced.

## The locked remediation rule — Remediate-at-level (C)
When a learner at level L is weak on a foundational concept X (e.g. B2 learner, weak pronouns):
- **Keep diagnosing X** (the moat — never abandon a real root cause).
- **Serve X inside level-L production** — practice pronouns within B2-complexity sentences, not A1 ones.
- Requires: (a) a way to find/tag level-L sentences that *exercise* concept X (a B2 sentence still contains pronouns, present tense, etc.), and (b) generation that targets "level-L sentence stressing concept X."

This is the genuinely differentiated coaching move: *fix the weakness at the learner's level*, which is both moat (root cause) and north star (at-level production) at once.

## Workstreams (the lift, given C + generate-at-level)
1. **Contract module** — the per-level data artifact + a single accessor; replace ad-hoc level logic with reads from it.
2. **Remediate-at-level selection** — the core engine change: when remediating weak concept X for a level-L learner, pull level-L sentences that exercise X. Needs sentence→secondary-concepts tagging (which lower-level concepts a higher-level sentence also drills) OR an equivalent index.
3. **Generation hardening** — prompt targets (level × concept) + **at-level validation** (close the `validate.ts:204` gap so generate-at-level is trustworthy; the empty-pool policy leans on it). Deterministic level-fit checks preferred over "trust the model" (mirrors the no-unverified-AI-grades-mastery discipline — here it's no-unverified-AI-serves-under-level).
4. **Corpus audit extension** — map coverage per (level × exercise type × concept); report gaps as debt in the standing `audit:corpus`/`audit:gate`.
5. **Honest-disable fallback** — when generation also fails validation, disable that type at that level with an honest state (Rule 6), never a silent A1 fallback.

## External unknowns → Scout (next step)
The contract's difficulty bands and the at-level generation validator depend on knowledge that's partly external:
- How do CEFR-aligned / IRT adaptive systems **define and calibrate item difficulty** to a level? (informs the difficulty band per level + whether `difficulty` 1–3 is the right granularity)
- **Deterministic ways to validate that a Norwegian sentence matches a target CEFR level** (lexical frequency bands, syntactic complexity, length, subordinate-clause depth) — so generate-at-level isn't "trust the LLM."
- How peers handle **remediating a low-level skill for an advanced learner** without dragging them down (does anyone do remediate-at-level, or do they all just floor?).

## Routing (your /prompt-orchestrator /scout /super-orchestrator)
- **Investigate/audit** — DONE (this doc).
- **Scout** — the external unknowns above (now well-scoped because the design decisions are made).
- **Solve / make-plan-pro** — turn the contract + scout findings into a phased, one-diff-per-step execution plan across the 5 workstreams.

## Open risks
- C is the biggest-lift option; workstream 2 (secondary-concept tagging) may be a sizeable content/tagging task — scope it before committing.
- Generate-at-level makes the AI path load-bearing for gap-filling; the at-level validator must be strong or B2 learners get plausible-but-under-level generated content (the same failure class as the gender-poisoning case, one layer up).
- Returning-user safety (Rule 3): if the contract introduces any new fingerprint-read, route through `normalizeFingerprint` + the fixture.
- Don't regress the existing ceiling (`filterSentencesByLevel`) — the floor is additive to it.
