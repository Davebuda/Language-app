import type { ErrorTag } from './taxonomy';
import type { ExerciseType } from './session';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2';

export interface WeeklySprintRecord {
  weekStartedAt: string;             // ISO date — the Monday this sprint started
  weekEndedAt: string;               // ISO date — when the record was closed
  focus: string[];                   // concept IDs that were the focus that week
  status: 'completed' | 'abandoned'; // completed = honored the cadence; abandoned = absence reset
  focusOutcomes: Record<string, {    // per-concept progress during the week
    startScore: number;              // decayedScore at week start
    endScore: number;                // decayedScore at week end
    attempts: number;                // count of practice events during the week
    graduated: boolean;              // true if concept hit mastery threshold + minAttempts this week
  }>;
  checkResult: {
    takenAt: string;
    score: number;                   // 0–100, accuracy on the weekly check
    items: number;                   // number of items in the check
  } | null;                          // null if learner skipped the check
}

export interface ErrorLogEntry {
  id: string;
  conceptId: string;
  errorTag: ErrorTag;
  exerciseType: ExerciseType;
  wrong: string;
  correct: string;
  timestamp: string; // ISO string (not Date for serialization)
  sentenceId?: string;
  scenarioId?: string;
}

export interface ConceptMastery {
  conceptId: string;
  rawScore: number;         // 0–100, EMA-based mastery (phase-adaptive α)
  confidenceScore: number;  // 0–1, how reliable the score is
  decayedScore: number;     // rawScore decayed toward cold-start floor of 35
  attemptCount: number;
  correctCount: number;
  uniqueDaysActive: number;  // # of calendar days practiced
  lastAttemptAt: string | null; // ISO string
  lastCorrectAt: string | null;
  streak: number;           // consecutive correct answers
  recentOutcomes: boolean[]; // last 5 outcomes, newest first — slip detection
  srsLevel: number;         // SRS ladder rung 0–4 (resets to 0 on wrong answer)
  nextReviewAt: string | null; // ISO string — when this concept is next due for review
}

export interface ErrorPattern {
  id: string;
  errorTags: ErrorTag[];
  frequency: number;        // occurrences in last 30 days
  rootCauseConceptId?: string; // derived by diagnosis engine
  rootCauseConfidence?: number; // 0–1
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface VocabularyClusterMastery {
  clusterId: string;
  score: number;              // 0–100 EMA — drives scheduling + decay-gates the coverage meter
  activatedWordIds: string[]; // words missed-then-produced-correctly ("ord du ikke lenger bommer på")
  missedWordIds: string[];    // words ever answered wrong (the "was" behind "no longer miss")
  totalWordCount: number;
}

export type InputProductionPreference = 'input_heavy' | 'balanced' | 'production_heavy'

export interface DailyBlockProgress {
  completed: number
  total: number
  correct: number
}

// Production-wall brick weights. Each graded outcome lays one brick of one
// weight onto the day's wall; the daily/weekly progress surface reads this tally.
export type BrickWeight = 'exposure' | 'recognition' | 'production' | 'guided'

export interface DailyProgress {
  date: string  // YYYY-MM-DD
  blocks: {
    lytt: DailyBlockProgress
    lær: DailyBlockProgress
    snakk: DailyBlockProgress
  }
  completedAt: string | null
  // Per-weight brick tally for the production wall. Optional for back-compat:
  // legacy day records (pre-2026-06) lack it and are treated as all-zeros.
  bricks?: { exposure: number; recognition: number; production: number; guided: number }
}

export interface MistakeFingerprint {
  userId: string;           // Supabase auth user ID or anonymous UUID
  createdAt: string;
  updatedAt: string;
  currentLevel: CEFRLevel;
  levelSetByUser: boolean;  // true once the user has explicitly chosen a level
  conceptMastery: Record<string, ConceptMastery>; // keyed by concept ID
  recentErrors: ErrorLogEntry[]; // capped at 200, newest first
  errorPatterns: ErrorPattern[];
  vocabularyMastery: Record<string, VocabularyClusterMastery>; // keyed by cluster ID
  productionGap: Record<string, number>; // conceptId → gap between recognition and production (0–100)
  totalSessionsCompleted: number;
  calibrationSessionsRemaining: number;  // counts down 5→0 after diagnostic; 0 = standard behavior
  lastSessionAt: string | null;
  speakingMinutesTotal: number; // cumulative minutes of spoken Norwegian produced via mic
  inputProductionPreference: InputProductionPreference;
  lastRecalibrationAt: string | null;
  askedDiagnosticQuestionIds: string[]; // prevents question repetition across diagnostic+recalibration
  weeklyFocus: string[];                       // concept IDs, ≤5; the current week's focus
  weekStartedAt: string | null;                // ISO date; null before first sprint
  weeklySprintHistory: WeeklySprintRecord[];   // newest first, capped at 26 entries (~6 months)
  weekStartSnapshots: Record<string, {         // per-focus-concept score+attempt snapshot at openWeek;
    rawScore: number;                          // consumed by closeWeek to write the real startScore;
    decayedScore: number;                      // cleared on closeWeek. Powers the mid-week reveal strip
    attemptCount: number;                      // by giving summarizeWeeklyProgress a baseline to diff against.
  }>;
  passedSentenceIds: Record<string, string>;   // sentenceId → ISO timestamp when passed; excluded from normal selection
  dailyProgress: DailyProgress[];              // rolling 7-day window, newest first
}

// Factory: create a new empty fingerprint
export function createEmptyFingerprint(userId: string): MistakeFingerprint {
  return {
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentLevel: 'A1',
    levelSetByUser: false,
    conceptMastery: {},
    recentErrors: [],
    errorPatterns: [],
    vocabularyMastery: {},
    productionGap: {},
    totalSessionsCompleted: 0,
    calibrationSessionsRemaining: 5,
    lastSessionAt: null,
    speakingMinutesTotal: 0,
    inputProductionPreference: 'balanced',
    lastRecalibrationAt: null,
    askedDiagnosticQuestionIds: [],
    weeklyFocus: [],
    weekStartedAt: null,
    weeklySprintHistory: [],
    weekStartSnapshots: {},
    passedSentenceIds: {},
    dailyProgress: [],
  };
}

/**
 * Backfill a loaded fingerprint so every field added after it was last saved is
 * present. Stored values always win over defaults (spread order). This is the
 * single schema-migration-on-load used by BOTH persistence paths (IndexedDB and
 * Supabase) — a returning user whose fingerprint predates a field (e.g.
 * `dailyProgress`, `vocabularyMastery`, `productionGap`) would otherwise crash
 * any reader that assumes the field is present. Shallow by design: it fills
 * missing top-level keys only and never mutates existing nested data.
 */
export function normalizeFingerprint(raw: MistakeFingerprint): MistakeFingerprint {
  const base = { ...createEmptyFingerprint(raw.userId), ...raw };
  // Deepen ONLY the one nested shape that crashes a reader when absent: a
  // weeklySprintHistory record persisted before `focusOutcomes` existed makes
  // `Object.values(record.focusOutcomes)` throw on the progress page. Default it
  // to {} (empty outcomes → zero, never a throw).
  // We deliberately do NOT backfill ConceptMastery row fields here: a default
  // `decayedScore`/`rawScore` would silently change a displayed mastery score.
  // Readers guard those numerically instead (comparison-on-undefined → false).
  base.weeklySprintHistory = (base.weeklySprintHistory ?? []).map((r) => ({
    ...r,
    focusOutcomes: r?.focusOutcomes ?? {},
  }));
  return base;
}
