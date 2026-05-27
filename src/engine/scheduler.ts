import type { MistakeFingerprint, InputProductionPreference } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Session, SessionItem, SessionBlock, SessionRecipe, ExerciseType, SelectionReason } from '@/types/session';
import type { Sentence } from '@/types/content';
import { DEFAULT_SESSION_RECIPE, LEVEL_BLOCK_SIZES } from '@/types/session';
import { isMastered } from './fingerprint';
import { getPrimaryWeakConcepts, getDecayingConcepts, getReviewDueConcepts, runDiagnosis } from './diagnosis';
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

// Exercise pools for named blocks
const LYTT_EXERCISES_BLOCK: ExerciseType[] = ['listening-comprehension', 'translation-to-english'];
const SNAKK_EXERCISES_BLOCK: ExerciseType[] = ['translation-to-norwegian', 'word-order'];

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

function makeItem(
  id: string,
  conceptId: string,
  contentId: string,
  exerciseType: ExerciseType,
  purpose: SessionItem['purpose'],
  selectionReason: SelectionReason,
): SessionItem {
  return {
    id,
    exerciseType,
    contentId,
    conceptIds: [conceptId],
    estimatedSeconds: AVG_EXERCISE_SECONDS,
    isRepairItem: false,
    purpose,
    selectionReason,
  };
}

export interface SchedulerInput {
  fingerprint: MistakeFingerprint;
  graph: ConceptGraph;
  availableSentenceIds: Record<string, string[]>; // conceptId → sentence IDs
  sentences: Record<string, Sentence>;            // sentenceId → full sentence (for type compatibility check)
  recipe?: Partial<SessionRecipe>;
}

export interface SchedulerOutput {
  session: Session;
  blocks: SessionBlock[];
  primaryFocus: string;
  weakConcepts: string[];
  decayingConcepts: string[];
  diagnosisResults: ReturnType<typeof runDiagnosis>;
}

