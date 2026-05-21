# NorskCoach — Recovery Backlog

Sourced from: `test-reports/stress-walkthrough-2026-05-21/report.md` (third walkthrough, 39 findings) + REVIEW.md (code review 2026-05-11) + prior recovery batch context.

This document supersedes the prior "P0 batch complete" framing. The third walkthrough proves four of the five named P0 pipeline-honesty patterns are regressed and three new Critical AI-quality bugs are shipping live. The P0.5 Recovery Bundle below restructures the roadmap; muntlig scripted roleplay is paused until P0.5-13 signs off.

---

## P0.5 Recovery Bundle — 2026-05-21

The third stress walkthrough demonstrated that the moat's three legs (diagnosis, scheduling, remediation) each have at least one Critical regression. Per CLAUDE.md operating rule 8 ("pipeline honesty"), shipping muntlig scripted roleplay on this foundation guarantees the same regression family in the next walkthrough. Recovery is therefore sequenced before any new feature work.

Tasks are dependency-ordered. P0.5-01 (source verification) ran first. **Re-sequenced 2026-05-21T18:55 per P0.5-01 findings**: concept-id reconciliation moved ahead of corpus retag (depends on canonical scheme); shared tag-map module split out before conversation/journal write-through (both surfaces consume it); session lifecycle split into immediate guards and design-decision items. Full reasoning in `.council/log.md` 2026-05-21T18:55 entry. P0.5-15 (fourth walkthrough) seals the bundle and unblocks muntlig.

| # | Task | Findings addressed | Playwright | Status |
|---|---|---|---|---|
| 01 | Verify walkthrough findings against source code | All Criticals | n/a — audit | ✅ complete |
| 02 | Concept-id reconciliation (graph as source of truth) | F036 + sets up F010, F019 | FULL | ✅ complete |
| 03 | Corpus wiring + orphan placeholder cleanup | F011 + closes F019 | FULL | ✅ complete |
| 04 | Shared error-tag → concept-id module | enables F030, F034 | none — read-only refactor | ✅ complete |
| 05 | Conversation + Journal fingerprint write-through | F030, F034, F028 | FULL | ✅ partial (F028 ✅; F030/F034 AI-quality half rolls into 06) |
| 06 | AI language-validity gate + correction fallback | F022, F029, F033, F030/F034-residual | FULL (deferred to P0.5-15) | ✅ complete |
| 07 | Diagnostic semantics rewrite (OnboardingFlow + engine) | F014, F015, F016, F017, F031 | FULL | ▶ NEXT |
| 08 | Session lifecycle — immediate guards | F023, F026 | SMOKE | pending |
| 09 | Session lifecycle — completion semantics | F012, F024, F025, F027 | FULL | pending |
| 10 | Dashboard stat honesty | F018, F020, F021 | SMOKE | pending |
| 11 | Profile read-on-render | F037, F038 | SMOKE | pending |
| 12 | Onboarding mid-flow state persistence | F013 | SMOKE | pending |
| 13 | Auth/waitlist truthfulness | F002, F004, F006, F007 | SMOKE | pending |
| 14 | Polish bundle | F001, F003, F005, F009, F035 | SMOKE | pending |
| 15 | Fourth stress walkthrough + recovery sign-off | All | FULL | pending |

**Significant findings not yet bucketed** (F008 path-traversal edge case; revisit during 03 or 11) are noted in the live walkthrough report at `test-reports/stress-walkthrough-2026-05-21/_findings.md`.

---

## Walkthrough vs prior P0 recovery — regression map

| Prior P0 pattern (closed 2026-05-21) | Status in third walkthrough | Finding(s) |
|---|---|---|
| AI badge contributes nothing | Partial regression — badge honest about availability, but AI content shipping wrong Norwegian | F022, F029, F033 |
| Error tags contribute nothing | Regressed — all errors collapse to `word-order` | F010 |
| Session progression contributes nothing | Regressed — counter at 0 despite logged errors; /session/complete unguarded | F012, F023 |
| Journal correction contributes nothing | Regressed — zero fingerprint writes from journal | F034 |
| Conversation grammar logging contributes nothing | Regressed — zero fingerprint writes from conversation | F030 |
| Mic auto-activation | Holds | — |
| B1/B2 honest banner | Holds | — |

Detailed evidence at `test-reports/stress-walkthrough-2026-05-21/comparison.md`.

---

## Architectural principle — restated for the new round

The 2026-05-21 first batch closed under the "no-silent-substitution" principle. The third walkthrough proves the principle is harder to keep than to apply: each round of fixes leaves a class of surfaces unverified, the next round of build (muntlig) layers on top, and the foundation cracks under the next walkthrough's load.

Two procedural changes for P0.5:

1. **Fingerprint pre/post diffs are mandatory acceptance evidence for any task that claims to contribute to the engine.** No surface ships without the IndexedDB read before/after demonstrating a write actually landed.
2. **AI output must pass through one shared validity gate.** Three separate AI surfaces all shipping unvalidated prose proves the per-call-site approach does not scale. P0.5-04 puts the gate in one module that every AI surface consumes.

---

## Items inherited from REVIEW.md 2026-05-11 — status

| Item | Status | Notes |
|---|---|---|
| CRITICAL Open-redirect in auth callback | Closed | `safeRedirectPath` in `src/app/auth/callback/route.ts` verified during walkthrough surface 2. Validator slightly broader than advertised (F008 — non-blocking edge case, queued for P0.5-11). |
| CRITICAL Missing env var guard | Unverified in this walkthrough | Needs check during P0.5-11 |
| WARNING prevUserRef stale | Unverified | Re-audit during P0.5-02/03 (touches useFingerprint) |
| WARNING module-level scenarioCursor | Unverified | Re-audit during P0.5-03 (touches useSession) |
| WARNING auto-skip false-correct | Reportedly closed (item 8 in prior recovery) | Re-verify in P0.5-06 |
| WARNING word-order validator | Unverified | Re-audit when content corpus is touched |
| WARNING isAvailable vs isReady | Unverified | Re-audit during P0.5-04 |
| WARNING DB cast without validation | Unverified | Re-audit during P0.5-07 |
| WARNING submitResult stale read | Unverified | Re-audit during P0.5-06 |
| WARNING repair items injected unresolved | Unverified | Re-audit during P0.5-06 |
| INFO items | Tracked but not P0.5-blocking | Slot into P0.5-12 polish |

---

## P0 batch complete — 2026-05-21 (original recovery, prior to third walkthrough)

The eight P0 items from the 2026-05-20 first walkthrough were closed during 2026-05-21. The session loop became completable for the first time. That work stands as the foundation P0.5 is built on; P0.5 closes the regressions the third walkthrough surfaced after that foundation was in place.

For the original closure documentation see git history (commits prior to 2304f3d) and the prior items 1–8 closure notes which lived inline in this file before the third walkthrough.

---

## Items deferred behind P0.5

Per the restructure 2026-05-21:

- **Stream 3 muntlig** — scripted roleplay (step 5 of muntlig sequence). Paused until P0.5-13 signs off.
- **Stream 1.1 — model swap** — three-step path remains deferred; P0.5-04 (AI validity gate) is the bridge that lets the current model ship without further harm while the swap is evaluated separately.
- **v2 backlog** (FSRS, BKT, adaptive decay, vocab SRS) — unchanged.

---

_Updated: 2026-05-21T18:30 — restructured for P0.5 Recovery Bundle following third stress walkthrough._
