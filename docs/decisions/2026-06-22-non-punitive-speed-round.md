# Speed-round misses are non-punitive (no SRS reset, no fingerprint error, no repair loop)

**Date:** 2026-06-22
**Status:** active

## Decision
A wrong answer (or empty timeout submission) on a `speed-round` exercise no longer
moves mastery: `submitResult` (`src/hooks/useSession.ts`) exempts
`exerciseType==='speed-round' && !correct` from `recordFingerprintResult` and from the
repair loop, and advances. The component (`SpeedRound.tsx`) reveals the canonical answer
("Riktig svar: …") with a "Neste" button instead of routing to repair. A *correct*
speed-round still bricks + advances normally.

## Context
Audit finding G-02 (+ S-02): speed-round shows the Norwegian sentence and asks the
learner to translate to English "as fast as you can", then grades by **exact-match
English** under a 30s timer. On a mismatch — or when the timer expires and submits an
empty string (S-02) — the result flowed through the normal wrong-answer path: a phantom
error logged to the diagnosis fingerprint, the SRS ladder reset to 0, and the repair
loop triggered. Exact-match English under time pressure produces "wrong" for valid
paraphrases, speed typos, and timeouts — unreliable evidence.

## Why
Per Operating Rule 8 (Pipeline Honesty), a signal that unreliable must not feed the
mastery/SRS/diagnosis engine as a hard error. Speed-round is rapid *recall* warm-up, not
a precision grammar judge — its "wrong" carries far less information than a deliberate
translation miss. Letting it reset SRS and log diagnosis errors actively poisons the
moat (the fingerprint) with noise. Making it non-punitive keeps the recall practice
while protecting the engine.

## Rejected alternatives
- **Add the translate-EN self-attest recourse card to speed-round** — rejected: an
  interstitial "Ja, jeg forstod" card per miss breaks the rapid-fire format the exercise
  exists for, and it does not cleanly handle the empty-timeout case.
- **Exclude speed-round EN-grading at B1/B2 (where `accepted_answers` = 0)** — rejected:
  narrower, leaves A1/A2 speed-round still punitive on paraphrase, and is a scheduling
  change rather than a fix to the punishment itself.

## Consequences
- Speed-round can no longer reset SRS or write a fingerprint error; it still bricks on a
  correct answer and still records the result in the session-local `results` (so the
  complete-screen accuracy reflects it).
- The repair loop is never entered from a speed-round item.
- If speed-round is ever re-graded with a reliable judge (e.g. a deterministic EN
  verifier or accepted_answers coverage), this exemption can be revisited.
- Locked by the audit registry (`audit/issue-registry.md` G-02/S-02). Recommended
  follow-up test (not yet written): a hook-level test that a speed-round miss does not
  enter repair / does not reset SRS.
