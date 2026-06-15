// Rule-8 live trace for Lever 3 (deterministic gender corrector).
//
// Proves the moat write end-to-end: a lexicon-CONFIRMED gender correction moves mastery,
// logs the error, and resets the SRS ladder — while an unverifiable AI claim (the poisoning
// case, or a two-gender false flag) leaves the fingerprint BYTE-untouched. This is the exact
// composition both gates wire up (verifier verdict → repairFromSurface), tested without React.
import { describe, it, expect } from 'vitest'
import { confirmedGenderRepair } from '@/lib/gender-correction-gate'
import { repairFromSurface } from '@/engine/repair-from-surface'
import { createEmptyFingerprint } from '@/types/fingerprint'
import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'

const graph: ConceptGraph = {
  version: '1',
  language: 'no',
  concepts: [
    {
      id: 'noun-gender',
      label: 'Noun gender',
      description: 'Grammatical gender of nouns',
      errorTags: ['noun-gender'],
      minAttempts: 15,
      minDays: 3,
      prerequisites: [],
      cefrLevel: 'A1',
      masteryThreshold: 80,
    },
  ],
}

// Drives the REAL shared gate both surfaces use (confirmedGenderRepair) — not a mirror.
// Only a 'confirmed' gender correction yields a RepairInput; anything else writes nothing.
function gateAndWrite(
  fp: MistakeFingerprint,
  correction: { original: string; corrected: string },
): MistakeFingerprint {
  const input = confirmedGenderRepair(correction, 'conversation')
  return input ? repairFromSurface(fp, input, graph) : fp
}

function seeded(): MistakeFingerprint {
  const fp = createEmptyFingerprint('trace-user')
  fp.conceptMastery['noun-gender'] = {
    conceptId: 'noun-gender',
    rawScore: 80,
    confidenceScore: 0.5,
    decayedScore: 80,
    attemptCount: 10,
    correctCount: 8,
    uniqueDaysActive: 3,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: new Date().toISOString(),
    streak: 3,
    recentOutcomes: [true, true, true],
    srsLevel: 2,
    nextReviewAt: null,
  }
  return fp
}

describe('Lever 3 — gender-corrector live trace (Rule 8)', () => {
  it('WRITES a confirmed gender error: mastery drops, error logged, SRS reset', () => {
    const before = seeded()
    const after = gateAndWrite(before, { original: 'Jeg har et jobb', corrected: 'Jeg har en jobb' })

    expect(after).not.toBe(before) // a write happened
    const m = after.conceptMastery['noun-gender']
    expect(m.attemptCount).toBe(11)        // attempt recorded
    expect(m.rawScore).toBeLessThan(80)    // wrong answer lowered mastery
    expect(m.srsLevel).toBe(0)             // ladder reset on a wrong answer
    expect(after.recentErrors.length).toBe(1)
    expect(after.recentErrors[0].errorTag).toBe('noun-gender')
    expect(after.recentErrors[0].conceptId).toBe('noun-gender')
  })

  it('does NOT write the poisoning case: AI "corrects" a valid form to a wrong one', () => {
    // Learner wrote the correct "en jobb"; the 8B wrongly proposes "et jobb" (jobb is masc).
    const before = seeded()
    const after = gateAndWrite(before, { original: 'en jobb', corrected: 'et jobb' })

    expect(after).toBe(before)                 // no write at all
    expect(after.recentErrors.length).toBe(0)  // no phantom error logged
    expect(after.conceptMastery['noun-gender'].attemptCount).toBe(10) // mastery untouched
    expect(after.conceptMastery['noun-gender'].srsLevel).toBe(2)
  })

  it('does NOT write the two-gender false flag (en bok / ei bok both valid)', () => {
    const before = seeded()
    const after = gateAndWrite(before, { original: 'en bok', corrected: 'ei bok' })
    expect(after).toBe(before)
    expect(after.recentErrors.length).toBe(0)
  })

  it('does NOT write an OOV noun the lexicon cannot verify', () => {
    const before = seeded()
    const after = gateAndWrite(before, { original: 'et zzqxword', corrected: 'en zzqxword' })
    expect(after).toBe(before)
  })
})
