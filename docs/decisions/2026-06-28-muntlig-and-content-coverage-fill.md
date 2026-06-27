# Fill the per-level content gaps in the standalone practice lanes (speaking, reading, cloze, drills)

**Date:** 2026-06-28
**Status:** active

## Decision
The "bespoke-pool" practice lanes — Lytt og svar, Rollespill, the reading library,
A2 cloze, and the pronunciation drill — were deepened to give every CEFR level
level-appropriate content, authored under a strict **author → norwegian-linguist
gate → Dave approval → wire → deploy** workflow. Shipped + live on pandoai.no across
6 commits (`2de6ccf` … `e476724`).

What shipped:
- **Lytt og svar:** A1/B1/B2 8→16 prompts each; A2 got 8 dedicated prompts (was
  borrowing A1). All 32 new prompts got TTS audio (edge-tts `nb-NO-PernilleNeural`).
- **Rollespill:** A1/B1/B2 3→5 scenarios each; A2 got 3 dedicated scenarios.
- **Reading library (/reading):** +4 B1, +4 B2 texts; the library + level functions
  + filter tabs widened A1–B2 so B1/B2 no longer read below-level.
- **Cloze A2:** 2→4 passages (perfect tense, comparatives).
- **Uttale-drill:** each sound group deepened 5→8 words (+audio). NOT split per level.

## Context
A gap analysis (grounding: `output/level-coverage-audit-2026-06-19.md` + a live
inventory) found the corpus-fed lanes (session loop, Skygging, weekly check) are deep
and auto-scale, but the bespoke-pool lanes were seeded small at MVP and never scaled.
A2 in particular had ZERO dedicated speaking content (it borrowed A1 behind an honest
banner), and B1/B2 read below level. The honesty layer was intact (no silent
substitution), so the issue was pool depth, not dishonest gating.

## Why
The north star is to make the learner *produce* Norwegian. The speaking lanes feed the
fingerprint and are the most production-aligned surfaces, so filling them (especially the
empty A2 sets) was the highest-value work. Every new "below-level" banner now correctly
turns off where dedicated content exists. The linguist gate was load-bearing: across the
batches it caught real grammar errors that `tsc`/lint/tests could never catch — a
present-vs-past conditional ("ville gjort" vs "ville gjøre"), a model answer labelled a
"cleft" that wasn't, a present-perfect mistagged as past-perfect, a subjectless hint, and
a drill word ("kylling") unreliable for its target sound due to the kj/sj merger.

## Rejected alternatives
- **Per-level pronunciation drill sets (A1-basic → B2-advanced)** — rejected as
  over-engineering (Operating Rule 1). The 4 sound groups (kj/sj/ø/retroflex) are the
  hardest Norwegian phonemes for learners at *every* level; "A1 vs B2 pronunciation" is
  artificial. Deepened the shared pool instead (5→8 words/group).
- **AI-generate the content without a linguist pass** — rejected per memory
  `project_content_gen_gate_insufficient` (generated Norwegian passes review ~11–34%).
  Everything was authored then gated by `norwegian-linguist`.
- **Author audio later / leave prompts text-first** — initially deferred, then done in the
  same effort once edge-tts was confirmed working in-environment.

## Consequences
- Audio MP3s live in `public/audio/sentences/` which is **gitignored** ("Generated
  audio (deploy to VPS, not git)"); they ship via **tar-scp to the server**, not git. The
  44 new MP3s were tar-scp'd; the source (audioUrl wiring) went via git.
- Three locked level-gating tests were updated to the new reality (A2 listen/roleplay
  serve their own sets; reading serves A1–B2) — they now assert dedicated content via
  id-prefix / level checks.
- Comparative-cloze gaps are tagged `adjective-agreement` to match the corpus convention
  (40 comparative sentences use it; no comparative-specific canonical tag exists) — a
  documented imprecision, chosen for consistency.
- Drafts live under `content/staging/**` (gitignored) as the linguist-review record.
- **Remaining:** none of the bespoke lanes are now empty at any level. Future deepening is
  optional, not a gap.
