import type { ConceptMastery, MistakeFingerprint, WeeklySprintRecord } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import { getConceptPhase, isMastered } from './fingerprint';

// ── Migration helper ──────────────────────────────────────────────────────────

/**
 * Idempotent migration: seed weekly-sprint fields on legacy fingerprints that
 * predate Stream 5. A second call on an already-migrated fingerprint is a
 * no-op (returns changed: false). Pure — caller persists.
 */
export function migrateWeeklySprintFields(fp: MistakeFingerprint): { migrated: MistakeFingerprint; changed: boolean } {
  const hasFocus = Array.isArray((fp as Partial<MistakeFingerprint>).weeklyFocus);
  const hasStarted = 'weekStartedAt' in fp;
  const hasHistory = Array.isArray((fp as Partial<MistakeFingerprint>).weeklySprintHistory);
  if (hasFocus && hasStarted && hasHistory) return { migrated: fp, changed: false };
  return {
    migrated: {
      ...fp,
      weeklyFocus: (fp as Partial<MistakeFingerprint>).weeklyFocus ?? [],
      weekStartedAt: (fp as Partial<MistakeFingerprint>).weekStartedAt ?? null,
      weeklySprintHistory: (fp as Partial<MistakeFingerprint>).weeklySprintHistory ?? [],
      updatedAt: new Date().toISOString(),
    },
    changed: true,
  };
}

const MAX_FOCUS_COUNT = 5;
const WEAK_PICK_COUNT = 3;
const SRS_PICK_COUNT = 2;
const WEEK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const HISTORY_CAP = 26;

/**
 * Pick the focus concepts for a new weekly sprint.
 * Union of: weakest N by decayedScore + up to M SRS-due concepts where
 * nextReviewAt <= weekEnd. Locked concepts excluded.
 * Returns <=5 concept IDs, deduped. Weakest-N takes priority on dedupe.
 */
export function selectWeeklyFocus(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
  now: Date = new Date(),
): string[] {
  const weekEnd = new Date(now.getTime() + WEEK_DURATION_MS).toISOString();

  // Build masteredIds set so getConceptPhase can evaluate prerequisites.
  const masteredIds = new Set(
    graph.concepts
      .filter((c) =>
        isMastered(
          fp.conceptMastery[c.id],
          c.masteryThreshold,
          c.minAttempts,
          c.minDays,
        ),
      )
      .map((c) => c.id),
  );

  // Filter: only concepts that exist in the graph and are NOT locked.
  const eligible = Object.values(fp.conceptMastery).filter((m) => {
    const node = graph.concepts.find((c) => c.id === m.conceptId);
    if (!node) return false;
    return getConceptPhase(m, node.prerequisites, masteredIds) !== 'locked';
  });

  // Weakest N by decayedScore (ascending).
  const weakest = [...eligible]
    .sort((a, b) => a.decayedScore - b.decayedScore)
    .slice(0, WEAK_PICK_COUNT)
    .map((m) => m.conceptId);

  // SRS-due within the week (nextReviewAt <= weekEnd). Earliest-due first.
  const srsDue = eligible
    .filter((m) => m.nextReviewAt !== null && m.nextReviewAt <= weekEnd)
    .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? ''))
    .slice(0, SRS_PICK_COUNT)
    .map((m) => m.conceptId);

  // Union, dedupe, cap at MAX_FOCUS_COUNT. Weakest takes priority on dedupe.
  return Array.from(new Set([...weakest, ...srsDue])).slice(0, MAX_FOCUS_COUNT);
}

/**
 * Returns true if the learner has been absent long enough that the current
 * week should be closed as 'abandoned' and a new week started. Threshold:
 * >7 days since weekStartedAt.
 */
export function shouldResetWeek(
  fp: MistakeFingerprint,
  now: Date = new Date(),
): boolean {
  if (fp.weekStartedAt === null) return false;
  const elapsed = now.getTime() - new Date(fp.weekStartedAt).getTime();
  return elapsed > WEEK_DURATION_MS;
}

/**
 * A focus concept graduates this week if it hits the curriculum threshold
 * for mastery AND minimum attempts. If a weekly check was taken with a low
 * score (<50), graduation is demoted regardless — the user didn't retain.
 * Skipping the check is NOT punished (checkResult === null leaves graduation
 * to mastery alone).
 */
function isGraduated(
  mastery: ConceptMastery | undefined,
  node: ConceptGraph['concepts'][number] | undefined,
  checkResult: WeeklySprintRecord['checkResult'],
): boolean {
  if (!mastery || !node) return false;
  const meetsBar =
    mastery.rawScore >= node.masteryThreshold &&
    mastery.attemptCount >= node.minAttempts;
  if (!meetsBar) return false;
  if (checkResult && checkResult.score < 50) return false;
  return true;
}

/**
 * Close the current week into a WeeklySprintRecord and return an updated
 * fingerprint. Pure: caller persists. status='abandoned' if shouldResetWeek
 * fired without a checkResult; 'completed' otherwise.
 */
export function closeWeek(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
  options: {
    status: 'completed' | 'abandoned';
    checkResult: WeeklySprintRecord['checkResult'];
    now?: Date;
  },
): MistakeFingerprint {
  if (fp.weekStartedAt === null) return fp;

  const now = (options.now ?? new Date()).toISOString();
  const focusOutcomes: WeeklySprintRecord['focusOutcomes'] = {};
  for (const conceptId of fp.weeklyFocus) {
    const m = fp.conceptMastery[conceptId];
    if (!m) continue;
    const node = graph.concepts.find((c) => c.id === conceptId);
    focusOutcomes[conceptId] = {
      startScore: 0,           // Phase 5 will capture startScore at week-open
      endScore: m.decayedScore,
      attempts: m.attemptCount,
      graduated: isGraduated(m, node, options.checkResult),
    };
  }

  const record: WeeklySprintRecord = {
    weekStartedAt: fp.weekStartedAt,
    weekEndedAt: now,
    focus: fp.weeklyFocus,
    status: options.status,
    focusOutcomes,
    checkResult: options.checkResult,
  };

  const history = [record, ...fp.weeklySprintHistory].slice(0, HISTORY_CAP);

  return {
    ...fp,
    weeklySprintHistory: history,
    weeklyFocus: [],
    weekStartedAt: null,
    updatedAt: now,
  };
}

/**
 * Open a new weekly sprint. Pure: caller persists.
 * Idempotent if a week is already open — returns fp unchanged.
 * Populates `weeklyFocus` via selectWeeklyFocus and sets `weekStartedAt`.
 */
export function openWeek(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
  now: Date = new Date(),
): MistakeFingerprint {
  if (fp.weekStartedAt !== null) return fp; // already open
  const focus = selectWeeklyFocus(fp, graph, now);
  return {
    ...fp,
    weeklyFocus: focus,
    weekStartedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/**
 * Idempotent: ensures a current weekly sprint exists.
 *  - If shouldResetWeek(fp, now), closes the stale week as 'abandoned' and opens a new one.
 *  - If weekStartedAt is null, opens a new week.
 *  - Otherwise returns fp unchanged.
 * Pure: caller persists.
 */
export function ensureWeekOpen(
  fp: MistakeFingerprint,
  graph: ConceptGraph,
  now: Date = new Date(),
): MistakeFingerprint {
  if (shouldResetWeek(fp, now)) {
    const closed = closeWeek(fp, graph, { status: 'abandoned', checkResult: null, now });
    return openWeek(closed, graph, now);
  }
  if (fp.weekStartedAt === null) {
    return openWeek(fp, graph, now);
  }
  return fp;
}
