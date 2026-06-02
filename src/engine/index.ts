// Public API for the adaptive engine

export {
  updateConceptMastery,
  refreshDecay,
  logError,
  aggregateErrorPatterns,
  isMastered,
  computeProductionGap,
  brickWeightForExercise,
  bumpDailyBrick,
  getConceptPhase,
  seedInitialMastery,
} from './fingerprint';
export type { ConceptPhase } from './fingerprint';
export { runDiagnosis, getPrimaryWeakConcepts, getDecayingConcepts, getReviewDueConcepts } from './diagnosis';
export { generateSession } from './scheduler';
export type { SchedulerInput, SchedulerOutput } from './scheduler';
export { buildRepairPlan, makeRepairItems } from './repair-loop';
export type { RepairPlan } from './repair-loop';
export { selectWeeklyFocus, shouldResetWeek, closeWeek, openWeek, ensureWeekOpen, migrateWeeklySprintFields } from './weekly-sprint';
export { recordVocabResult, vocabCoverage } from './vocab';
export type { VocabResultInput, VocabCoverage } from './vocab';
