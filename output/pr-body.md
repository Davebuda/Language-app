## Summary

This branch carries **21 commits / 32 files** ahead of `main` across two bodies of work that accumulated here. Both are included in this PR — they are kept as separate commit streams and can be reviewed (or reverted) independently.

### 1. A1/A2 content depth overhaul
- **+189 sentences**: A1 749 → 880 (+131), A2 702 → 760 (+58), sourced through `staging/deepen` and finalized by `scripts/finalize-deepen.ts` (mechanical gate + UUID stamping + 17-tag taxonomy validation).
- **`content-gate.ts` fix**: the capitalization rule wrongly skipped fill-in-blank rows whose blank is the first token (`___ er fra Norge.`) — the blank masks the capitalized word, so the check cannot apply there.
- **`norwegian-linguist` review pass** (per the project rule that the mechanical gate alone is insufficient — ~25% of the new rows were flagged, matching the known false-pass gap):
  - **14 outright errors** fixed — e.g. `et kaldt glass vann` → `et glass kaldt vann` (the *water* is cold, not the glass); `tok … jakke` (implied theft) → `hentet`; mistranslations; wrong answer-notes; mis-tagged concepts/error-tags.
  - **4 B1 sentences mislabeled A2** (epistemic/counterfactual modal-perfect: `måtte ha glemt`, `ville ha bestilt`, `burde ha pakket`, `måtte ha tatt`) **rewritten down to A2** deontic modals — upholds the CLAUDE.md level-integrity rule ("an A1 learner never sees B1+", one level up).
  - Ambiguous fill-in-blanks converted to translation; A2-vocab leakage removed from A1.
  - **Every changed row re-passes the mechanical gate AND a second linguist pass** (30/33 clean on first recheck; the final 3 — including one passive construction introduced by the rewrite — corrected and re-verified).

### 2. Cloze-passage exercise type
Typed-inline-gap cloze passages end-to-end: content types, per-gap pure grader, client passage loader, `ExerciseCard`/`SessionScreen` rendering, per-gap fingerprint + repair, at-most-one-passage-per-session scheduling, honest fallback for unresolved cloze (Rule 6), and tests. A1/A2 pilot passages are linguist-reviewed.

## Verification
- ✅ `a1.json` / `a2.json` parse as valid JSON
- ✅ Mechanical content-gate: 33/33 fixed rows PASS
- ✅ `norwegian-linguist` second pass on all rewritten rows: clean
- ✅ JSON serialization round-trips byte-for-byte (diff is minimal — only changed rows)

## Not done / notes
- **No production deploy** — this is review-only. `origin/main` does not yet carry this work.
- The 4 advanced modal-perfect sentences were **rewritten down**, not preserved at B1. They could be re-added to `b1.json` later at the correct level (with audio).
- New A1/A2 sentences do **not** yet have audio (the +189 are text-only until the edge-tts pass runs).
- Supabase key rotation / deploy remain separate operational steps.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
