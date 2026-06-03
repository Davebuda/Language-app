# Verify QA/walkthrough findings reproduce on HEAD before fixing them

**Date:** 2026-06-03
**Status:** active

## Decision
Before implementing fixes for any QA-walkthrough or audit finding, verify each finding
still reproduces on HEAD (local production build + Playwright), treating "stale deployed
build" as a first-class hypothesis. Only fix what genuinely reproduces.

## Context
A 2026-06-03 live walkthrough flagged the core session loop as broken across ~7 "Critical"
findings (3a unpassable graders, 3b blank cards, 3c radio-button word-order, 3d repair
retry testing a random sentence, 2a off-by-one explanation, 2b level stuck at A1). A
runtime re-verification of HEAD (local `next build && next start` + Playwright walkthrough:
onboarding → 12-Q adaptive diagnostic → dashboard → progress → session → forced repair)
found **every one already fixed in HEAD**. The walkthrough had run against a stale deploy;
the live site simply lagged HEAD. The real corrective action was deploying HEAD, not coding.

## Why
- **Operating Rule 3 (verify, don't assume).** "It's reported broken" is not evidence it's
  broken in current code.
- Implementing fixes for already-fixed bugs wastes effort and risks regressions on working code.
- Distinguishes the two failure classes that look identical from a walkthrough:
  genuine HEAD bug vs stale-deploy artifact — only the first warrants a code change.

## Rejected alternatives
- **Trust the walkthrough/plan severity at face value and start fixing** — would have
  re-implemented fixes for 3d/3c/3a/2a/2b that already exist, churning working code.
- **Deploy blindly without re-verification** — wouldn't have isolated the genuine
  residuals (which turned out to be minor: paraphrase rigidity + 2 content key errors).

## Consequences
- QA findings are gated by a HEAD-reproduction check before any fix is scoped.
- The live site must be kept `== HEAD` (deploy after verified merges); a stale deploy is
  now a known, named risk.
- The 2026-06-03 walkthrough's "Critical" set was reclassified as stale-deploy; genuine
  residual work shrank to formatting/paraphrase grading (`3a`) and two content key errors.
  See `output/qa-walkthrough-remediation-plan-2026-06-03.md` (RUNTIME-VERIFIED section) and
  memory `project_qa_walkthrough_2026_06_03`.
