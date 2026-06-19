# Level Coverage Audit — canonical CEFR-Norwegian standard vs app reality

> 2026-06-19 · extends p6 (level-appropriateness). Where p6 stops *sub-level* content leaking DOWN, this audits whether each level TEACHES THE FULL CURRICULUM it should — across all parameters and modules.
> Evidence: `.scout/lane-curriculum-standard.md` (the standard) + `.scout/lane-app-coverage.md` (the app). **Caveat:** the official Norwegian curriculum is communicative (can-do), not grammar-listed; grammar level-boundaries are reconstructed from the de-facto textbook sequence (På vei→Stein på stein→Her på berget) with a ±0.5-level margin — a strong guide, not gospel.

## Headline
The app **diagnoses well but does not teach the full curriculum evenly**. Two structural failures, in priority order:
1. **The four skills are not served across all levels.** Listening collapses above A2 (B1 = 1 sentence, **B2 = 0**); speed-round same. A learner literally cannot train listening at B1/B2.
2. **Productive/skill modules are single-level islands, not a ladder.** Cloze = A1/A2 only · Reading texts = B1 only · /skriv = B1 only · /ord = B2 only · Vocab = B2 only. No level has the full module set; the "production ladder" is discontinuous.

The grammar/concept *core* (in-session sentences) is actually healthy — corpus depth is good everywhere (30–76 sentences/concept, no thin concepts). The holes are in **skills breadth** and **per-level module completeness**, plus a few honesty bugs.

## Gap matrix (standard → app)

### A. Skills coverage (the biggest gap)
| Skill | Standard expects | App reality | Gap |
|---|---|---|---|
| Listening | Core at every level; B1/B2 = extended/implicit speech | A1≈99, A2≈114, **B1=1, B2=0** | **Severe** — no listening training above A2 |
| Reading | Texts at every level | Reading texts **B1 only (6)**; cloze A1/A2 only | Severe — A1/A2/B2 have no graded reading; B1/B2 no cloze |
| Speaking | Every level (roleplay/recite/shadow) | Roleplay A2 **silently falls back to A1** (Rule 6 bug); /skriv recite B1-only | Honesty bug + single-level |
| Writing | Every level | Journal all-levels; /skriv write B1-only | /skriv ladder missing A1/A2/B2 |

### B. Grammar / concept completeness vs the load-bearing gates
| Standard gate | Where it must live | App status | Action |
|---|---|---|---|
| **A2:** *ikke*/setningsadverb BEFORE verb in subordinate clauses (most error-prone NO L2 structure) | A2 | Verify a concept exists at A2 (`sentence-adverbials` is in staging/deepen) | Confirm + ensure exercised + error-tagged |
| **B1:** subordinate-clause word order MASTERED + s-/bli-passive contrast | B1 | B1 has 12 concepts incl. conditional/indirect-speech; passive in deepen | Confirm the *mastery* gate concept exists + is drilled |
| **B2:** control under spontaneity — cleft/topicalization, hedging/modality, register, få-passiv, self-correction | B2 | B2 track is **lexical-nuance (vocab clusters)**; discourse-control parameters likely **under-served** | Add B2 discourse-control concepts/content |
| Compound words (sammensatte ord) — core, all levels, esp. B1/B2 | All | **Exercisable ONLY at A2** | Add compound-word coverage B1/B2 |
| Concept breadth | B1 introduces a lot | B1/B2 = **12 concepts** vs A1/A2 = 22 | Audit B1/B2 graph vs the standard's B1/B2 inventory; likely under-broad at B1 |

### C. Diagnostic surface per level (error-tag coverage of canonical 17)
| Level | Tags exercisable | Note |
|---|---|---|
| A1 | 14/17 | missing compound-word, wrong-word-diff-category, meaning-misunderstood |
| A2 | **17/17** | full |
| B1 | 12/17 | missing compound-word, wrong-word-diff, spelling, listening-recognition, reading-parsing |
| B2 | **9/17** | missing noun-gender, article-use, pronoun-choice, modal-verb, compound-word, spelling, listening-recognition… |
- **Nuance:** B2 *should* be light on gender/article *teaching* (that's A1/A2). But a B2 learner WEAK on gender (the p6 remediate-at-level case) needs gender **exercisable at B2** — which today it isn't. **p6's multi-skill tagging (Q-matrix) directly widens the B2 diagnostic surface** by making B2 sentences advertise the foundational skills they also exercise. So B and p6 reinforce each other.

### D. Honesty bugs (Rule 6) — fix regardless
- Roleplay **A2 silently serves A1** scenarios. → honest A2 set or honest "kommer".
- /listen **A2 = 1 item** (effectively empty). → author or honest-disable.

## Sample audit (eyeball)
Samples pulled per level (full set in `.scout/lane-app-coverage.md`) read level-appropriate: A1 SVO/articles, A2 comparatives/time, B1 passive/double-definite/idioms, B2 argumentation/cohesion. **In-session sentence quality is not the problem** — coverage breadth across skills/modules is.

## The level-up plan (extends p6 — this is p6's "completeness" half)
The p6 **Content Contract** should encode, per level, not just difficulty bands but a **curriculum-coverage checklist** (which concepts/skills/error-tags each level MUST serve). The audit then becomes a standing gate. Workstreams, by leverage:

- **W1 — Skills parity: B1/B2 listening (highest priority).** Author B1/B2 `listening-comprehension` content (linguist-gated); until authored, p6's generate-at-level + honest-disable prevents the silent A1 leak. This is the clearest "fails to serve the purpose."
- **W2 — Module ladder.** Decide per module: extend to all levels (cloze B1/B2, reading A1/A2/B2, /skriv ladder) OR honestly scope it in the contract. No silent single-level islands presented as universal.
- **W3 — Grammar gate completeness.** Verify + fill the three load-bearing gates (A2 setningsadverbial, B1 subordinate mastery + passive contrast, B2 discourse-control: cleft/topicalization/hedging/register). Audit B1/B2 concept graphs against the standard's inventory; add missing nodes.
- **W4 — Diagnostic surface.** Widen B2 (largely via p6 multi-skill tagging) + add compound-word exercisability at B1/B2.
- **W5 — Honesty fixes.** Roleplay A2; /listen A2.
- **W6 — Encode curriculum inventory into the Contract** + extend `audit:corpus` to gate coverage (concept × level × skill × error-tag), so a missing gate WARNs forever.

## Sequencing note
This is a **content-authoring-heavy** program (linguist-gated, per memory `project_content_gen_gate_insufficient`), not mostly code. It sits inside p6 as the completeness dimension. Recommended first move: **W6 (encode the contract/coverage checklist) + W1 (B1/B2 listening)** — the checklist makes every other gap visible and gated; listening is the sharpest failure. W3/W4 fold into p6's tagging + contract work already planned.

## Open risks
- Grammar level-boundaries are ±0.5-level estimates — calibrate concept placement against the can-do outcomes + textbook sequence, not the matrix alone.
- Content authoring throughput (linguist gate) is the real constraint — phase by level/skill, never bulk-seed ungated.
- Don't over-build B2 morphology drills — B2 is *control*, not new structures; weight B2 toward discourse/register/spontaneity, not more gender drills.
