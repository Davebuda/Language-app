import type {
  MistakeFingerprint,
  ConceptMastery,
  ErrorLogEntry,
  ErrorPattern,
  DailyProgress,
  BrickWeight,
} from '@/types/fingerprint';
import type { ErrorTag } from '@/types/taxonomy';
import type { ExerciseType } from '@/types/session';
import type { ConceptGraph } from '@/types/concepts';

// ── Mastery Scoring ────────────────────────────────────────────────────

const DECAY_HALF_LIFE_DAYS = 25;  // ~3.5 weeks — steepest forgetting in first month; floor prevents total loss
const DECAY_FLOOR = 35;           // cold-start midpoint: users don't forget everything

// SRS review intervals in days, indexed by srsLevel (0–4)
export const SRS_LADDER_DAYS = [1, 3, 7, 14, 30] as const;

function srsNextReviewAt(srsLevel: number): string {
  const days = SRS_LADDER_DAYS[Math.min(srsLevel, SRS_LADDER_DAYS.length - 1)] ?? 1;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
const MAX_RECENT_ERRORS = 200;
const ERROR_PATTERN_WINDOW_DAYS = 30;
const MAX_RECENT_OUTCOMES = 5;

function daysSince(isoString: string | null): number {
  if (!isoString) return Infinity;
  const ms = Date.now() - new Date(isoString).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function computeDecayFactor(lastAttemptAt: string | null): number {
  const days = daysSince(lastAttemptAt);
  if (days === Infinity) return 0;
  return Math.exp((-Math.LN2 / DECAY_HALF_LIFE_DAYS) * days);
}

// Apply decay with a floor so forgotten concepts stay above zero
function applyDecayWithFloor(rawScore: number, lastAttemptAt: string | null): number {
  if (!lastAttemptAt) return 0;
  const factor = computeDecayFactor(lastAttemptAt);
  // Decay toward DECAY_FLOOR, not toward 0
  return Math.round(DECAY_FLOOR + (rawScore - DECAY_FLOOR) * factor);
}

function computeConfidence(
  attemptCount: number,
  uniqueDays: number,
  minAttempts: number,
  minDays: number
): number {
  const attemptConfidence = Math.min(1, attemptCount / minAttempts);
  const dayConfidence = Math.min(1, uniqueDays / minDays);
  return Math.sqrt(attemptConfidence * dayConfidence);
}

// Phase-adaptive EMA learning rate: intro updates faster, maintenance is resistant to slips
function learningRate(attemptCount: number, rawScore: number): number {
  if (attemptCount < 5) return 0.40;          // intro — fast convergence on early data
  if (rawScore < 70) return 0.25;             // practice
  if (rawScore < 85) return 0.15;             // consolidation
  return 0.08;                                // maintenance — high resistance to slips
}

// A wrong answer is a slip if 4 of the last 5 outcomes were correct
function isSlip(recentOutcomes: boolean[]): boolean {
  if (recentOutcomes.length < 4) return false;
  const correctInRecent = recentOutcomes.slice(0, 5).filter(Boolean).length;
  return correctInRecent >= 4;
}

export function updateConceptMastery(
  existing: ConceptMastery | undefined,
  correct: boolean,
  minAttempts: number,
  minDays: number,
  /**
   * Scales the EMA step size (learning rate α). Default 1 = unchanged behavior.
   * Values < 1 produce a gentler move toward the outcome — used for guided /
   * scaffolded correct production (recordProductionFromSurface) so a copied
   * frame earns a real-but-smaller mastery brick than free production. Scales
   * the step, NOT the outcome, so a correct answer always moves mastery UP.
   */
  learningRateScale = 1
): ConceptMastery {
  const now = new Date().toISOString();
  const today = new Date().toDateString();

  const prev: ConceptMastery = existing ?? {
    conceptId: '',
    rawScore: 0,
    confidenceScore: 0,
    decayedScore: 0,
    attemptCount: 0,
    correctCount: 0,
    uniqueDaysActive: 0,
    lastAttemptAt: null,
    lastCorrectAt: null,
    streak: 0,
    recentOutcomes: [],
    srsLevel: 0,
    nextReviewAt: null,
  };

  const lastDay = prev.lastAttemptAt ? new Date(prev.lastAttemptAt).toDateString() : null;
  const isNewDay = lastDay !== today;

  const nextAttemptCount = prev.attemptCount + 1;
  const nextCorrectCount = prev.correctCount + (correct ? 1 : 0);
  const nextUniqueDays = prev.uniqueDaysActive + (isNewDay ? 1 : 0);
  const nextStreak = correct ? prev.streak + 1 : 0;

  // Update recent outcomes (cap at 5, newest first)
  const nextRecentOutcomes = [correct, ...(prev.recentOutcomes ?? [])].slice(0, MAX_RECENT_OUTCOMES);

  // Phase-adaptive EMA with slip weighting
  const α = learningRate(prev.attemptCount, prev.rawScore) * learningRateScale;
  // Wrong answer on strong concept (slip) carries 30% of normal weight
  const effectiveOutcome = (!correct && isSlip(prev.recentOutcomes ?? [])) ? 0.30 : (correct ? 1 : 0);
  const rawScore = Math.round(prev.rawScore * (1 - α) + effectiveOutcome * 100 * α);
  const clampedScore = Math.max(0, Math.min(100, rawScore));

  const confidence = computeConfidence(nextAttemptCount, nextUniqueDays, minAttempts, minDays);
  const decayedScore = applyDecayWithFloor(clampedScore, now);

  const prevSrsLevel = prev.srsLevel ?? 0;
  const nextSrsLevel = correct ? Math.min(prevSrsLevel + 1, SRS_LADDER_DAYS.length - 1) : 0;

  return {
    ...prev,
    rawScore: clampedScore,
    confidenceScore: Math.round(confidence * 100) / 100,
    decayedScore,
    attemptCount: nextAttemptCount,
    correctCount: nextCorrectCount,
    uniqueDaysActive: nextUniqueDays,
    lastAttemptAt: now,
    lastCorrectAt: correct ? now : prev.lastCorrectAt,
    streak: nextStreak,
    recentOutcomes: nextRecentOutcomes,
    srsLevel: nextSrsLevel,
    nextReviewAt: srsNextReviewAt(nextSrsLevel),
  };
}

// ── Progressive Seeding ───────────────────────────────────────────────
// Seeds all graph concepts with neutral baseline mastery so the adaptive
// system is active from session one — no diagnostic required.
// Scores start at 50 (neutral), confidence at 0.15 (untested).
// Intro-phase EMA (α=0.40) shifts scores rapidly: after 5-8 exercises,
// weak concepts separate from strong ones and weekly focus becomes meaningful.

export function seedInitialMastery(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
): MistakeFingerprint {
  const graphIds = graph.concepts.map((c) => c.id);
  const alreadyHasGraphConcepts = graphIds.some((id) => fp.conceptMastery[id] !== undefined);
  if (alreadyHasGraphConcepts) return fp;

  const conceptMastery: Record<string, ConceptMastery> = { ...fp.conceptMastery };
  for (const concept of graph.concepts) {
    if (concept.prerequisites.length > 0) continue;
    conceptMastery[concept.id] = {
      conceptId: concept.id,
      rawScore: 50,
      confidenceScore: 0.15,
      decayedScore: 50,
      attemptCount: 0,
      correctCount: 0,
      uniqueDaysActive: 0,
      lastAttemptAt: null,
      lastCorrectAt: null,
      streak: 0,
      recentOutcomes: [],
      srsLevel: 0,
      nextReviewAt: null,
    };
  }

  return { ...fp, conceptMastery, updatedAt: new Date().toISOString() };
}

// ── Decay Refresh ──────────────────────────────────────────────────────
// Call on app open to refresh decayed scores without adding attempts

export function refreshDecay(fingerprint: MistakeFingerprint): MistakeFingerprint {
  const updated = { ...fingerprint, conceptMastery: { ...fingerprint.conceptMastery } };
  for (const [id, mastery] of Object.entries(updated.conceptMastery)) {
    updated.conceptMastery[id] = {
      ...mastery,
      recentOutcomes: mastery.recentOutcomes ?? [],
      decayedScore: applyDecayWithFloor(mastery.rawScore, mastery.lastAttemptAt),
    };
  }
  updated.updatedAt = new Date().toISOString();
  return updated;
}

// ── Error Logging ──────────────────────────────────────────────────────

export function logError(
  fingerprint: MistakeFingerprint,
  params: {
    conceptId: string;
    errorTag: ErrorTag;
    exerciseType: ExerciseType;
    wrong: string;
    correct: string;
    sentenceId?: string;
    scenarioId?: string;
  }
): MistakeFingerprint {
  const entry: ErrorLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...params,
  };

  const recentErrors = [entry, ...fingerprint.recentErrors].slice(0, MAX_RECENT_ERRORS);

  return {
    ...fingerprint,
    recentErrors,
    updatedAt: new Date().toISOString(),
  };
}

// ── Error Pattern Aggregation ──────────────────────────────────────────

export function aggregateErrorPatterns(fingerprint: MistakeFingerprint): ErrorPattern[] {
  const cutoff = Date.now() - ERROR_PATTERN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentErrors = fingerprint.recentErrors.filter(
    (e) => new Date(e.timestamp).getTime() > cutoff
  );

  // Count errors by tag
  const tagCounts = new Map<ErrorTag, ErrorLogEntry[]>();
  for (const error of recentErrors) {
    if (!tagCounts.has(error.errorTag)) tagCounts.set(error.errorTag, []);
    tagCounts.get(error.errorTag)?.push(error);
  }

  const patterns: ErrorPattern[] = [];
  for (const [tag, errors] of tagCounts.entries()) {
    if (errors.length < 2) continue; // Not a pattern until it repeats
    const sorted = errors.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    patterns.push({
      id: crypto.randomUUID(),
      errorTags: [tag],
      frequency: errors.length,
      firstSeenAt: sorted[0].timestamp,
      lastSeenAt: sorted[sorted.length - 1].timestamp,
    });
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

// ── Mastery Check ──────────────────────────────────────────────────────

export function isMastered(
  mastery: ConceptMastery | undefined,
  threshold: number,
  minAttempts: number,
  minDays: number
): boolean {
  if (!mastery) return false;
  return (
    mastery.rawScore >= threshold &&
    mastery.confidenceScore >= 0.7 &&
    mastery.attemptCount >= minAttempts &&
    mastery.uniqueDaysActive >= minDays
  );
}

// ── Production vs Recognition Gap ─────────────────────────────────────

export function computeProductionGap(
  errors: ErrorLogEntry[],
  conceptId: string
): number {
  const conceptErrors = errors.filter((e) => e.conceptId === conceptId);
  const writingErrors = conceptErrors.filter((e) =>
    ['translation-to-norwegian', 'sentence-transformation', 'free-writing', 'dictation'].includes(
      e.exerciseType
    )
  ).length;
  const recognitionErrors = conceptErrors.filter((e) =>
    ['translation-to-english', 'listening-comprehension', 'reading-comprehension'].includes(
      e.exerciseType
    )
  ).length;

  if (writingErrors + recognitionErrors === 0) return 0;
  // Positive gap = struggles more with production than recognition
  return Math.round(
    ((writingErrors - recognitionErrors) / (writingErrors + recognitionErrors)) * 100
  );
}

// ── Daily brick tally (production wall) ──────────────────────────────────

// Which in-session CORRECT answer counts as PRODUCTION vs RECOGNITION on the
// daily wall. Data, not branching — so the "recognition can't move the
// production meter" guarantee is deterministic and lives in one place. Source
// of truth is the ExerciseType union; anything not listed is recognition.
// (word-order is scaffolded production; fill-in-blank/listening/speed-round are
// recognition; the non-session free-writing surfaces credit production directly
// via recordProductionFromSurface, not through this map.)
const PRODUCTION_EXERCISE_TYPES: ReadonlySet<ExerciseType> = new Set<ExerciseType>([
  'translation-to-norwegian',
  'word-order',
  'free-writing',
  'cloze-passage',
]);

export function brickWeightForExercise(type: ExerciseType): 'production' | 'recognition' {
  return PRODUCTION_EXERCISE_TYPES.has(type) ? 'production' : 'recognition';
}

const EMPTY_BRICKS = { exposure: 0, recognition: 0, production: 0, guided: 0 };

/**
 * Pure: add `count` bricks of one weight to TODAY's DailyProgress record,
 * creating the day record if absent and preserving the rolling 7-day window.
 * Legacy day records without `bricks` are treated as zeros. Mirrors the
 * find-or-create shape of recordBlockProgress; never mutates in place.
 */
export function bumpDailyBrick(
  fp: MistakeFingerprint,
  weight: BrickWeight,
  count = 1,
): MistakeFingerprint {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const existing = fp.dailyProgress.find((d) => d.date === today);
  const base: DailyProgress = existing ?? {
    date: today,
    blocks: {
      lytt: { completed: 0, total: 0, correct: 0 },
      lær: { completed: 0, total: 0, correct: 0 },
      snakk: { completed: 0, total: 0, correct: 0 },
    },
    completedAt: null,
  };
  const bricks = { ...EMPTY_BRICKS, ...(base.bricks ?? {}) };
  const nextDay: DailyProgress = {
    ...base,
    bricks: { ...bricks, [weight]: bricks[weight] + count },
  };
  const otherDays = fp.dailyProgress.filter((d) => d.date !== today);
  return {
    ...fp,
    dailyProgress: [nextDay, ...otherDays].slice(0, 7),
    updatedAt: new Date().toISOString(),
  };
}

// ── Phase Model ────────────────────────────────────────────────────────

export type ConceptPhase = 'locked' | 'intro' | 'practice' | 'consolidation' | 'maintenance';

/**
 * Derive a concept's learning phase from existing mastery data.
 * Pure function — no side effects, no state.
 *
 * locked       prerequisites not fully cleared
 * intro        fewer than 5 attempts (just started)
 * practice     ≥ 5 attempts, mastery < 70
 * consolidation mastery 70–85
 * maintenance  mastery ≥ 85
 */
export function getConceptPhase(
  mastery: ConceptMastery | undefined,
  prereqIds: string[],
  masteredIds: Set<string>,
): ConceptPhase {
  const prereqsMet = prereqIds.every((id) => masteredIds.has(id));
  if (!prereqsMet) return 'locked';
  if (!mastery || mastery.attemptCount < 5) return 'intro';
  if (mastery.rawScore < 70) return 'practice';
  if (mastery.rawScore < 85) return 'consolidation';
  return 'maintenance';
}
