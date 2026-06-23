// Pure eligibility gate deciding which saved notebook items may enter the
// daily økt. Implements the HYBRID gate from the locked direction doc:
//
//   An item is eligible when it is DUE (nextReviewAt is null [never practiced]
//   OR nextReviewAt <= now) AND at least one of:
//     (a) item.promoted === true          — explicit learner "practice this" intent
//     (b) item.conceptId is set AND that concept is weak or decaying in the
//         fingerprint                     — diagnostic relevance
//
// Archived items are unconditionally excluded.
//
// "Weak/decaying" reuses the two helpers already consumed by the scheduler:
//   - getPrimaryWeakConcepts(fingerprint, limit) — bottom-N by decayedScore
//     (no hardcoded score threshold; limit capped at all concepts by passing
//      Infinity-safe large number so every weak concept qualifies, not just top-5)
//   - getDecayingConcepts(fingerprint)           — rawScore≥70, decayedScore<70
//
// Rationale: the scheduler uses both; reusing them keeps the notebook gate
// coherent with the session engine rather than inventing a new threshold.

import type { NotebookItem } from '@/types/notebook'
import type { MistakeFingerprint } from '@/types/fingerprint'
import { getPrimaryWeakConcepts, getDecayingConcepts } from '@/engine/diagnosis'

// We only need the conceptMastery slice of the fingerprint here, but the
// Pick type is expressed on the public MistakeFingerprint to stay consistent
// with the plan's function signature.
type FingerprintSlice = Pick<MistakeFingerprint, 'conceptMastery'>

/**
 * Returns the subset of `items` eligible to enter the daily økt, per the
 * HYBRID gate (explicit intent OR diagnostic relevance) filtered to SRS-due.
 *
 * Pure and deterministic: does NOT mutate inputs, has no side effects.
 *
 * @param items       - Full notebook item list (all users' saved items)
 * @param fingerprint - Minimal fingerprint slice: { conceptMastery }
 * @param now         - Injection point for the current time (default: new Date())
 */
export function getEligibleNotebookItems(
  items: NotebookItem[],
  fingerprint: FingerprintSlice,
  now?: Date,
): NotebookItem[] {
  const effectiveNow = now ?? new Date()
  const nowIso = effectiveNow.toISOString()

  // Build the set of weak/decaying conceptIds using the same helpers the
  // scheduler uses, so the notebook gate and session engine agree on what
  // "weak" means.
  //
  // getPrimaryWeakConcepts requires the full MistakeFingerprint (it accesses
  // .conceptMastery). We construct a minimal stub that satisfies the function
  // signature without pulling in unrelated fields. The helpers only read
  // .conceptMastery internally, so the cast is safe.
  const fingerprintStub = fingerprint as MistakeFingerprint
  // No limit cap: surface every concept with attemptCount>0, not just top-5.
  // We pass a large number so every weak concept is captured, mirroring the
  // scheduler's intent: "pull up to 5 focus concepts" is a UX budget, not the
  // definition of weak. The eligibility gate has no session-slot budget.
  const weakConceptIds = new Set<string>(getPrimaryWeakConcepts(fingerprintStub, Number.MAX_SAFE_INTEGER))
  const decayingConceptIds = new Set<string>(getDecayingConcepts(fingerprintStub))

  return items.filter((item) => {
    // 1. Never include archived items
    if (item.reviewStatus === 'archived') return false

    // 2. Must be SRS-due: never-practiced (null) OR due date has arrived
    const isDue =
      item.nextReviewAt === null ||
      item.nextReviewAt <= nowIso

    if (!isDue) return false

    // 3. HYBRID gate — at least one path must fire
    // Path (a): explicit "practice this" intent
    if (item.promoted) return true

    // Path (b): diagnostic relevance — conceptId is set AND that concept is
    // weak or decaying in the fingerprint
    if (
      item.conceptId != null &&
      item.conceptId !== '' &&
      (weakConceptIds.has(item.conceptId) || decayingConceptIds.has(item.conceptId))
    ) {
      return true
    }

    return false
  })
}
