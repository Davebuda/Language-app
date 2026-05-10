import type { MistakeFingerprint } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Session, SessionItem, SessionRecipe, ExerciseType } from '@/types/session';
import { DEFAULT_SESSION_RECIPE } from '@/types/session';
import { isMastered } from './fingerprint';
import { getPrimaryWeakConcepts, getDecayingConcepts, runDiagnosis } from './diagnosis';
import { getUnlockedConcepts } from '@/types/concepts';

const AVG_EXERCISE_SECONDS = 45; // average exercise duration

// Exercise types suited for remediation (active production)
const REMEDIATION_EXERCISES: ExerciseType[] = [
  'sentence-transformation',
  'translation-to-norwegian',
  'fill-in-blank',
  'word-order',
];

// Exercise types suited for review (recognition and quick recall)
const REVIEW_EXERCISES: ExerciseType[] = [
  'translation-to-english',
  'listening-comprehension',
  'speed-round',
];

// Exercise types for new material
const NEW_MATERIAL_EXERCISES: ExerciseType[] = [
  'translation-to-norwegian',
  'fill-in-blank',
];

function pickExerciseType(
  pool: ExerciseType[],
  recentlyUsed: ExerciseType[]
): ExerciseType {
  // Avoid repeating the same type more than twice in a row
  const lastTwo = recentlyUsed.slice(-2);
  const filtered = pool.filter((t) => !lastTwo.includes(t));
  const source = filtered.length > 0 ? filtered : pool;
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
  const { fingerprint, graph, availableSentenceIds } = input;
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

  function addItem(
    conceptId: string,
    exercises: ExerciseType[],
    purpose: SessionItem['purpose']
  ) {
    const sentences = availableSentenceIds[conceptId] ?? [];
    if (sentences.length === 0) return;
    const contentId = sentences[Math.floor(Math.random() * sentences.length)];
    const exerciseType = pickExerciseType(exercises, usedExerciseTypes);
    usedExerciseTypes.push(exerciseType);
    items.push(makeItem(`item-${itemIndex++}`, conceptId, contentId, exerciseType, purpose));
  }

  // Remediation — weak spots first
  for (let i = 0; i < counts.remediation; i++) {
    const conceptId = weakConcepts[i % Math.max(weakConcepts.length, 1)];
    if (conceptId) addItem(conceptId, REMEDIATION_EXERCISES, 'remediation');
  }

  // Review — decaying concepts
  for (let i = 0; i < counts.review; i++) {
    const conceptId =
      decayingConcepts[i % Math.max(decayingConcepts.length, 1)] ?? weakConcepts[0];
    if (conceptId) addItem(conceptId, REVIEW_EXERCISES, 'review');
  }

  // New material — next unlocked concept
  const nextConcept = unlockedConcepts[0];
  if (nextConcept) {
    for (let i = 0; i < counts.newMaterial; i++) {
      addItem(nextConcept.id, NEW_MATERIAL_EXERCISES, 'new-material');
    }
  }

  // Interleaving — mix from in-progress concepts
  const inProgress = [...inProgressIds].filter((id) => !masteredIds.has(id));
  for (let i = 0; i < counts.interleaving; i++) {
    const conceptId = inProgress[Math.floor(Math.random() * inProgress.length)];
    if (conceptId)
      addItem(conceptId, [...REMEDIATION_EXERCISES, ...REVIEW_EXERCISES], 'interleaving');
  }

  // Shuffle: don't let all remediation items cluster at start
  // Keep first item as a warm-up review, then shuffle the rest
  const [first, ...rest] = items;
  const shuffled = first ? [first, ...rest.sort(() => Math.random() - 0.5)] : rest;

  const primaryFocus = weakConcepts[0] ?? nextConcept?.id ?? 'general-review';

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
