import { describe, it, expect } from 'vitest';
import { SRS_LADDER_DAYS, srsNextReviewAt, advanceNotebookSrs } from '@/lib/srs';

// Read back the day-offset that an ISO nextReviewAt encodes, relative to now.
function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.round(ms / 86_400_000);
}

describe('advanceNotebookSrs', () => {
  it('advances 0→1→2→3→4 on correct, capped at the top rung', () => {
    let item = { srsLevel: 0, nextReviewAt: null as string | null };

    const expectedLevels = [1, 2, 3, 4, 4]; // 5th correct stays capped at len-1 = 4
    const expectedDays = [
      SRS_LADDER_DAYS[1], // level 1 → 3 days
      SRS_LADDER_DAYS[2], // level 2 → 7 days
      SRS_LADDER_DAYS[3], // level 3 → 14 days
      SRS_LADDER_DAYS[4], // level 4 → 30 days
      SRS_LADDER_DAYS[4], // capped → 30 days
    ];

    for (let i = 0; i < expectedLevels.length; i++) {
      item = advanceNotebookSrs(item, true);
      expect(item.srsLevel).toBe(expectedLevels[i]);
      expect(item.nextReviewAt).not.toBeNull();
      expect(daysUntil(item.nextReviewAt as string)).toBe(expectedDays[i]);
    }
  });

  it('resets to { srsLevel: 0, nextReviewAt: null } on wrong, from any level', () => {
    for (const level of [0, 1, 2, 3, 4]) {
      const result = advanceNotebookSrs(
        { srsLevel: level, nextReviewAt: '2099-01-01T00:00:00.000Z' },
        false,
      );
      expect(result).toEqual({ srsLevel: 0, nextReviewAt: null });
    }
  });

  it('schedules the rung-0 (1 day) interval for the first correct from level 0', () => {
    // covers srsNextReviewAt(0) path used elsewhere in the engine
    expect(daysUntil(srsNextReviewAt(0))).toBe(SRS_LADDER_DAYS[0]); // 1 day
  });
});
