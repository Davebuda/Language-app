import type { ErrorTag } from './taxonomy';
import type { ExerciseType } from './session';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2';

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
  score: number; // 0–100
  knownWordCount: number;
  totalWordCount: number;
}

export type InputProductionPreference = 'input_heavy' | 'balanced' | 'production_heavy'

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
  lastSessionAt: string | null;
  speakingMinutesTotal: number; // cumulative minutes of spoken Norwegian produced via mic
  inputProductionPreference: InputProductionPreference;
  lastRecalibrationAt: string | null;
  askedDiagnosticQuestionIds: string[]; // prevents question repetition across diagnostic+recalibration
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
    lastSessionAt: null,
    speakingMinutesTotal: 0,
    inputProductionPreference: 'balanced',
    lastRecalibrationAt: null,
    askedDiagnosticQuestionIds: [],
  };
}