export function generateSession(input: SchedulerInput): SchedulerOutput {
  const { fingerprint, graph, availableSentenceIds, sentences } = input;
  const recipe: SessionRecipe = { ...DEFAULT_SESSION_RECIPE, ...input.recipe };
  const passedIds = fingerprint.passedSentenceIds ?? {};

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
  const weakConcepts = getPrimaryWeakConcepts(fingerprint, 5);
  const decayingConcepts = getDecayingConcepts(fingerprint);
  const reviewDueConcepts = getReviewDueConcepts(fingerprint);
  const diagnosisResults = runDiagnosis(fingerprint);
  const unlockedConcepts = getUnlockedConcepts(graph, masteredIds);

  const blockSizes = LEVEL_BLOCK_SIZES[fingerprint.currentLevel];
  const lærTarget = blockSizes.lær;
  const counts = {
    remediation: Math.round(lærTarget * recipe.remediationRatio),
    review: Math.round(lærTarget * recipe.reviewRatio),
    newMaterial: Math.round(lærTarget * recipe.newMaterialRatio),
    interleaving: Math.round(lærTarget * recipe.interleavingRatio),
  };

  const items: SessionItem[] = [];
  const usedExerciseTypes: ExerciseType[] = [];
  let itemIndex = 0;

  const preference = fingerprint.inputProductionPreference ?? 'balanced';

  // Returns the first exercise type from `candidates` for which at least one
  // sentence for `conceptId` declares support. When `excludePassed` is true,
  // only unpassed sentences are considered — concepts with all sentences
  // passed return null and get skipped.
  function firstEligibleType(
    conceptId: string,
    candidates: ExerciseType[],
    excludePassed: boolean = true,
  ): ExerciseType | null {
    const allIds = availableSentenceIds[conceptId] ?? [];
    const ids = excludePassed
      ? allIds.filter((id) => !passedIds[id])
      : allIds;
    if (ids.length === 0) return null;
    for (const type of candidates) {
      if (ids.some((id) => sentences[id]?.exerciseTypes.includes(type))) {
        return type;
      }
    }
    return null;
  }

  function addItem(
    conceptId: string,
    exercises: ExerciseType[],
    purpose: SessionItem['purpose'],
    selectionReason: SelectionReason,
    excludePassed: boolean = true,
  ): boolean {
    const gap = fingerprint.productionGap[conceptId] ?? 0;
    const adjusted = resolvePool(exercises, gap, preference);

    // Anti-repetition: prefer types not used in the last two exercises, then
    // fall back to the full adjusted pool if nothing deduped is eligible.
    const lastTwo = usedExerciseTypes.slice(-2);
    const deduped = adjusted.filter((t) => !lastTwo.includes(t));
    const candidates = deduped.length > 0
      ? [...deduped, ...adjusted.filter((t) => !deduped.includes(t))]
      : adjusted;

    const exerciseType = firstEligibleType(conceptId, candidates, excludePassed);
    if (exerciseType === null) {
      console.warn(`[scheduler] skipping "${conceptId}" — no unpassed sentence for any type in pool`);
      return false;
    }

    // Content is resolved at render time by useSession, not at planning time.
    const contentId = `pending:${conceptId}`;
    usedExerciseTypes.push(exerciseType);
    items.push(makeItem(`item-${itemIndex++}`, conceptId, contentId, exerciseType, purpose, selectionReason));
    return true;
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
    selectionReason: SelectionReason,
    excludePassed: boolean = true,
  ): boolean {
    const count = conceptRepeatCount.get(conceptId) ?? 0;
    const effectiveId =
      count < MAX_CONCEPT_REPEATS
        ? conceptId
        : (fallbackPool.find((id) => (conceptRepeatCount.get(id) ?? 0) < MAX_CONCEPT_REPEATS) ?? conceptId);
    const effectiveReason = effectiveId !== conceptId ? 'weak_concept' : selectionReason;
    const added = addItem(effectiveId, exercises, purpose, effectiveReason, excludePassed);
    if (added) {
      conceptRepeatCount.set(effectiveId, (conceptRepeatCount.get(effectiveId) ?? 0) + 1);
    }
    return added;
  }

  // Remediation — when a weekly sprint is active, prefer focus concepts;
  // otherwise fall back to weak spots, then to unlocked concepts for cold-start.
  // Bias preserves backwards compatibility: empty weeklyFocus → unchanged behaviour.
  const focusIds = new Set(fingerprint.weeklyFocus ?? []);
  const remediationPool =
    focusIds.size > 0
      ? Array.from(
          new Set([
            // 1. focus concepts that are also in weakConcepts — highest priority
            ...weakConcepts.filter((id) => focusIds.has(id)),
            // 2. focus concepts that are SRS-due but not weak enough to be in top-5 weak
            ...Array.from(focusIds).filter((id) => !weakConcepts.includes(id)),
            // 3. weak concepts not in focus — secondary
            ...weakConcepts.filter((id) => !focusIds.has(id)),
            // 4. unlocked-concepts fallback (only if pools above run dry)
            ...unlockedConcepts.map((c) => c.id),
          ]),
        )
      : weakConcepts.length > 0
        ? weakConcepts
        : unlockedConcepts.map((c) => c.id);

  for (let i = 0; i < counts.remediation; i++) {
    const conceptId = remediationPool[i % Math.max(remediationPool.length, 1)];
    if (conceptId) {
      const reason: SelectionReason = focusIds.has(conceptId) ? 'weekly_focus' : 'weak_concept';
      addItemCapped(conceptId, REMEDIATION_EXERCISES, 'remediation', remediationPool, reason);
    }
  }

  // Review — SRS-due concepts first; fall back through decaying → weak → unlocked.
  // Review items are allowed to show passed sentences (intentional spaced repetition).
  const reviewDueSet = new Set(reviewDueConcepts);
  const decayingSet = new Set(decayingConcepts);
  const reviewPool = reviewDueConcepts.length > 0
    ? reviewDueConcepts
    : decayingConcepts.length > 0
      ? decayingConcepts
      : weakConcepts.length > 0
        ? weakConcepts
        : unlockedConcepts.map((c) => c.id);
  for (let i = 0; i < counts.review; i++) {
    const conceptId = reviewPool[i % Math.max(reviewPool.length, 1)];
    if (conceptId) {
      const reason: SelectionReason = reviewDueSet.has(conceptId) ? 'review_due' : decayingSet.has(conceptId) ? 'decaying' : 'weak_concept';
      addItemCapped(conceptId, REVIEW_EXERCISES, 'review', reviewPool, reason, false);
    }
  }

  // New material — spread across the next unlocked concepts, not just the first
  const newMaterialConcepts = unlockedConcepts.slice(0, Math.max(counts.newMaterial, 3));
  for (let i = 0; i < counts.newMaterial; i++) {
    const concept = newMaterialConcepts[i % Math.max(newMaterialConcepts.length, 1)];
    if (concept) {
      const reason: SelectionReason = (fingerprint.conceptMastery[concept.id]?.attemptCount ?? 0) === 0 ? 'cold_start' : 'new_material';
      const added = addItem(concept.id, NEW_MATERIAL_EXERCISES, 'new-material', reason);
      if (added) {
        conceptRepeatCount.set(concept.id, (conceptRepeatCount.get(concept.id) ?? 0) + 1);
      }
    }
  }

  // Interleaving — mix from in-progress concepts; fall back to unlocked concepts
  const inProgress = [...inProgressIds].filter((id) => !masteredIds.has(id));
  const interleavingPool = inProgress.length > 0 ? inProgress : unlockedConcepts.map((c) => c.id);
  for (let i = 0; i < counts.interleaving; i++) {
    const conceptId = interleavingPool[Math.floor(Math.random() * interleavingPool.length)];
    if (conceptId)
      addItem(conceptId, [...REMEDIATION_EXERCISES, ...REVIEW_EXERCISES], 'interleaving', 'interleaving');
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
  // Scan items in order; for the first item whose concept has a sentence that supports
  // a production type, swap it. If no compatible item exists, accept a recognition
  // session rather than assign an incompatible exercise type.
  const hasProduction = items.some((item) =>
    (PRODUCTION_EXERCISES as string[]).includes(item.exerciseType)
  );
  if (!hasProduction && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const target = items[i];
      const conceptId = target.conceptIds[0] ?? '';
      const shouldExclude = target.purpose !== 'review' && !target.isRepairItem;
      const compatibleProductionType = firstEligibleType(conceptId, PRODUCTION_EXERCISES, shouldExclude);
      if (compatibleProductionType !== null) {
        items[i] = { ...target, exerciseType: compatibleProductionType };
        break;
      }
    }
  }

  const [first, ...rest] = items;
  const shuffled = first ? [first, ...fisherYates(rest)] : fisherYates(items);

  const primaryFocus = weakConcepts[0] ?? newMaterialConcepts[0]?.id ?? 'general-review';

  // --- Lær block: the existing recipe-driven shuffled items ---
  const lærBlock: SessionBlock = {
    id: 'block-lær',
    type: 'lær',
    label: 'Lær',
    items: shuffled,
  };

  // --- Lytt block: recognition exercises drawn from concept pools ---
  // Prefer focus → review-due → weak → unlocked. Allows passed sentences (review by design).
  const lyttConceptPool = [
    ...Array.from(focusIds),
    ...reviewPool,
    ...weakConcepts,
    ...unlockedConcepts.map((c) => c.id),
  ];
  const lyttItems: SessionItem[] = [];
  const lyttUsed = new Set<string>();
  let lyttIndex = itemIndex;
  for (let i = 0; lyttItems.length < blockSizes.lytt && i < lyttConceptPool.length * 2; i++) {
    const conceptId = lyttConceptPool[i % Math.max(lyttConceptPool.length, 1)];
    if (!conceptId || lyttUsed.has(conceptId)) continue;
    const exerciseType = firstEligibleType(conceptId, LYTT_EXERCISES_BLOCK, false);
    if (exerciseType === null) continue;
    const lyttReason: SelectionReason = focusIds.has(conceptId)
      ? 'weekly_focus'
      : reviewDueSet.has(conceptId)
        ? 'review_due'
        : 'weak_concept';
    lyttItems.push(
      makeItem(`item-lytt-${lyttIndex++}`, conceptId, `pending:${conceptId}`, exerciseType, 'review', lyttReason),
    );
    lyttUsed.add(conceptId);
  }
  const lyttBlock: SessionBlock = {
    id: 'block-lytt',
    type: 'lytt',
    label: 'Lytt',
    items: lyttItems,
  };

  // --- Snakk block: production exercises drawn from focus concepts ---
  // Excludes passed sentences — fresh production practice only.
  const snakkConceptPool = [
    ...Array.from(focusIds),
    ...weakConcepts,
    ...unlockedConcepts.map((c) => c.id),
  ];
  const snakkItems: SessionItem[] = [];
  const snakkUsed = new Set<string>();
  let snakkIndex = lyttIndex;
  for (let i = 0; snakkItems.length < blockSizes.snakk && i < snakkConceptPool.length * 2; i++) {
    const conceptId = snakkConceptPool[i % Math.max(snakkConceptPool.length, 1)];
    if (!conceptId || snakkUsed.has(conceptId)) continue;
    const exerciseType = firstEligibleType(conceptId, SNAKK_EXERCISES_BLOCK, true);
    if (exerciseType === null) continue;
    const snakkReason: SelectionReason = focusIds.has(conceptId) ? 'weekly_focus' : 'weak_concept';
    snakkItems.push(
      makeItem(`item-snakk-${snakkIndex++}`, conceptId, `pending:${conceptId}`, exerciseType, 'remediation', snakkReason),
    );
    snakkUsed.add(conceptId);
  }
  const snakkBlock: SessionBlock = {
    id: 'block-snakk',
    type: 'snakk',
    label: 'Snakk',
    items: snakkItems,
  };

  // Compose: lytt → lær → snakk
  // session.items is the flat union — preserves backward compatibility for all existing consumers.
  const blocks: SessionBlock[] = [lyttBlock, lærBlock, snakkBlock];
  const allItems = blocks.flatMap((b) => b.items);

  const session: Session = {
    id: crypto.randomUUID(),
    userId: fingerprint.userId,
    startedAt: new Date().toISOString(),
    status: 'active',
    recipe,
    items: allItems,
    completedItemIds: [],
    level: fingerprint.currentLevel,
    primaryFocus,
    blocks,
  };

  return { session, blocks, primaryFocus, weakConcepts, decayingConcepts, diagnosisResults };
}
