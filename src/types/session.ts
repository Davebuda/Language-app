import type { CEFRLevel } from './fingerprint';
import type { ErrorTag } from './taxonomy';
import type { ErrorLogEntry } from './fingerprint';

export type ExerciseType =
  | 'translation-to-norwegian'
  | 'translation-to-english'
  | 'sentence-transformation'
  | 'fill-in-blank'
  | 'word-order'            // drag-and-drop tiles
  | 'listening-comprehension'
  | 'dictation'
  | 'reading-comprehension'
  | 'free-writing'
  | 'speed-round'
  | 'cloze-passage'
  | 'speaking-production';   // say the Norwegian aloud — self-report graded, never ASR-as-judge

// Exercise types that have NO distinct renderer yet. The UI shows an honest
// "kommer snart / Trykk for å hoppe over" banner (NotYetAvailable in
// ExerciseCard.tsx) for these. Single source of truth — both ExerciseCard
// (defensive UI fallback, Operating Rule 6) and the scheduler (which must never
// SCHEDULE a type it cannot render) import this list.
export const NOT_YET_AVAILABLE_TYPES: readonly ExerciseType[] = [
  'sentence-transformation',
  'dictation',
  'reading-comprehension',
  'free-writing',
] as const;

export function isNotYetAvailableType(type: ExerciseType): boolean {
  return NOT_YET_AVAILABLE_TYPES.includes(type);
}

// Content-eligibility alias. `speaking-production` reuses translation-to-norwegian
// content — the learner sees the cue and SAYS the Norwegian aloud — so no separate
// corpus is needed. A sentence that supports translation-to-norwegian therefore
// supports speaking-production. Both the scheduler (firstEligibleType) and the
// session content resolver consult this so they agree on what counts as eligible.
export function sentenceSupportsType(
  exerciseTypes: readonly ExerciseType[],
  type: ExerciseType,
): boolean {
  if (exerciseTypes.includes(type)) return true;
  if (type === 'speaking-production') return exerciseTypes.includes('translation-to-norwegian');
  return false;
}

export type RepairStep = 'explanation' | 'micro-drill' | 'retry' | 'review-scheduled';

export interface RepairContext {
  triggeredBy: ErrorLogEntry;
  step: RepairStep;
  explanationText?: string;
  microDrillConceptId?: string;
}

export type SelectionReason =
  | 'weak_concept'
  | 'review_due'
  | 'decaying'
  | 'new_material'
  | 'interleaving'
  | 'weekly_focus'
  | 'repair_target'
  | 'cold_start'
  | 'root_cause';      // the diagnosed root cause behind surface mistakes (diagnosis-steered remediation)

export interface SessionItem {
  id: string;
  exerciseType: ExerciseType;
  contentId: string;            // sentence ID, vocab item ID, etc.
  conceptIds: string[];         // concepts being practiced
  estimatedSeconds: number;
  isRepairItem: boolean;
  repairContext?: RepairContext;
  purpose: 'remediation' | 'review' | 'new-material' | 'interleaving' | 'new-vocab';
  selectionReason: SelectionReason;
}

export interface SessionRecipe {
  remediationRatio: number;    // target ~0.40
  reviewRatio: number;         // target ~0.30
  newMaterialRatio: number;    // target ~0.20
  interleavingRatio: number;   // target ~0.10
  targetDurationSeconds: number; // default: 750 (12.5 min)
  minNewVocabItems: number;    // always include at least this many new words
}

export const DEFAULT_SESSION_RECIPE: SessionRecipe = {
  remediationRatio: 0.40,
  reviewRatio: 0.30,
  newMaterialRatio: 0.20,
  interleavingRatio: 0.10,
  targetDurationSeconds: 750,
  minNewVocabItems: 3,
};

export type SessionStatus = 'active' | 'completed' | 'abandoned';

export type SessionBlockType = 'lytt' | 'lær' | 'snakk';

export interface SessionBlock {
  id: string;
  type: SessionBlockType;
  label: string;
  items: SessionItem[];
}

export const LEVEL_BLOCK_SIZES: Record<CEFRLevel, Record<SessionBlockType, number>> = {
  A1: { lytt: 5, lær: 15, snakk: 5 },
  A2: { lytt: 6, lær: 13, snakk: 6 },
  B1: { lytt: 7, lær: 11, snakk: 7 },
  B2: { lytt: 8, lær: 9, snakk: 8 },
};

export interface Session {
  id: string;
  userId: string;
  startedAt: string;            // ISO string
  completedAt?: string;
  status: SessionStatus;
  recipe: SessionRecipe;
  items: SessionItem[];
  completedItemIds: string[];
  level: CEFRLevel;
  primaryFocus?: string;        // e.g. "dative case" — main concept being targeted
  blocks?: SessionBlock[];
}

export interface ExerciseResult {
  sessionId: string;
  itemId: string;
  correct: boolean;
  userAnswer: string;
  correctAnswer: string;
  timeTakenSeconds: number;
  errorTag?: ErrorTag;          // set if wrong answer
  conceptId: string;
  sentenceId?: string;          // resolved sentence that was shown; used by retry step and fingerprint error log
  // Learner self-attested a non-exact answer as correct on a translate-to-ENGLISH
  // near-miss (the system can't judge English paraphrase, so it defers to the
  // learner — VC §3.7 recourse). Recorded as correct but at REDUCED mastery weight
  // with the SRS ladder frozen, since the system did not verify it. Implies correct=true.
  selfVerified?: boolean;
}
