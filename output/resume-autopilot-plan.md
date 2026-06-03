# Scheduled autonomous resume — 2026-06-03 ~08:24 (3h after 05:24)

You (Claude) scheduled this. The user said: *"pause and resume in 3 hours with all that is left according to the plan and recourse direction /autopilot."* Execute the work below autonomously, honoring every hard rail. Report honestly at the end.

## What this run DOES (autonomous, plan-aligned, safe)

**Corpus deepening — B2 production depth toward ≥50 production-eligible / concept.**
Batch 1 (commit e49ed10, live) took the 3 thinnest B2 concepts to ~30 production. Continue:

- **Batch 2:** +~20 production sentences each for `stylistic-variation`, `nuanced-register`, `professional-norwegian` → reach ~50 each.
- **Then** the other 9 B2 concepts (currently ~21 prod each): `complex-argumentation`, `subjunctive-mood`, `reported-speech-advanced`, `advanced-verb-forms`, `advanced-word-order`, `norwegian-idioms`, `advanced-passive`, `academic-writing`, `text-cohesion` — author the gap to ≥50 production, batched (≤3 concepts/batch).

**Per-batch pipeline (NON-NEGOTIABLE order):**
1. `content-author` (subagent) → write to `content/sentences/staging/b2-batchN.json`. Brief MUST say: every sentence's `exercise_types` MUST include a production type (translation-to-norwegian / fill-in-blank / word-order); fill-in-blank needs a `___` gap + answer in notes; genuine B2 register; ids non-colliding (use 200+, 300+… per batch).
2. `norwegian-linguist` (subagent) → review EVERY sentence, PASS/FLAG/REWRITE.
3. **Enforce, don't trust** (the batch-1 lesson): with a node script, (a) drop any sentence with no production type, (b) apply linguist REWRITE corrections, (c) drop broken fill-in-blanks, (d) keep PASS + safe-FLAG only. Print real per-concept production counts.
4. Validate (node): id-uniqueness vs live, schema, fill-in-blank gaps, valid exercise_types, real concept_ids.
5. Merge approved into `content/sentences/b2.json`.
6. `npx vitest run` (expect 624+ pass) + `npm run build` (exit 0).
7. Commit (`content(b2): +N linguist-gated …`) → `git push origin main`.
8. Deploy: `DEST=root@204.168.245.72; ssh … 'cd /var/www/norskcoach && set -e && git pull --ff-only origin main && npm ci && npm run build && V=reload; pm2 "$V" norskcoach --update-env && pm2 save && echo DEPLOY_OK head=$(git rev-parse --short HEAD)'` → verify DEPLOY_OK + `/session` 200.
9. Update memory `project_post_takeover_roadmap.md` corpus item with progress.

**Stop conditions:** B2 priority concepts reach ≥50 production; OR a batch fails the gate badly (low PASS) — stop and report; OR ~4-5 batches done (don't run unbounded); OR any deploy/test failure that isn't a known flake.

## What this run does NOT do (hard limits)
- **NO auth e2e** — it needs the user's inbox/magic-link click; not autonomously completable. Leave parked.
- **NO architectural changes without analysis** (Rule 2): skip P1-4b cross-device lane sync, deepen-normalize-for-nested-conceptMastery (risky — would alter scores), diagnosis-why rebuild. Note them for the user; do not blast them.
- **NO Norwegian content seeded without a `norwegian-linguist` PASS** (hard rail).
- **NO B1 work** — B1 is healthy (~27 prod/concept); B2 is the gap.
- Do not trust any agent's self-reported counts — verify by counting.

## Hard rails (project CLAUDE.md)
- Verify, don't assume (count, don't trust). One gated batch at a time. Honest reporting (state real PASS rates, what was dropped). Deploy verified via tsc/tests/build/200-smoke (gate-runner G1–G6 not available here — note that honestly). New sentences have no MP3 (browser-TTS fallback; fine for written production).

## End-of-run report to the user
- Concepts deepened + before→after production counts; total sentences added; per-batch PASS rates; commits + DEPLOY_OK heads; what remains to ≥50; the still-parked auth e2e + architectural items. Then stop.
