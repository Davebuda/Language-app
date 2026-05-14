import type { MistakeFingerprint, InputProductionPreference } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Session, SessionItem, SessionRecipe, ExerciseType } from '@/types/session';
import { DEFAULT_SESSION_RECIPE } from '@/types/session';
import { isMastered } from './fingerprint';
import { getPrimaryWeakConcepts, getDecayingConcepts, runDiagnosis } from './diagnosis';
import { getUnlockedConcepts } from '@/types/concepts';

const AVG_EXERCISE_SECONDS = 45; // average exercise duration

// Exercise types by learning goal
const PRODUCTION_EXERCISES: ExerciseType[] = [
  'sentence-transformation',
  'translation-to-norwegian',
  'fill-in-blank',
  'word-order',
];
const RECOGNITION_EXERCISES: ExerciseType[] = [
  'translation-to-english',
  'listening-comprehension',
  'speed-round',
];

// Merged pools used when productionGap is neutral
const REMEDIATION_EXERCISES: ExerciseType[] = [...PRODUCTION_EXERCISES];
const REVIEW_EXERCISES: ExerciseType[] = [...RECOGNITION_EXERCISES];
const NEW_MATERIAL_EXERCISES: ExerciseType[] = [
  'translation-to-norwegian',
  'fill-in-blank',
];

// Resolve which exercise pool to use based on productionGap signal AND
// the user's explicit input/production preference.
function resolvePool(
  defaultPool: ExerciseType[],
  productionGap: number,
  preference: InputProductionPreference = 'balanced',
): ExerciseType[] {
  // Hard production-gap signal overrides preference
  if (productionGap > 30) return PRODUCTION_EXERCISES;
  if (productionGap < -30) return RECOGNITION_EXERCISES;

  // Soft preference bias: shift the pool without fully overriding it
  if (preference === 'production_heavy') return PRODUCTION_EXERCISES;
  if (preference === 'input_heavy') return RECOGNITION_EXERCISES;
  return defaultPool;
}

function pickExerciseType(
  pool: ExerciseType[],
  recentlyUsed: ExerciseType[],
  productionGap = 0,
  preference: InputProductionPreference = 'balanced',
): ExerciseType {
  const adjusted = resolvePool(pool, productionGap, preference);
  // Avoid repeating the same type more than twice in a row
  const lastTwo = recentlyUsed.slice(-2);
  const filtered = adjusted.filter((t) => !lastTwo.includes(t));
  const source = filtered.length > 0 ? filtered : adjusted;
  return source[Math.floor(Math.random() * source.length)];
}

function makeItem(
  id: string,
  conceptId: string,
  contentId: string,
  exerciseType: ExerciseType,
  purpose: SessionItem['purpose']
): SessionItem {
  return {
    id,
    exerciseType,
    contentId,
    conceptIds: [conceptId],
    estimatedSeconds: AVG_EXERCISE_SECONDS,
    isRepairItem: false,
    purpose,
  };
}

export interface SchedulerInput {
  fingerprint: MistakeFingerprint;
  graph: ConceptGraph;
  availableSentenceIds: Record<string, string[]>; // conceptId → sentence IDs
  recipe?: Partial<SessionRecipe>;
}

export interface SchedulerOutput {
  session: Session;
  primaryFocus: string;
  weakConcepts: string[];
  decayingConcepts: string[];
  diagnosisResults: ReturnType<typeof runDiagnosis>;
}

