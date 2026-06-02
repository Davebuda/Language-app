import type { MistakeFingerprint, InputProductionPreference } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Session, SessionItem, SessionBlock, SessionRecipe, ExerciseType, SelectionReason } from '@/types/session';
import type { Sentence, ClozePassage } from '@/types/content';
import { DEFAULT_SESSION_RECIPE, LEVEL_BLOCK_SIZES, isNotYetAvailableType } from '@/types/session';
import { isMastered } from './fingerprint';
import { getPrimaryWeakConcepts, getDecayingConcepts, getReviewDueConcepts, runDiagnosis } from './diagnosis';
import { getUnlockedConcepts } from '@/types/concepts';
import { getCumulativeConcepts } from '@/lib/concept-graph-loader';
import { buildClozeFromSentence } from '@/lib/auto-cloze';

const AVG_EXERCISE_SECONDS = 45; // average exercise duration

const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2'] as const;

export function filterSentencesByLevel(sentenceIds: string[], maxLevel: string, sentences: Record<string, { cefrLevel: string }>): string[] {
  const maxIdx = LEVEL_ORDER.indexOf(maxLevel as typeof LEVEL_ORDER[number]);
  if (maxIdx < 0) return [];
  return sentenceIds.filter(id => {
    const s = sentences[id];
    if (!s) return false;
    const sIdx = LEVEL_ORDER.indexOf(s.cefrLevel as typeof LEVEL_ORDER[number]);
    return sIdx >= 0 && sIdx <= maxIdx;
  });
}

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
// Listening-only — a block labelled "Lytt" (Listen) must actually be listening.
// Previously this fell back to translation-to-english, so at levels with no
// listening content (B2 has 0 listening-comprehension sentences) the "Lytt"
// block silently filled with read-and-translate items (Rule 6 violation). Now
// the block only takes genuine listening items; if a level has none, the block
// is empty and gets dropped below — honest absence over silent substitution.
const LYTT_EXERCISES_BLOCK: ExerciseType[] = ['listening-comprehension'];
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
  availablePassageIds?: Record<string, string[]>; // primaryConceptId → cloze passage ids
  passages?: Record<string, ClozePassage>;        // passageId → passage (for level filtering)
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

  // CROSS-LEVEL FIX (E1): resolve mastery over the CUMULATIVE concept set
  // (A1..currentLevel), not just the current-level graph. A B1/B2 concept's
  // prerequisites can live at lower levels (e.g. b1 `past-perfect` requires A2
  // `perfect-tense`); those prereqs are carried forward in conceptMastery but
  // are absent from the single-level `graph`, so the old `graph.concepts.find`
  // lookup dropped them — leaving every cross-level concept `locked`. Building
  // masteredIds over the cumulative set lets getUnlockedConcepts /
  // getConceptPhase resolve cross-level prerequisites. Focus stays current-level
  // because getUnlockedConcepts(graph, ...) still scans only `graph`.
  // TODO(pre-launch): when concepts retroactively unlock as a learner crosses
  // levels, surface a short "nye konsepter låst opp" notice (silent for now).
  // Node lookup spans the cumulative set (for cross-level prereqs) AND the
  // passed `graph` (authoritative for current-level / test-synthetic concepts).
  // Cumulative entries win on id collision; graph fills any concept not present
  // in the cumulative set (e.g. synthetic test graphs).
  const nodeById = new Map(graph.concepts.map((c) => [c.id, c]));
  for (const c of getCumulativeConcepts(fingerprint.currentLevel)) nodeById.set(c.id, c);
  const masteredIds = new Set(
    Object.entries(fingerprint.conceptMastery)
      .filter(([id, m]) => {
        const node = nodeById.get(id);
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
    const rawIds = availableSentenceIds[conceptId] ?? [];
    const levelFiltered = filterSentencesByLevel(rawIds, fingerprint.currentLevel, sentences);
    const allIds = levelFiltered;
    const ids = excludePassed
      ? allIds.filter((id) => !passedIds[id])
      : allIds;
    if (ids.length === 0) return null;
    // T5: never schedule a phantom/not-yet-renderable type. Exclude them from
    // the candidate set so only real, renderable types are considered. If this
    // leaves a sentence with no eligible real type, return null → the concept is
    // skipped gracefully (same path as the "no unpassed sentence" skip).
    for (const type of candidates) {
      if (isNotYetAvailableType(type)) continue;
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

  // --- Cloze passage: at most one, for the top focus/weak concept. Prefer an
  // authored passage at/below level (and not passed); otherwise fall back to an
  // AUTO-CLOZE built from an eligible sentence, so the cloze type exists at
  // levels with no authored passages (B1/B2). The auto-eligibility check runs the
  // real builder so the useSession resolver is guaranteed to produce a cloze. ---
  {
    const clozeMaxIdx = LEVEL_ORDER.indexOf(fingerprint.currentLevel as typeof LEVEL_ORDER[number]);
    const clozeCandidates = [...Array.from(focusIds), ...weakConcepts];
    for (const conceptId of clozeCandidates) {
      const pids = input.availablePassageIds?.[conceptId] ?? [];
      const authoredEligible = pids.some((pid) => {
        const p = input.passages?.[pid];
        if (!p) return false;
        const pIdx = LEVEL_ORDER.indexOf(p.cefrLevel as typeof LEVEL_ORDER[number]);
        return pIdx >= 0 && pIdx <= clozeMaxIdx && !passedIds[pid];
      });
      let autoEligible = false;
      if (!authoredEligible) {
        const sentIds = filterSentencesByLevel(
          availableSentenceIds[conceptId] ?? [],
          fingerprint.currentLevel,
          sentences,
        ).filter((id) => !passedIds[id]);
        autoEligible = sentIds.some((id) => {
          const s = sentences[id];
          return !!s && buildClozeFromSentence(s) !== null;
        });
      }
      if (authoredEligible || autoEligible) {
        const clozeReason: SelectionReason = focusIds.has(conceptId) ? 'weekly_focus' : 'weak_concept';
        items.push(makeItem(`item-${itemIndex++}`, conceptId, `pending:${conceptId}`, 'cloze-passage', 'new-material', clozeReason));
        break; // at most one cloze per session
      }
    }
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
  // Drop empty blocks so the UI never shows a block with no items (e.g. an empty
  // "Lytt" at a level with no listening content). Honest absence over a dead tab.
  const blocks: SessionBlock[] = [lyttBlock, lærBlock, snakkBlock].filter((b) => b.items.length > 0);
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
