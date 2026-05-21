import type { MistakeFingerprint } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';
import type { SessionItem, ExerciseType } from '@/types/session';

const TARGET_ITEM_COUNT = 6;       // baseline number of check items
const MAX_ITEM_COUNT = 8;          // cap when last-week graduates contribute extras
const SECONDS_PER_ITEM = 45;
const PREFERRED_TYPES: ExerciseType[] = [
  'translation-to-norwegian',
  'fill-in-blank',
  'translation-to-english',
];

/**
 * Build the items for this week's weekly check.
 *
 * Sources (in priority order, deduped on conceptId):
 *  1. Current week's `weeklyFocus` concepts — at least one item per focus
 *     concept if possible (cap MAX_ITEM_COUNT total).
 *  2. Previous-week graduates — concepts that hit threshold in the most
 *     recent `weeklySprintHistory[0]` record. Used to test retention.
 *
 * For each concept, the function picks ONE sentence and ONE exercise type
 * from PREFERRED_TYPES that the sentence supports. Concepts with no
 * eligible sentence in the corpus are skipped (the check just has fewer
 * items rather than blank cards).
 *
 * Pure — no I/O, no shuffle randomness (deterministic for tests).
 * Caller (WeeklyCheckScreen) may shuffle the returned items if desired.
 */
export function buildWeeklyCheckItems(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
  sentences: Record<string, Sentence>,
  availableSentenceIds: Record<string, string[]>,
): SessionItem[] {
  const focusConcepts = fp.weeklyFocus;
  const lastWeekRecord = fp.weeklySprintHistory[0];
  const lastWeekGraduates = lastWeekRecord
    ? Object.entries(lastWeekRecord.focusOutcomes)
        .filter(([conceptId, outcome]) => {
          const node = graph.concepts.find((c) => c.id === conceptId);
          if (!node) return false;
          return outcome.endScore >= node.masteryThreshold;
        })
        .map(([conceptId]) => conceptId)
    : [];

  const orderedConcepts = Array.from(new Set([...focusConcepts, ...lastWeekGraduates])).slice(0, MAX_ITEM_COUNT);

  const items: SessionItem[] = [];
  let itemIndex = 0;

  for (const conceptId of orderedConcepts) {
    const sentenceIds = availableSentenceIds[conceptId] ?? [];
    if (sentenceIds.length === 0) continue;

    // Find a sentence + exercise type pair from PREFERRED_TYPES that's eligible.
    let chosenType: ExerciseType | null = null;
    for (const type of PREFERRED_TYPES) {
      const sentenceId = sentenceIds.find((id) => sentences[id]?.exerciseTypes.includes(type));
      if (sentenceId) {
        chosenType = type;
        items.push({
          id: `weekly-check-${itemIndex++}`,
          exerciseType: type,
          contentId: `pending:${conceptId}`,
          conceptIds: [conceptId],
          estimatedSeconds: SECONDS_PER_ITEM,
          isRepairItem: false,
          purpose: 'review',
        });
        break;
      }
    }
    if (chosenType === null) continue;
    if (items.length >= TARGET_ITEM_COUNT && lastWeekGraduates.length === 0) break;
  }

  return items;
}
