// Generate one seeded fingerprint per CEFR level for the Phase-A audit.
// Mostly-mastered (so prereqs are met and nothing locks) + a few weak & SRS-due
// concepts so the scheduler emits remediation + review + new-material + interleaving.
// run: npx tsx output/gen-fingerprints.ts
import { writeFileSync } from 'node:fs'
import { createEmptyFingerprint, type MistakeFingerprint, type ConceptMastery } from '../src/types/fingerprint'
import { getGraphForLevel } from '../src/lib/concept-graph-loader'

const NOW = Date.parse('2026-06-02T09:00:00Z')
const daysAgo = (n: number) => new Date(NOW - n * 864e5).toISOString()

function mastered(conceptId: string): ConceptMastery {
  return {
    conceptId, rawScore: 82, confidenceScore: 0.85, decayedScore: 80,
    attemptCount: 22, correctCount: 19, uniqueDaysActive: 6,
    lastAttemptAt: daysAgo(1), lastCorrectAt: daysAgo(1), streak: 4,
    recentOutcomes: [true, true, false, true, true],
    srsLevel: 3, nextReviewAt: daysAgo(0), // due now → feeds the review pool
  }
}
function weak(conceptId: string): ConceptMastery {
  return {
    conceptId, rawScore: 38, confidenceScore: 0.55, decayedScore: 36,
    attemptCount: 9, correctCount: 3, uniqueDaysActive: 3,
    lastAttemptAt: daysAgo(2), lastCorrectAt: daysAgo(3), streak: 0,
    recentOutcomes: [false, true, false, false, true],
    srsLevel: 1, nextReviewAt: daysAgo(0),
  }
}

const LEVELS = ['A1', 'A2', 'B1', 'B2'] as const
for (const level of LEVELS) {
  const fp = createEmptyFingerprint('audit-user') as MistakeFingerprint
  fp.currentLevel = level
  fp.levelSetByUser = true
  fp.totalSessionsCompleted = 12
  fp.calibrationSessionsRemaining = 0
  fp.lastSessionAt = daysAgo(1)

  const graph = getGraphForLevel(level)
  const concepts = graph.concepts as Array<{ id: string; prerequisites?: string[]; prereqIds?: string[] }>
  const weakCount = Math.min(3, concepts.length)
  concepts.forEach((c, i) => {
    fp.conceptMastery[c.id] = i < weakCount ? weak(c.id) : mastered(c.id)
  })
  // Defensive: any referenced prerequisite not in this graph gets a mastered entry
  // so getConceptPhase never returns 'locked' for a cross-level prereq.
  for (const c of concepts) {
    for (const p of (c.prerequisites ?? c.prereqIds ?? [])) {
      if (!fp.conceptMastery[p]) fp.conceptMastery[p] = mastered(p)
    }
  }

  fp.weeklyFocus = concepts.slice(0, weakCount).map((c) => c.id)
  fp.weekStartedAt = daysAgo(2)

  writeFileSync(`output/fp-${level}.json`, JSON.stringify(fp))
  console.log(`${level}: ${concepts.length} concepts, ${weakCount} weak, ${Object.keys(fp.conceptMastery).length} mastery entries`)
}
console.log('done')
