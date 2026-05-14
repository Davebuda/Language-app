import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptGraph } from '@/types/concepts'
import { getConceptPhase } from '@/engine'

export interface ResponseConstraint {
  conceptId: string
  conceptLabel: string
  type: 'use-tense' | 'use-word' | 'use-connector' | 'sentence-count'
  instruction: string   // shown to user, e.g. "Use the present tense"
  evaluationHint: string // passed to AI to evaluate
}

// Map concept ID to a constraint the user can demonstrate in open-ended output
function conceptToConstraint(
  conceptId: string,
  conceptLabel: string,
): ResponseConstraint | null {
  const map: Record<string, Pick<ResponseConstraint, 'type' | 'instruction' | 'evaluationHint'>> = {
    'present-tense-verbs': {
      type: 'use-tense',
      instruction: 'Use at least one verb in the present tense (-r ending)',
      evaluationHint: 'Does the response contain a correctly conjugated present-tense verb?',
    },
    'past-tense-regular': {
      type: 'use-tense',
      instruction: 'Use at least one verb in the past tense (-et / -te)',
      evaluationHint: 'Does the response contain a correctly conjugated past-tense verb?',
    },
    'modal-verbs': {
      type: 'use-tense',
      instruction: 'Use a modal verb (kan, vil, skal, or må)',
      evaluationHint: 'Does the response use a modal verb followed by a bare infinitive (no "å")?',
    },
    'negation-placement': {
      type: 'use-word',
      instruction: 'Include "ikke" in a sentence',
      evaluationHint: 'Is "ikke" placed correctly (after the finite verb in a main clause)?',
    },
    'v2-word-order': {
      type: 'use-tense',
      instruction: 'Start a sentence with a time expression (e.g. "I dag", "Nå", "Ofte")',
      evaluationHint: 'When starting with an adverb/time expression, is V2 order maintained (verb before subject)?',
    },
    'adjective-agreement': {
      type: 'use-word',
      instruction: 'Use at least one adjective that agrees with its noun',
      evaluationHint: 'Is the adjective correctly inflected for the noun gender and definiteness?',
    },
    'question-formation': {
      type: 'use-tense',
      instruction: 'Ask a question using inverted word order',
      evaluationHint: 'Is the question formed with subject-verb inversion?',
    },
    'prepositions-place': {
      type: 'use-word',
      instruction: 'Use a preposition of place (i, på, til, or fra)',
      evaluationHint: 'Is the preposition of place used correctly?',
    },
  }

  const spec = map[conceptId]
  if (!spec) return null

  return { conceptId, conceptLabel, ...spec }
}

/**
 * Select a constraint for the current session based on concepts in
 * 'practice' or 'consolidation' phase — the sweet spot where the
 * learner knows enough to try but still needs repetition.
 */
export function selectConstraint(
  fingerprint: MistakeFingerprint,
  graph: ConceptGraph,
): ResponseConstraint | null {
  const masteredIds = new Set<string>()
  for (const concept of graph.concepts) {
    const m = fingerprint.conceptMastery[concept.id]
    if (m && m.rawScore >= concept.masteryThreshold && m.attemptCount >= concept.minAttempts) {
      masteredIds.add(concept.id)
    }
  }

  // Prioritise 'practice' phase concepts, then 'consolidation'
  const practice: ResponseConstraint[] = []
  const consolidation: ResponseConstraint[] = []

  for (const concept of graph.concepts) {
    const mastery = fingerprint.conceptMastery[concept.id]
    const phase = getConceptPhase(mastery, concept.prerequisites, masteredIds)
    if (phase !== 'practice' && phase !== 'consolidation') continue

    const constraint = conceptToConstraint(concept.id, concept.label)
    if (!constraint) continue

    if (phase === 'practice') practice.push(constraint)
    else consolidation.push(constraint)
  }

  const pool = practice.length > 0 ? practice : consolidation
  if (pool.length === 0) return null

  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * Build a prompt suffix that asks the AI to evaluate whether the constraint was met.
 * Used in conversation and journal review prompts.
 */
export function buildConstraintEvalPrompt(constraint: ResponseConstraint): string {
  return `

CONSTRAINT CHECK: The learner was asked to: "${constraint.instruction}"
After your response, on a new line output exactly one of:
CONSTRAINT_MET
CONSTRAINT_MISSED: <one sentence explaining what was missing>`
}
