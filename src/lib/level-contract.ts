// ── Per-level Content Contract ───────────────────────────────────────────────
// The single source of truth for what each CEFR level should serve. Two halves:
//
//   (a) GATING (p6): difficulty band + remediation floor-relaxation — so an
//       advanced learner is not served trivial sub-level content, and remediation
//       of a foundational weakness happens AT the learner's level (CD-CAT logic).
//   (b) COMPLETENESS: the curriculum yardstick — which exercise types, diagnostic
//       error-tags, skills, and grammar gates each level MUST cover. `audit:corpus`
//       reads this and WARNs on every gap (a missing gate becomes tracked debt).
//
// HONESTY CAVEAT: the official Norwegian curriculum (HK-dir) is communicative
// (can-do), not a grammar list. Grammar level-boundaries here are reconstructed
// from the de-facto textbook sequence (På vei → Stein på stein → Her på berget)
// with a ±0.5-level margin (see output/level-coverage-audit-2026-06-19.md). Treat
// difficultyFloor/Ceiling and expectedErrorTags as a CALIBRATED yardstick, not law;
// calibrate against the can-do outcomes + the corpus self-distribution.

import type { CEFRLevel } from '@/types/fingerprint'
import type { ExerciseType } from '@/types/session'
import type { ErrorTag } from '@/types/taxonomy'
import type { DifficultyTier } from '@/types/content'

export type LanguageSkill = 'listening' | 'reading' | 'speaking' | 'writing'

export interface LevelContract {
  level: CEFRLevel
  // ── Gating half ──────────────────────────────────────────────────────────
  /** Min within-level difficulty tier preferred for an at-level item (1–3). */
  difficultyFloor: DifficultyTier
  /** Max within-level difficulty tier (1–3). */
  difficultyCeiling: DifficultyTier
  /**
   * How many CEFR levels BELOW the learner remediation may reach as a
   * comprehensibility fallback. Remediation prefers at-level content first
   * (remediate-at-level); this is the ALEKS "ready-to-learn fringe" escape hatch,
   * used only when no at-level item exercises the weak skill.
   */
  remediationFloorRelaxLevels: number
  // ── Completeness half ────────────────────────────────────────────────────
  /** Exercise types the level should OFFER. audit:corpus WARNs when an allowed type has thin/zero corpus coverage. */
  allowedExerciseTypes: ExerciseType[]
  /** The diagnostic surface the level must be able to exercise. audit:corpus WARNs on expected-but-absent tags. */
  expectedErrorTags: ErrorTag[]
  /** Skills the level must serve (yardstick for the cross-module coverage audit; documentation today). */
  requiredSkills: LanguageSkill[]
  /** Load-bearing grammar gates that MUST exist as concepts in the level graph. audit:corpus verifies presence. */
  gateConcepts: string[]
}

// The full deterministic diagnostic surface (canonical 17, excluding `unspecified`).
// From B1 up, remediate-at-level means foundational classes must stay EXERCISABLE
// at higher levels — so B1/B2 are expected to match A2's full surface even though
// they don't TEACH those classes anew (a B2 learner weak on gender needs gender
// catchable inside B2 content; p6 multi-skill tagging is how that surface widens).
const FULL_DIAGNOSTIC_SURFACE: ErrorTag[] = [
  'word-order', 'verb-tense', 'verb-conjugation', 'noun-gender', 'article-use',
  'adjective-agreement', 'pronoun-choice', 'preposition', 'modal-verb',
  'negation-placement', 'compound-word', 'wrong-word-same-category',
  'wrong-word-different-category', 'spelling', 'listening-recognition',
  'reading-parsing', 'meaning-misunderstood',
]

// A1's foundational surface — deliberately a subset (A1 doesn't yet exercise
// compound-word / wrong-word-different-category / meaning-misunderstood). Set so
// A1 passes honestly rather than manufacturing A1 gaps.
const A1_SURFACE: ErrorTag[] = [
  'word-order', 'verb-tense', 'verb-conjugation', 'noun-gender', 'article-use',
  'adjective-agreement', 'pronoun-choice', 'preposition', 'modal-verb',
  'negation-placement', 'spelling', 'listening-recognition', 'reading-parsing',
  'wrong-word-same-category',
]

// All levels should OFFER the core sentence exercise types (cloze + speaking are
// module/passage-level and tracked separately). The audit flags allowed-but-thin
// coverage — e.g. listening-comprehension + speed-round collapse at B1/B2.
const CORE_EXERCISE_TYPES: ExerciseType[] = [
  'translation-to-norwegian', 'translation-to-english', 'fill-in-blank',
  'word-order', 'listening-comprehension', 'speed-round',
]

const ALL_SKILLS: LanguageSkill[] = ['listening', 'reading', 'speaking', 'writing']

export const LEVEL_CONTRACT: Record<CEFRLevel, LevelContract> = {
  A1: {
    level: 'A1',
    difficultyFloor: 1,
    difficultyCeiling: 3,
    remediationFloorRelaxLevels: 0, // already the floor
    allowedExerciseTypes: CORE_EXERCISE_TYPES,
    expectedErrorTags: A1_SURFACE,
    requiredSkills: ALL_SKILLS,
    // Gates: V2 introduced, gender, present-tense workhorse.
    gateConcepts: ['v2-word-order', 'noun-gender', 'present-tense-regular'],
  },
  A2: {
    level: 'A2',
    difficultyFloor: 1,
    difficultyCeiling: 3,
    remediationFloorRelaxLevels: 1,
    allowedExerciseTypes: CORE_EXERCISE_TYPES,
    expectedErrorTags: FULL_DIAGNOSTIC_SURFACE,
    requiredSkills: ALL_SKILLS,
    // Gate: setningsadverb BEFORE the verb in subordinate clauses (most error-prone
    // NO L2 structure) + subordinate clauses + first passive.
    gateConcepts: ['sentence-adverbials', 'subordinate-clauses', 'passive-voice'],
  },
  B1: {
    level: 'B1',
    difficultyFloor: 1,
    difficultyCeiling: 3,
    remediationFloorRelaxLevels: 1,
    allowedExerciseTypes: CORE_EXERCISE_TYPES,
    expectedErrorTags: FULL_DIAGNOSTIC_SURFACE,
    requiredSkills: ALL_SKILLS,
    // Gates: subordinate-clause word order MASTERED + s-/bli-passive contrast.
    gateConcepts: ['complex-subordination', 's-passive-vs-bli-passive'],
  },
  B2: {
    level: 'B2',
    difficultyFloor: 2, // no trivial tier-1 items at B2
    difficultyCeiling: 3,
    remediationFloorRelaxLevels: 1,
    allowedExerciseTypes: CORE_EXERCISE_TYPES,
    expectedErrorTags: FULL_DIAGNOSTIC_SURFACE,
    requiredSkills: ALL_SKILLS,
    // Gates: control under spontaneity — register, cohesion, topicalization/word order.
    gateConcepts: ['nuanced-register', 'text-cohesion', 'advanced-word-order'],
  },
}

export function getLevelContract(level: CEFRLevel): LevelContract {
  return LEVEL_CONTRACT[level]
}