export function generateSession(input: SchedulerInput): SchedulerOutput {
  const { fingerprint, graph } = input;
  const recipe: SessionRecipe = { ...DEFAULT_SESSION_RECIPE, ...input.recipe };

  const masteredIds = new Set(
    Object.entries(fingerprint.conceptMastery)
      .filter(([id, m]) => {
        const node = graph.concepts.find((c) => c.id === id);
        if (!node) return false;
        return isMastered(m, node.masteryThreshold, node.minAttempts, node.minDays);
      })
      .map(([id]) => id)
  );

  const inProgressIds = new Set(Object.keys(fingerprint.conceptMastery));
  const weakConcepts = getPrimaryWeakConcepts(fingerprint, 3);
  const decayingConcepts = getDecayingConcepts(fingerprint);
  const diagnosisResults = runDiagnosis(fingerprint);
  const unlockedConcepts = getUnlockedConcepts(graph, masteredIds);

  const totalItems = Math.round(recipe.targetDurationSeconds / AVG_EXERCISE_SECONDS);
  const counts = {
    remediation: Math.round(totalItems * recipe.remediationRatio),
    review: Math.round(totalItems * recipe.reviewRatio),
    newMaterial: Math.round(totalItems * recipe.newMaterialRatio),
    interleaving: Math.round(totalItems * recipe.interleavingRatio),
  };

  const items: SessionItem[] = [];
  const usedExerciseTypes: ExerciseType[] = [];
  let itemIndex = 0;

  const preference = fingerprint.inputProductionPreference ?? 'balanced';

  function addItem(
    conceptId: string,
    exercises: ExerciseType[],
    purpose: SessionItem['purpose']
  ) {
    // Use 'placeholder' as contentId — content is resolved at render time by
    // the AI content resolution layer in useSession, not at session planning time.
    const contentId = `pending:${conceptId}`;
    const gap = fingerprint.productionGap[conceptId] ?? 0;
    const exerciseType = pickExerciseType(exercises, usedExerciseTypes, gap, preference);
    usedExerciseTypes.push(exerciseType);
    items.push(makeItem(`item-${itemIndex++}`, conceptId, contentId, exerciseType, purpose));
  }

  // Cap repeats of any single concept across all slots to avoid the same
  // concept dominating the session (especially for learners with few weak spots).
  const conceptRepeatCount = new Map<string, number>();
  const MAX_CONCEPT_REPEATS = 2;

  function addItemCapped(
    conceptId: string,
    exercises: ExerciseType[],
    purpose: SessionItem['purpose'],
    fallbackPool: string[],
  ) {
    const count = conceptRepeatCount.get(conceptId) ?? 0;
    const effectiveId =
      count < MAX_CONCEPT_REPEATS
        ? conceptId
        : (fallbackPool.find((id) => (conceptRepeatCount.get(id) ?? 0) < MAX_CONCEPT_REPEATS) ?? conceptId);
    conceptRepeatCount.set(effectiveId, (conceptRepeatCount.get(effectiveId) ?? 0) + 1);
    addItem(effectiveId, exercises, purpose);
  }

  // Remediation — weak spots first; fall back to unlocked concepts for cold-start users
  const remediationPool = weakConcepts.length > 0
    ? weakConcepts
    : unlockedConcepts.map((c) => c.id);
  for (let i = 0; i < counts.remediation; i++) {
    const conceptId = remediationPool[i % Math.max(remediationPool.length, 1)];
    if (conceptId) addItemCapped(conceptId, REMEDIATION_EXERCISES, 'remediation', remediationPool);
  }

  // Review — decaying concepts; fall back to weak then unlocked
  const reviewPool = decayingConcepts.length > 0
    ? decayingConcepts
    : weakConcepts.length > 0
      ? weakConcepts
      : unlockedConcepts.map((c) => c.id);
  for (let i = 0; i < counts.review; i++) {
    const conceptId = reviewPool[i % Math.max(reviewPool.length, 1)];
    if (conceptId) addItemCapped(conceptId, REVIEW_EXERCISES, 'review', reviewPool);
  }

  // New material — spread across the next unlocked concepts, not just the first
  const newMaterialConcepts = unlockedConcepts.slice(0, Math.max(counts.newMaterial, 3));
  for (let i = 0; i < counts.newMaterial; i++) {
    const concept = newMaterialConcepts[i % Math.max(newMaterialConcepts.length, 1)];
    if (concept) {
      conceptRepeatCount.set(concept.id, (conceptRepeatCount.get(concept.id) ?? 0) + 1);
      addItem(concept.id, NEW_MATERIAL_EXERCISES, 'new-material');
    }
  }

  // Interleaving — mix from in-progress concepts; fall back to unlocked concepts
  const inProgress = [...inProgressIds].filter((id) => !masteredIds.has(id));
  const interleavingPool = inProgress.length > 0 ? inProgress : unlockedConcepts.map((c) => c.id);
  for (let i = 0; i < counts.interleaving; i++) {
    const conceptId = interleavingPool[Math.floor(Math.random() * interleavingPool.length)];
    if (conceptId)
      addItem(conceptId, [...REMEDIATION_EXERCISES, ...REVIEW_EXERCISES], 'interleaving');
  }

  // Shuffle: don't let all remediation items cluster at start
  // Keep first item as a warm-up review, then shuffle the rest with Fisher-Yates
  // (sort-based shuffle is statistically biased — certain orderings over-appear)
  function fisherYates<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  // Production guarantee: every session must contain at least one production exercise.
  // If none exist (e.g. pure recognition session), swap the first recognition item.
  const hasProduction = items.some((item) =>
    (PRODUCTION_EXERCISES as string[]).includes(item.exerciseType)
  );
  if (!hasProduction && items.length > 0) {
    const swapIdx = items.findIndex((item) =>
      (REVIEW_EXERCISES as string[]).includes(item.exerciseType)
    );
    if (swapIdx !== -1) {
      const target = items[swapIdx];
      const conceptId = target.conceptIds[0] ?? '';
      const gap = fingerprint.productionGap[conceptId] ?? 0;
      items[swapIdx] = {
        ...target,
        exerciseType: pickExerciseType(PRODUCTION_EXERCISES, usedExerciseTypes, gap, preference),
      };
    }
  }

  const [first, ...rest] = items;
  const shuffled = first ? [first, ...fisherYates(rest)] : fisherYates(items);

  const primaryFocus = weakConcepts[0] ?? newMaterialConcepts[0]?.id ?? 'general-review';

  const session: Session = {
    id: crypto.randomUUID(),
    userId: fingerprint.userId,
    startedAt: new Date().toISOString(),
    status: 'active',
    recipe,
    items: shuffled,
    completedItemIds: [],
    level: fingerprint.currentLevel,
    primaryFocus,
  };

  return { session, primaryFocus, weakConcepts, decayingConcepts, diagnosisResults };
}
