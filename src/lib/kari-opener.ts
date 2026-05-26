import { NORWEGIAN_CONCEPT_LABELS } from '@/lib/journal-prompts'

// Map concept IDs to conversation topic IDs
// Each concept maps to the topic where it's most naturally exercised
const CONCEPT_TO_TOPIC: Record<string, string> = {
  // A1
  'personal-pronouns': 'family',
  'noun-gender': 'food',
  'to-be-verb': 'daily-routine',
  'numbers-basic': 'food',
  'common-prepositions': 'norway',
  'indefinite-articles': 'food',
  'plural-formation': 'food',
  'definite-articles-singular': 'daily-routine',
  'definite-articles-plural': 'daily-routine',
  'present-tense-regular': 'daily-routine',
  'infinitive-form': 'hobbies',
  'to-have-verb': 'family',
  'svo-word-order': 'daily-routine',
  'v2-word-order': 'daily-routine',
  'negation': 'food',
  'question-formation': 'work',
  'basic-adjectives': 'norway',
  'adjective-agreement': 'norway',
  'common-modal-verbs': 'work',
  'preterite-regular': 'hobbies',
  'preterite-irregular-core': 'hobbies',
  'possessive-pronouns': 'family',
  // A2
  'perfect-tense': 'hobbies',
  'future-constructions': 'work',
  'passive-voice': 'work',
  'comparative-adjectives': 'norway',
  'superlative-adjectives': 'norway',
  'reflexive-verbs': 'daily-routine',
  'object-pronouns': 'family',
  'subordinate-clauses': 'work',
  'relative-clauses': 'hobbies',
  'conjunctions': 'daily-routine',
  'advanced-prepositions': 'norway',
  'time-expressions': 'daily-routine',
  'modal-verbs-advanced': 'work',
}

interface ConceptMasteryEntry {
  decayedScore?: number
}

export interface FocusTopicSuggestion {
  topicId: string
  focusConceptId: string | null
  focusLabel: string | null
}

/**
 * Pick the conversation topic that best covers the user's weekly focus concepts.
 * Strategy: map each focus concept to a topic, tally, pick the topic with most hits.
 * Among tied topics, prefer the one whose focus concept has the lowest decayedScore.
 * Returns fallback (daily-routine, no focus) when weeklyFocus is empty or unmapped.
 */
export function suggestFocusTopic(
  weeklyFocus: string[],
  conceptMastery: Record<string, ConceptMasteryEntry>,
): FocusTopicSuggestion {
  const fallback: FocusTopicSuggestion = { topicId: 'daily-routine', focusConceptId: null, focusLabel: null }
  if (!weeklyFocus.length) return fallback

  // Tally topics and track the weakest concept per topic
  const topicCounts = new Map<string, number>()
  const topicWeakest = new Map<string, { conceptId: string; score: number }>()

  for (const conceptId of weeklyFocus) {
    const topicId = CONCEPT_TO_TOPIC[conceptId]
    if (!topicId) continue

    topicCounts.set(topicId, (topicCounts.get(topicId) ?? 0) + 1)
    const score = conceptMastery[conceptId]?.decayedScore ?? 0
    const current = topicWeakest.get(topicId)
    if (!current || score < current.score) {
      topicWeakest.set(topicId, { conceptId, score })
    }
  }

  if (topicCounts.size === 0) return fallback

  // Pick topic with most focus-concept coverage
  let bestTopic = ''
  let bestCount = 0
  let bestWeakestScore = Infinity
  for (const [topicId, count] of topicCounts) {
    const weakest = topicWeakest.get(topicId)
    if (!weakest) continue
    if (count > bestCount || (count === bestCount && weakest.score < bestWeakestScore)) {
      bestTopic = topicId
      bestCount = count
      bestWeakestScore = weakest.score
    }
  }

  const weakestConcept = topicWeakest.get(bestTopic)
  if (!weakestConcept) return fallback
  const label = NORWEGIAN_CONCEPT_LABELS[weakestConcept.conceptId] ?? null
  if (!label) return fallback // Operating Rule 6: no English in Norwegian UI

  return {
    topicId: bestTopic,
    focusConceptId: weakestConcept.conceptId,
    focusLabel: label,
  }
}

/**
 * Build a soft focus hint for the conversation system prompt.
 * Guides Kari to naturally use constructions that expose the focus concept.
 */
export function buildFocusHint(focusLabel: string): string {
  return `Prøv å bruke setninger som eksponerer: ${focusLabel}. Ikke nevn dette eksplisitt.`
}
