# A1 Depth Overhaul — Progress (paused 2026-06-01)

## Goal
Deepen every A1 concept to **40 sentences** (currently 31–37; ~131 new total).
Audio: **per concept** (generate MP3s right after each concept is seeded).
Branch: `content/a1-depth-overhaul-gate`. Corpus: `content/sentences/a1.json` (749 sentences, 22 concepts).

## Pipeline (per concept)
1. `node output/extract-concept.cjs <concept>` → writes `output/existing-<concept>.json` + prints count/tags/exercise-mix.
2. Dispatch `content-author` → writes `content/sentences/staging/deepen/<concept>.json` (live snake_case, NO id; 7:2 translation-to-norwegian:fill-in-blank; tag from existing). Returns only `WROTE n to ...`.
3. Dispatch `norwegian-linguist` → compact `<idx>: PASS|FLAG|REWRITE` verdict.
4. Apply rewrites/drops; then `node` script: add `crypto.randomUUID()` id to each, validate via `scripts/lib/content-gate.ts`.
5. `npx tsx scripts/seed-staging.ts --dir=content/sentences/staging/deepen --commit`  (append-only, dedups by id+normalized norwegian).
6. `npm run audit:corpus` → confirm 0 ERRORs.
7. `node scripts/generate-audio-node.mjs a1.json` (msedge-tts nb-NO-PernilleNeural; skips ids that already have MP3s).
8. Verify concept count == 40.

## Tooling confirmed
- msedge-tts ✓, tsx ✓ installed. `npm run audit:corpus` = `tsx scripts/audit-corpus.ts`.
- seed-staging requires staging rows in LIVE snake_case with `cefr_level`; dedups by `id` + normalized `norwegian`. We add uuids before seeding (zod in seed-content.ts requires `id` uuid).

## Per-concept gaps to reach 40
personal-pronouns +9*, noun-gender +9, common-modal-verbs +9, to-be-verb +8, basic-adjectives +8,
common-prepositions +7, definite-articles-plural +7, negation +7, adjective-agreement +7, preterite-regular +7,
numbers-basic +6, indefinite-articles +6, to-have-verb +6, v2-word-order +6,
plural-formation +5, question-formation +5, present-tense-regular +4,
definite-articles-singular +3, infinitive-form +3, svo-word-order +3, preterite-irregular-core +3, possessive-pronouns +3.

## STATUS

### ✅ COMPLETE 2026-06-01: all 22 A1 concepts at 40/concept. A1 880 sentences (+131). Audio 880/880. Audit 0 errors. Rounds: pilot(personal-pronouns)+A(5)+B(6)+C(6)+D(4).


### DONE (at 40): personal-pronouns, noun-gender, common-modal-verbs, to-be-verb, basic-adjectives, common-prepositions (6/22). A1 avg 36.3. Audit 0 errors.

### personal-pronouns (PILOT, IN PROGRESS)
- Authored 9 → `content/sentences/staging/deepen/personal-pronouns.json`.
- Linguist verdict: pass=6, flag=2 (usable), rewrite=1.
  - idx5 FLAG: "Dere kan sitte her." — english "You all" slightly unnatural; Norwegian fine. KEEP.
  - idx6 REWRITE: replace `"Det er kaldt i dag."` (expletive det, doesn't test pronoun-choice) with:
    norwegian="Det er boken hennes." english="It is her book." notes=""  ← APPLY THIS EDIT before seeding.
  - idx8 FLAG: "Kjenner ___ hverandre?" (notes "dere") — "hverandre" is A2 vocab; usable as difficulty-3. KEEP.
- NEXT ON RESUME: apply idx6 rewrite → add uuids + gate → seed-staging --commit → audit:corpus → generate-audio → verify personal-pronouns == 40. If clean, batch remaining 21 concepts (3–5 in parallel per round: author → linguist → merge → audio → audit).

## Notes / guardrails
- NEVER seed without a norwegian-linguist pass (memory: gen gate insufficient ~34%).
- Keep agent return payloads tiny (write-to-file + one-line summary) — large returns overflowed context earlier this session.
- Tool display in this session is flaky for long/piped output; prefer `node -e process.stdout.write(<short>)` and chunked reads.
