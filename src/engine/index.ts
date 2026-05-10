// Public API for the adaptive engine

export {
  updateConceptMastery,
  refreshDecay,
  logError,
  aggregateErrorPatterns,
  isMastered,
  computeProductionGap,
} from './fingerprint';
export { runDiagnosis, getPrimaryWeakConcepts, getDecayingConcepts } from './diagnosis';
export { generateSession } from './scheduler';
export type { SchedulerInput, SchedulerOutput } from './scheduler';
export { buildRepairPlan, makeRepairItems } from './repair-loop';
export type { RepairPlan } from './repair-loop';
