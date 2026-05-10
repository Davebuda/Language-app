import type {
  MistakeFingerprint,
  ConceptMastery,
  ErrorLogEntry,
  ErrorPattern,
} from '@/types/fingerprint';
import type { ErrorTag } from '@/types/taxonomy';
import type { ExerciseType } from '@/types/session';

// ── Mastery Scoring ────────────────────────────────────────────────────

const DECAY_HALF_LIFE_DAYS = 30; // mastery halves after 30 days without practice
const MAX_RECENT_ERRORS = 200;
const ERROR_PATTERN_WINDOW_DAYS = 30;

function daysSince(isoString: string | null): number {
  if (!isoString) return Infinity;
  const ms = Date.now() - new Date(isoString).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

function computeDecayFactor(lastAttemptAt: string | null): number {
  const days = daysSince(lastAttemptAt);
  if (days === Infinity) return 0;
  // Exponential decay: e^(-ln(2)/halfLife * days)
  return Math.exp((-Math.LN2 / DECAY_HALF_LIFE_DAYS) * days);
}

function computeConfidence(
  attemptCount: number,
  uniqueDays: number,
  minAttempts: number,
  minDays: number
): number {
  const attemptConfidence = Math.min(1, attemptCount / minAttempts);
  const dayConfidence = Math.min(1, uniqueDays / minDays);
  // Geometric mean — both must be high for confidence to be high
  return Math.sqrt(attemptConfidence * dayConfidence);
}

export function updateConceptMastery(
  existing: ConceptMastery | undefined,
  correct: boolean,
  minAttempts: number,
  minDays: number
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
  };

  // Check if this is a new active day
  const lastDay = prev.lastAttemptAt ? new Date(prev.lastAttemptAt).toDateString() : null;
  const isNewDay = lastDay !== today;

  const nextAttemptCount = prev.attemptCount + 1;
  const nextCorrectCount = prev.correctCount + (correct ? 1 : 0);
  const nextUniqueDays = prev.uniqueDaysActive + (isNewDay ? 1 : 0);
  const nextStreak = correct ? prev.streak + 1 : 0;

  // Raw score: weighted accuracy over all attempts (recent attempts weighted more heavily)
  // Simplified: correctCount / attemptCount with slight recency weight
  const rawScore = Math.round((nextCorrectCount / nextAttemptCount) * 100);

  const confidence = computeConfidence(nextAttemptCount, nextUniqueDays, minAttempts, minDays);
  const decayFactor = computeDecayFactor(now);
  const decayedScore = Math.round(rawScore * decayFactor);

  return {
    ...prev,
    rawScore,
    confidenceScore: Math.round(confidence * 100) / 100,
    decayedScore,
    attemptCount: nextAttemptCount,
    correctCount: nextCorrectCount,
    uniqueDaysActive: nextUniqueDays,
    lastAttemptAt: now,
    lastCorrectAt: correct ? now : prev.lastCorrectAt,
    streak: nextStreak,
  };
}

// ── Decay Refresh ──────────────────────────────────────────────────────
// Call on app open to refresh decayed scores without adding attempts

export function refreshDecay(fingerprint: MistakeFingerprint): MistakeFingerprint {
  const updated = { ...fingerprint, conceptMastery: { ...fingerprint.conceptMastery } };
  for (const [id, mastery] of Object.entries(updated.conceptMastery)) {
    const decayFactor = computeDecayFactor(mastery.lastAttemptAt);
    updated.conceptMastery[id] = {
      ...mastery,
      decayedScore: Math.round(mastery.rawScore * decayFactor),
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
