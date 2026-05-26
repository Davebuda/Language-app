import type { MistakeFingerprint } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';

export interface WeeklyProgressEntry {
  conceptId: string;
  label: string;
  deltaDecayed: number;       // current decayedScore minus snapshot.decayedScore; signed integer
  attemptsThisWeek: number;   // current attemptCount minus snapshot.attemptCount; rounded to integer
}

/**
 * Read-only summary of progress on this week's focus concepts.
 *
 * For each conceptId in `fp.weeklyFocus`, returns the score delta and attempt
 * delta against the baseline captured by openWeek in `fp.weekStartSnapshots`.
 * Concepts present in `weeklyFocus` but missing from the graph or from the
 * mastery map are skipped — there is nothing meaningful to report. A missing
 * snapshot (legacy weeks opened before Stream 5.5 Phase 2) falls back to a
 * zero baseline so the surface still renders without throwing.
 *
 * Pure: no side effects. Caller owns rendering.
 */
export function summarizeWeeklyProgress(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
): WeeklyProgressEntry[] {
  const out: WeeklyProgressEntry[] = [];
  for (const conceptId of fp.weeklyFocus) {
    const node = graph.concepts.find((c) => c.id === conceptId);
    if (!node) continue;
    const mastery = fp.conceptMastery[conceptId];
    if (!mastery) continue;
    const snapshot = fp.weekStartSnapshots[conceptId];
    const baselineDecayed = snapshot?.decayedScore ?? 0;
    const baselineAttempts = snapshot?.attemptCount ?? 0;
    out.push({
      conceptId,
      label: node.label,
      deltaDecayed: Math.round(mastery.decayedScore - baselineDecayed),
      attemptsThisWeek: Math.round(mastery.attemptCount - baselineAttempts),
    });
  }
  return out;
}
