// Shared SRS (spaced-repetition) primitive.
//
// Extracted verbatim from src/engine/fingerprint.ts so notebook items and the
// mistake fingerprint advance on the SAME ladder with the SAME date math.
// fingerprint.ts re-imports SRS_LADDER_DAYS + srsNextReviewAt from here.

// SRS review intervals in days, indexed by srsLevel (0–4)
export const SRS_LADDER_DAYS = [1, 3, 7, 14, 30] as const;

export function srsNextReviewAt(srsLevel: number): string {
  const days = SRS_LADDER_DAYS[Math.min(srsLevel, SRS_LADDER_DAYS.length - 1)] ?? 1;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Advance a notebook item's own SRS state, mirroring the curriculum rule used by
// updateConceptMastery: on a correct answer the level steps up (capped at the top
// rung) and a new review date is scheduled; a wrong answer resets the ladder to 0
// with no scheduled review. Pure — no side effects, no dependency on the fingerprint.
export function advanceNotebookSrs(
  item: { srsLevel: number; nextReviewAt: string | null },
  correct: boolean,
): { srsLevel: number; nextReviewAt: string | null } {
  if (!correct) {
    return { srsLevel: 0, nextReviewAt: null };
  }
  const nextSrsLevel = Math.min(item.srsLevel + 1, SRS_LADDER_DAYS.length - 1);
  return { srsLevel: nextSrsLevel, nextReviewAt: srsNextReviewAt(nextSrsLevel) };
}
