import type { CEFRLevel } from '@/types/fingerprint'
import type { ConceptMastery } from '@/types/fingerprint'
import { DIAGNOSTIC_QUESTIONS, type DiagnosticQuestion } from './questions'

// ── Types ──────────────────────────────────────────────────────────────────

export interface DiagnosticState {
  /** Current ability estimate on a 0–1 scale */
  estimate: number
  /** Running list of (estimate after each answer) for convergence detection */
  history: number[]
  /** IDs of questions already asked this run */
  askedIds: Set<string>
  /** Answers recorded so far */
  answers: Array<{ question: DiagnosticQuestion; correct: boolean }>
}

export interface DiagnosticResult {
  cefrLevel: CEFRLevel
  /** Raw 0–1 score, stored separately from the displayed CEFR band */
  rawScore: number
  /** Initial concept mastery entries to seed the fingerprint */
  conceptSeeds: Record<string, Pick<ConceptMastery, 'rawScore' | 'attemptCount' | 'correctCount' | 'uniqueDaysActive' | 'confidenceScore' | 'decayedScore' | 'streak' | 'lastAttemptAt' | 'lastCorrectAt' | 'recentOutcomes'>>
  /** IDs of questions that were asked — stored so recalibration doesn't repeat them */
  askedQuestionIds: string[]
}

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_QUESTIONS = 12
const CONVERGENCE_WINDOW = 5
const CONVERGENCE_THRESHOLD = 0.05

// ── Scoring ───────────────────────────────────────────────────────────────

/**
 * IRT-inspired update: correct answers raise estimate more when the question
 * is hard relative to current estimate; wrong answers drop it more when the
 * question is easy. Uses a logistic update with learning rate 0.15.
 */
function updateEstimate(current: number, question: DiagnosticQuestion, correct: boolean): number {
  // Map question difficulty to [0,1] across all levels
  const levelBaseline = { A1: 0.0, A2: 0.25, B1: 0.5, B2: 0.75 }
  const globalDifficulty = levelBaseline[question.cefrLevel] + question.difficulty * 0.25

  // Probability of correct given current estimate (logistic)
  const logit = (current - globalDifficulty) * 5
  const pCorrect = 1 / (1 + Math.exp(-logit))

  // Update: residual × learning rate
  const residual = correct ? (1 - pCorrect) : -pCorrect
  const next = Math.max(0, Math.min(1, current + 0.15 * residual))
  return next
}

function hasConverged(history: number[]): boolean {
  if (history.length < CONVERGENCE_WINDOW) return false
  const recent = history.slice(-CONVERGENCE_WINDOW)
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length
  const variance = recent.reduce((sum, v) => sum + (v - mean) ** 2, 0) / recent.length
  return Math.sqrt(variance) < CONVERGENCE_THRESHOLD
}

// ── Question selection ─────────────────────────────────────────────────────

/**
 * Pick the question whose global difficulty is closest to the current estimate,
 * preferring untested concepts and skipping already-asked questions.
 */
export function selectNextQuestion(state: DiagnosticState): DiagnosticQuestion | null {
  const levelBaseline = { A1: 0.0, A2: 0.25, B1: 0.5, B2: 0.75 }

  const practiced = new Set(state.answers.map((a) => a.question.conceptId))

  const candidates = DIAGNOSTIC_QUESTIONS
    .filter((q) => !state.askedIds.has(q.id))
    .sort((a, b) => {
      const aDiff = Math.abs((levelBaseline[a.cefrLevel] + a.difficulty * 0.25) - state.estimate)
      const bDiff = Math.abs((levelBaseline[b.cefrLevel] + b.difficulty * 0.25) - state.estimate)
      // Prefer untested concepts; break ties by proximity to current estimate
      const aBonus = practiced.has(a.conceptId) ? 0.1 : 0
      const bBonus = practiced.has(b.conceptId) ? 0.1 : 0
      return (aDiff + aBonus) - (bDiff + bBonus)
    })

  return candidates[0] ?? null
}

// ── State machine ─────────────────────────────────────────────────────────

export function createDiagnosticState(seedAskedIds?: readonly string[]): DiagnosticState {
  // P0.5-07 (F015): seed with previously-asked question IDs so a recalibration
  // or repeat onboarding does not re-ask the same questions.
  return {
    estimate: 0.5,
    history: [],
    askedIds: new Set(seedAskedIds ?? []),
    answers: [],
  }
}

export function recordAnswer(
  state: DiagnosticState,
  question: DiagnosticQuestion,
  correct: boolean,
): DiagnosticState {
  const nextEstimate = updateEstimate(state.estimate, question, correct)
  return {
    estimate: nextEstimate,
    history: [...state.history, nextEstimate],
    askedIds: new Set([...state.askedIds, question.id]),
    answers: [...state.answers, { question, correct }],
  }
}

export function isDiagnosticComplete(state: DiagnosticState): boolean {
  return state.answers.length >= MAX_QUESTIONS || hasConverged(state.history)
}

// ── Result computation ────────────────────────────────────────────────────

export function computeResult(state: DiagnosticState): DiagnosticResult {
  const raw = state.estimate

  // CEFR band mapping
  let cefrLevel: CEFRLevel
  if (raw < 0.35) cefrLevel = 'A1'
  else if (raw < 0.55) cefrLevel = 'A2'
  else if (raw < 0.75) cefrLevel = 'B1'
  else cefrLevel = 'B2'

  // Seed concept mastery from answers
  const now = new Date().toISOString()
  const conceptSeeds: DiagnosticResult['conceptSeeds'] = {}

  for (const { question, correct } of state.answers) {
    const existing = conceptSeeds[question.conceptId]
    const prevCorrect = existing?.correctCount ?? 0
    const prevAttempts = existing?.attemptCount ?? 0
    const prevOutcomes = existing?.recentOutcomes ?? []

    const nextCorrect = prevCorrect + (correct ? 1 : 0)
    const nextAttempts = prevAttempts + 1
    // P0.5-07 (F017): rawScore is purely accuracy-weighted now. The earlier
    // `Math.max(seedScore=correct?60:20, rawScore)` floor meant a single wrong
    // answer on a concept never dropped below 20, so wrong answers were
    // silently swallowed by the seed floor. Diagnostic now reports true
    // accuracy; the engine's normal updateConceptMastery EMA takes over later.
    const rawScore = Math.round((nextCorrect / nextAttempts) * 100)
    const nextOutcomes = [...prevOutcomes, correct]

    conceptSeeds[question.conceptId] = {
      rawScore,
      attemptCount: nextAttempts,
      correctCount: nextCorrect,
      uniqueDaysActive: 1,
      confidenceScore: 0.4,
      decayedScore: rawScore,
      streak: correct ? (existing?.streak ?? 0) + 1 : 0,
      lastAttemptAt: now,
      lastCorrectAt: correct ? now : (existing?.lastCorrectAt ?? null),
      recentOutcomes: nextOutcomes,
    }
  }

  return { cefrLevel, rawScore: raw, conceptSeeds, askedQuestionIds: [...state.askedIds] }
}
