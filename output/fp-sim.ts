/**
 * ENGINE SIMULATION HARNESS — NorskCoach fingerprint behavior over 7 days.
 *
 * Document/audit only. Imports the REAL engine pure functions. Does NOT modify src/.
 * Run: npx tsx output/fp-sim.ts   (writes report to output/pandoai-fingerprint-sim-2026-06-01.md)
 *
 * WHAT IS REAL ENGINE (imported, not reimplemented):
 *   - updateConceptMastery, seedInitialMastery, refreshDecay, isMastered,
 *     getConceptPhase, logError, computeProductionGap, aggregateErrorPatterns  (src/engine/fingerprint.ts)
 *   - generateSession  (src/engine/scheduler.ts)
 *   - getPrimaryWeakConcepts, getDecayingConcepts, getReviewDueConcepts, runDiagnosis  (src/engine/diagnosis.ts)
 *   - openWeek, ensureWeekOpen, closeWeek, selectWeeklyFocus  (src/engine/weekly-sprint.ts)
 *   - repairFromSurface  (src/engine/repair-from-surface.ts)
 *   - loadContentSentences  (src/lib/content-loader.ts) — the REAL corpus loader (server path)
 *   - getGraphForLevel  (src/lib/concept-graph-loader.ts) — the REAL concept graphs
 *
 * WHAT IS HARNESS APPROXIMATION (the React write path lives in hooks and can't be imported):
 *   [A1] recordResult glue — replicated from src/hooks/useFingerprint.ts:272-367. We replicate:
 *        updateConceptMastery → logError(if wrong) → aggregateErrorPatterns →
 *        computeProductionGap → passedSentenceIds(if correct). We DO NOT replicate the
 *        level-progression branches (A1→A2 etc.) because no user masters a full level in 7 days.
 *   [A2] errorTag selection — replicated from the wired exercise components
 *        (FillInBlankExercise, WordOrderExercise, TranslationExercise, SpeedRound):
 *        errorTag = classifyError(userAnswer, correctAnswer, exerciseType, errorTagsDetectable).
 *        Post-E3 (A1) ALL FOUR components use the observed-diff classifier — the old
 *        authored-positional errorTagsDetectable[0] flaw is gone. The classifier defers
 *        to authored candidate tags on murky diffs and refuses to invent Norwegian-grammar
 *        tags on English-output types (translation-to-english/speed-round).
 *        conceptId = item.conceptIds[0] (CORRECT, from scheduler).
 *   [A3] Clock — Date is monkeypatched so srsNextReviewAt / decay / getReviewDueConcepts see a
 *        simulated "now". The engine reads `new Date()` / `Date.now()` internally; we override both.
 *   [A4] Answer correctness — driven by a per-user weakness profile (weak concept ~35% correct,
 *        others ~85%), seeded RNG for determinism. This is the learner model, not the engine.
 *   [A5] We run the `lær` block items (the recipe-driven, fingerprint-consuming core). We resolve
 *        each scheduled item to a concrete sentence the same way useSession.resolveItem does
 *        (concept seed pool, exclude passed for non-review), to get a real sentenceId + its
 *        errorTagsDetectable[0]. We mark passed sentences exactly as the hook does.
 *   [A6] Math.random is seeded so scheduler shuffle / interleaving picks are reproducible.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import {
  updateConceptMastery,
  seedInitialMastery,
  refreshDecay,
  isMastered,
  getConceptPhase,
  logError,
  computeProductionGap,
  aggregateErrorPatterns,
  generateSession,
  getPrimaryWeakConcepts,
  runDiagnosis,
  ensureWeekOpen,
  openWeek,
} from '../src/engine';
import { repairFromSurface } from '../src/engine/repair-from-surface';
import { classifyError } from '../src/lib/classify-error';
import { loadContentSentences } from '../src/lib/content-loader';
import { getGraphForLevel, getCumulativeConcepts } from '../src/lib/concept-graph-loader';
import { createEmptyFingerprint } from '../src/types/fingerprint';
import type { MistakeFingerprint, ConceptMastery, CEFRLevel } from '../src/types/fingerprint';
import type { ExerciseResult, SessionItem } from '../src/types/session';
import type { Sentence } from '../src/types/content';
import type { ErrorTag } from '../src/types/taxonomy';

// ─────────────────────────────────────────────────────────────────────────
// [A3] Mock clock — override Date so the engine's internal `new Date()` /
// `Date.now()` see a simulated time we can advance day-by-day.
// ─────────────────────────────────────────────────────────────────────────
const RealDate = Date;
let SIM_NOW = new RealDate('2026-06-01T09:00:00.000Z').getTime();

function installClock() {
  // @ts-expect-error overriding global Date for simulation
  global.Date = class extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(SIM_NOW);
      } else {
        // @ts-expect-error passthrough
        super(...args);
      }
    }
    static now() {
      return SIM_NOW;
    }
  };
}
function advanceDays(n: number) {
  SIM_NOW += n * 24 * 60 * 60 * 1000;
}
function advanceHours(n: number) {
  SIM_NOW += n * 60 * 60 * 1000;
}
installClock();

// ─────────────────────────────────────────────────────────────────────────
// [A6] Seeded RNG — deterministic Math.random for reproducible scheduler output.
// ─────────────────────────────────────────────────────────────────────────
let rngState = 123456789;
function seededRandom(): number {
  // xorshift32
  rngState ^= rngState << 13;
  rngState ^= rngState >>> 17;
  rngState ^= rngState << 5;
  rngState >>>= 0;
  return rngState / 0xffffffff;
}
Math.random = seededRandom;

// ─────────────────────────────────────────────────────────────────────────
// Corpus (REAL loader)
// ─────────────────────────────────────────────────────────────────────────
const { sentences, availableSentenceIds } = loadContentSentences();

// ─────────────────────────────────────────────────────────────────────────
// [A2] errorTag selection: replicate exercise component logic exactly.
// PRODUCTION (post-E3 A1): every wired component derives the tag via
// classifyError(userAnswer, correctAnswer, exerciseType, errorTagsDetectable),
// NOT the old authored-positional errorTagsDetectable[0]. We call the real
// classifier inline in runSession (see [A2] note at the call site).
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// [A5] Resolve a scheduled item to a concrete sentence — mirrors
// useSession.resolveItem: concept seed pool, exclude passed for non-review.
// ─────────────────────────────────────────────────────────────────────────
function resolveSentenceForItem(
  item: SessionItem,
  fp: MistakeFingerprint,
  level: CEFRLevel,
): Sentence | null {
  const conceptId = item.conceptIds[0] ?? '';
  const rawIds = availableSentenceIds[conceptId] ?? [];
  // level filter (same LEVEL_ORDER logic as scheduler.filterSentencesByLevel)
  const order = ['A1', 'A2', 'B1', 'B2'];
  const maxIdx = order.indexOf(level);
  const levelIds = rawIds.filter((id) => {
    const s = sentences[id];
    if (!s) return false;
    const sIdx = order.indexOf(s.cefrLevel);
    return sIdx >= 0 && sIdx <= maxIdx;
  });
  // type compatibility
  const compatible = levelIds.filter((id) => sentences[id]?.exerciseTypes.includes(item.exerciseType));
  const pool = compatible.length > 0 ? compatible : levelIds;
  const isReviewOrRepair = item.purpose === 'review' || item.isRepairItem;
  const passed = fp.passedSentenceIds ?? {};
  const notPassed = isReviewOrRepair ? pool : pool.filter((id) => !passed[id]);
  const effective = notPassed.length > 0 ? notPassed : pool;
  if (effective.length === 0) return null;
  const picked = effective[Math.floor(Math.random() * effective.length)];
  return picked ? sentences[picked] ?? null : null;
}

// ─────────────────────────────────────────────────────────────────────────
// [A1] recordResult glue — replicated from useFingerprint.ts:272-367
// (minus the level-progression branches; see [A1] note above).
// ─────────────────────────────────────────────────────────────────────────
function recordResult(
  fp: MistakeFingerprint,
  result: ExerciseResult,
  exerciseType: SessionItem['exerciseType'],
): MistakeFingerprint {
  const graph = getGraphForLevel(fp.currentLevel);
  const node = graph.concepts.find((c) => c.id === result.conceptId);
  const minAttempts = node?.minAttempts ?? 15;
  const minDays = node?.minDays ?? 3;

  const existing = fp.conceptMastery[result.conceptId];
  const updatedMastery = updateConceptMastery(existing, result.correct, minAttempts, minDays);

  let updated: MistakeFingerprint = {
    ...fp,
    conceptMastery: {
      ...fp.conceptMastery,
      [result.conceptId]: { ...updatedMastery, conceptId: result.conceptId },
    },
    updatedAt: new Date().toISOString(),
  };

  if (!result.correct && result.errorTag) {
    updated = logError(updated, {
      conceptId: result.conceptId,
      errorTag: result.errorTag,
      exerciseType,
      wrong: result.userAnswer,
      correct: result.correctAnswer,
      sentenceId: result.itemId,
    });
    updated = { ...updated, errorPatterns: aggregateErrorPatterns(updated) };
  }

  updated = {
    ...updated,
    productionGap: {
      ...updated.productionGap,
      [result.conceptId]: computeProductionGap(updated.recentErrors, result.conceptId),
    },
  };

  if (result.correct && result.sentenceId) {
    updated = {
      ...updated,
      passedSentenceIds: {
        ...updated.passedSentenceIds,
        [result.sentenceId]: new Date().toISOString(),
      },
    };
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────
// [A4] Learner model — per-user weakness profile decides correctness.
// ─────────────────────────────────────────────────────────────────────────
interface LearnerProfile {
  name: string;
  level: CEFRLevel;
  weakConceptIds: string[];      // concepts the learner is bad at
  weakAccuracy: number;          // P(correct) on weak concepts
  baseAccuracy: number;          // P(correct) on everything else
}

function answersCorrectly(profile: LearnerProfile, conceptId: string): boolean {
  const p = profile.weakConceptIds.includes(conceptId) ? profile.weakAccuracy : profile.baseAccuracy;
  return seededRandom() < p;
}

// ─────────────────────────────────────────────────────────────────────────
// Telemetry capture
// ─────────────────────────────────────────────────────────────────────────
interface ItemRecord {
  conceptId: string;
  exerciseType: string;
  purpose: string;
  selectionReason: string;
  correct: boolean;
  loggedErrorTag: ErrorTag | null;     // what landed in the error log (authored)
  sentenceId: string | null;
}
interface DaySnapshot {
  day: number;
  itemsRun: number;
  focusConceptShare: number; // share of lær items whose concept is in weeklyFocus
  weakConceptShare: number;  // share of lær items targeting the user's weak concept(s)
  itemRecords: ItemRecord[];
  weeklyFocus: string[];
  trackedConcepts: Record<string, ConceptSnapshot>;
  weakConceptScheduledCount: number;
}
interface ConceptSnapshot {
  rawScore: number;
  decayedScore: number;
  phase: string;
  srsLevel: number;
  nextReviewAt: string | null;
  attemptCount: number;
  classification: string;
}

function classify(m: ConceptMastery | undefined, node: { masteryThreshold: number; minAttempts: number; minDays: number } | undefined): string {
  if (!m || m.attemptCount === 0) return 'untested';
  if (node && isMastered(m, node.masteryThreshold, node.minAttempts, node.minDays)) return 'mastered';
  if (m.rawScore >= 80) return 'passed-score';
  if (m.rawScore >= 60) return 'learning';
  return 'weak';
}

function snapshotConcept(fp: MistakeFingerprint, conceptId: string): ConceptSnapshot {
  // E1/E2: resolve node + masteredIds over the CUMULATIVE concept set (A1..level)
  // so cross-level prereqs resolve and carried-forward lower-level concepts no
  // longer read phase=unknown. Mirrors the engine fix (scheduler/weekly-sprint).
  const cumulative = getCumulativeConcepts(fp.currentLevel);
  const node = cumulative.find((c) => c.id === conceptId);
  const m = fp.conceptMastery[conceptId];
  const masteredIds = new Set(
    cumulative.filter((c) => isMastered(fp.conceptMastery[c.id], c.masteryThreshold, c.minAttempts, c.minDays)).map((c) => c.id),
  );
  const phase = node ? getConceptPhase(m, node.prerequisites, masteredIds) : 'unknown';
  return {
    rawScore: m?.rawScore ?? 0,
    decayedScore: m?.decayedScore ?? 0,
    phase,
    srsLevel: m?.srsLevel ?? 0,
    nextReviewAt: m?.nextReviewAt ?? null,
    attemptCount: m?.attemptCount ?? 0,
    classification: classify(m, node),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Run one session: generate via real scheduler, run the lær block items.
// ─────────────────────────────────────────────────────────────────────────
function runSession(fp: MistakeFingerprint, profile: LearnerProfile): { fp: MistakeFingerprint; records: ItemRecord[]; lærConcepts: string[]; weakScheduled: number } {
  const graph = getGraphForLevel(fp.currentLevel);
  const isCalibrating = (fp.calibrationSessionsRemaining ?? 0) > 0;
  const recipe = isCalibrating
    ? { newMaterialRatio: 0.3, remediationRatio: 0.3, reviewRatio: 0.3, interleavingRatio: 0.1 }
    : {};

  const output = generateSession({
    fingerprint: fp,
    graph,
    availableSentenceIds,
    sentences,
    recipe,
  });

  const records: ItemRecord[] = [];
  // Run the lær block (the recipe-driven, corpus-consuming core).
  const lærBlock = output.blocks.find((b) => b.type === 'lær');
  const lærItems = lærBlock?.items ?? [];
  const lærConcepts: string[] = [];
  let weakScheduled = 0;

  let working = fp;
  for (const item of lærItems) {
    const conceptId = item.conceptIds[0] ?? '';
    lærConcepts.push(conceptId);
    if (profile.weakConceptIds.includes(conceptId)) weakScheduled++;

    const sentence = resolveSentenceForItem(item, working, fp.currentLevel);
    if (!sentence) {
      records.push({ conceptId, exerciseType: item.exerciseType, purpose: item.purpose, selectionReason: item.selectionReason, correct: false, loggedErrorTag: null, sentenceId: null });
      continue;
    }
    const correct = answersCorrectly(profile, conceptId);
    const userAnswer = correct ? sentence.norwegian : 'feil svar';
    const correctAnswer = sentence.norwegian;
    // [A2] PRODUCTION-FAITHFUL tag: mirror the now-wired exercise components
    // (FillInBlank/WordOrder/Translation/SpeedRound) which all call
    // classifyError(userAnswer, correctAnswer, exerciseType, errorTagsDetectable).
    // The classifier observes the real diff, defers to authored candidate tags on
    // murky diffs, and refuses to invent Norwegian-grammar tags on English-output
    // exercise types (translation-to-english / speed-round → unspecified/candidate).
    const loggedTag = correct
      ? null
      : (classifyError(userAnswer, correctAnswer, item.exerciseType, sentence.errorTagsDetectable) ?? 'unspecified');
    const result: ExerciseResult = {
      sessionId: output.session.id,
      itemId: item.id,
      correct,
      userAnswer,
      correctAnswer,
      timeTakenSeconds: 20,
      errorTag: loggedTag ?? undefined,
      conceptId,
      sentenceId: sentence.id,
    };
    working = recordResult(working, result, item.exerciseType);
    records.push({ conceptId, exerciseType: item.exerciseType, purpose: item.purpose, selectionReason: item.selectionReason, correct, loggedErrorTag: loggedTag, sentenceId: sentence.id });
    advanceHours(0.05); // small intra-session time advance
  }

  // decrement calibration counter (hook does this elsewhere; approximate)
  working = {
    ...working,
    calibrationSessionsRemaining: Math.max(0, (working.calibrationSessionsRemaining ?? 0) - 1),
    totalSessionsCompleted: (working.totalSessionsCompleted ?? 0) + 1,
    lastSessionAt: new Date().toISOString(),
  };

  return { fp: working, records, lærConcepts, weakScheduled };
}

// ─────────────────────────────────────────────────────────────────────────
// Seed a learner: cold-start (seedInitialMastery) then nudge the weak concept
// into an unlocked, weak state via a few early exercises so word-order / etc.
// (which start LOCKED behind prereqs) actually surface. We do this by running
// a few pre-day-0 sessions, which the engine unlocks naturally as prereqs
// reach mastery threshold — BUT 7 days is too short to master prereqs. So for
// users whose weak concept is prereq-gated, we ALSO force-unlock by seeding the
// prereq concepts to mastered. We document this explicitly.
// ─────────────────────────────────────────────────────────────────────────
function masteredMastery(conceptId: string): ConceptMastery {
  // attemptCount/uniqueDaysActive must clear the HIGHEST real curriculum
  // thresholds (max minAttempts=30, max minDays=10 across all graphs) so a
  // carried-forward concept genuinely passes isMastered and can satisfy the
  // cross-level prerequisite resolution (E1). Earlier values (20/5) silently
  // failed isMastered for B1/B2 prereqs, masking the engine fix.
  return {
    conceptId,
    rawScore: 90,
    confidenceScore: 0.9,
    decayedScore: 90,
    attemptCount: 35,
    correctCount: 33,
    uniqueDaysActive: 14,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: new Date().toISOString(),
    streak: 5,
    recentOutcomes: [true, true, true, true, true],
    srsLevel: 3,
    nextReviewAt: new Date(SIM_NOW + 14 * 86400000).toISOString(),
  };
}

function seedConceptInProgress(conceptId: string, rawScore: number): ConceptMastery {
  return {
    conceptId,
    rawScore,
    confidenceScore: 0.2,
    decayedScore: rawScore,
    attemptCount: 1,
    correctCount: rawScore > 50 ? 1 : 0,
    uniqueDaysActive: 1,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: rawScore > 50 ? new Date().toISOString() : null,
    streak: 0,
    recentOutcomes: [rawScore > 50],
    srsLevel: 0,
    nextReviewAt: new Date(SIM_NOW + 86400000).toISOString(),
  };
}

// Faithful progressed-learner seeding.
//
// REAL-APP FINDING (drives this approximation): getGraphForLevel(level) returns
// ONLY that level's concepts, and A2/B1/B2 graphs have ZERO prereq-free concepts
// AND reference prereqs from lower levels that are NOT in the graph. So
// seedInitialMastery seeds nothing at A2+, and getUnlockedConcepts returns nothing
// at A2+ (every prereq lookup misses). In the real app a B2 user only arrives via
// A1→A2→B1→B2 progression, carrying forward all lower-level concept mastery in the
// SAME fingerprint. We reproduce that: every concept from every level UP TO the
// active level is present in the fingerprint. Lower levels = mastered; the active
// level's concepts = seeded in-progress (so the scheduler has unlocked targets).
const ALL_LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2'];
function seedLearner(profile: LearnerProfile): { fp: MistakeFingerprint; forcedUnlocks: string[] } {
  let fp = createEmptyFingerprint(`sim-${profile.name}`);
  fp = { ...fp, currentLevel: profile.level };
  const activeIdx = ALL_LEVELS.indexOf(profile.level);
  const graph = getGraphForLevel(profile.level);

  const cm: Record<string, ConceptMastery> = {};
  const forcedUnlocks: string[] = [];

  // 1. Mark ALL concepts at levels BELOW the active level as mastered (carried forward).
  for (let i = 0; i < activeIdx; i++) {
    const g = getGraphForLevel(ALL_LEVELS[i]);
    for (const c of g.concepts) {
      cm[c.id] = masteredMastery(c.id);
      forcedUnlocks.push(c.id);
    }
  }

  // 2. Seed the ACTIVE level's concepts as in-progress (neutral 50), so phases compute
  //    and the scheduler can pick unlocked ones. Mirrors seedInitialMastery's neutral baseline
  //    but applied to all active-level concepts (their prereqs are now in cm as mastered).
  for (const c of graph.concepts) {
    if (!cm[c.id]) cm[c.id] = seedConceptInProgress(c.id, 55);
  }

  // 3. The weak concept(s): seed in-progress + low so they show as weak from day 0.
  //    Also ensure their direct prereqs (which may be active-level) are mastered so
  //    the weak concept is unlocked, not locked.
  for (const weak of profile.weakConceptIds) {
    const node = graph.concepts.find((c) => c.id === weak)
      ?? ALL_LEVELS.map(getGraphForLevel).flatMap((g) => g.concepts).find((c) => c.id === weak);
    if (node) {
      const stack = [...node.prerequisites];
      const seen = new Set<string>();
      while (stack.length) {
        const pid = stack.pop()!;
        if (seen.has(pid)) continue;
        seen.add(pid);
        const pnode = ALL_LEVELS.map(getGraphForLevel).flatMap((g) => g.concepts).find((c) => c.id === pid);
        if (!cm[pid] || !isMastered(cm[pid], pnode?.masteryThreshold ?? 80, pnode?.minAttempts ?? 15, pnode?.minDays ?? 3)) {
          cm[pid] = masteredMastery(pid);
          if (!forcedUnlocks.includes(pid)) forcedUnlocks.push(pid);
        }
        if (pnode) stack.push(...pnode.prerequisites);
      }
    }
    cm[weak] = seedConceptInProgress(weak, 45);
  }

  fp = { ...fp, conceptMastery: cm };
  fp = ensureWeekOpen(fp, graph);
  fp = refreshDecay(fp);
  return { fp, forcedUnlocks };
}

// ─────────────────────────────────────────────────────────────────────────
// Per-user 7-day run
// ─────────────────────────────────────────────────────────────────────────
function runUser(profile: LearnerProfile, sessionsPerDay: number, trackConcepts: string[]): {
  days: DaySnapshot[];
  forcedUnlocks: string[];
  finalFp: MistakeFingerprint;
  crossSurface: { before: ConceptSnapshot; after: ConceptSnapshot; loggedTag: ErrorTag; loggedConcept: string } | null;
} {
  // reset clock per user for clean timelines
  SIM_NOW = new RealDate('2026-06-01T09:00:00.000Z').getTime();
  rngState = 987654321 + profile.name.length * 17;

  const { fp: seeded, forcedUnlocks } = seedLearner(profile);
  let fp = seeded;
  const days: DaySnapshot[] = [];

  // Day 0 seed snapshot
  days.push(captureDay(fp, 0, [], 0, 0, [], 0, trackConcepts));

  for (let day = 1; day <= 7; day++) {
    // refresh decay at app-open (real engine)
    fp = refreshDecay(fp);
    fp = ensureWeekOpen(fp, getGraphForLevel(fp.currentLevel));

    let dayRecords: ItemRecord[] = [];
    let dayWeakScheduled = 0;
    let dayLærConcepts: string[] = [];
    for (let s = 0; s < sessionsPerDay; s++) {
      const r = runSession(fp, profile);
      fp = r.fp;
      dayRecords = dayRecords.concat(r.records);
      dayWeakScheduled += r.weakScheduled;
      dayLærConcepts = dayLærConcepts.concat(r.lærConcepts);
      advanceHours(2);
    }

    const focusSet = new Set(fp.weeklyFocus ?? []);
    const focusShare = dayLærConcepts.length ? dayLærConcepts.filter((c) => focusSet.has(c)).length / dayLærConcepts.length : 0;
    const weakShare = dayLærConcepts.length ? dayLærConcepts.filter((c) => profile.weakConceptIds.includes(c)).length / dayLærConcepts.length : 0;

    days.push(captureDay(fp, day, dayRecords, focusShare, weakShare, fp.weeklyFocus ?? [], dayWeakScheduled, trackConcepts));

    // advance to next day
    advanceDays(1);
    // re-align to morning
    SIM_NOW = new RealDate(SIM_NOW).setHours(9, 0, 0, 0);
  }

  // ── Cross-surface coherence test (Q4) ──
  // Simulate a JOURNAL error on the weak concept via repairFromSurface and
  // confirm it lands in the SAME concept mastery + error log.
  const weak = profile.weakConceptIds[0]!;
  const graph = getGraphForLevel(fp.currentLevel);
  const beforeSnap = snapshotConcept(fp, weak);
  // Find the error tag the weak concept's graph node uses (so the journal error
  // is attributed via errorTagToConceptId — we pass conceptId directly to mirror
  // the surfaces that know the concept; also capture where tag-only routing lands).
  const node = graph.concepts.find((c) => c.id === weak);
  const tag = (node?.errorTags[0] ?? 'unspecified') as ErrorTag;
  const beforeErrors = fp.recentErrors.length;
  const afterFp = repairFromSurface(fp, { surfaceKind: 'journal', errorTag: tag, conceptId: weak, wrong: 'feil', correct: 'riktig' }, graph);
  const afterSnap = snapshotConcept(afterFp, weak);
  const newError = afterFp.recentErrors[0];

  const crossSurface = {
    before: beforeSnap,
    after: afterSnap,
    loggedTag: newError?.errorTag ?? ('none' as ErrorTag),
    loggedConcept: newError?.conceptId ?? 'none',
  };
  void beforeErrors;

  return { days, forcedUnlocks, finalFp: afterFp, crossSurface };
}

function captureDay(
  fp: MistakeFingerprint,
  day: number,
  records: ItemRecord[],
  focusShare: number,
  weakShare: number,
  weeklyFocus: string[],
  weakScheduled: number,
  trackConcepts: string[],
): DaySnapshot {
  const trackedConcepts: Record<string, ConceptSnapshot> = {};
  for (const c of trackConcepts) trackedConcepts[c] = snapshotConcept(fp, c);
  return {
    day,
    itemsRun: records.length,
    focusConceptShare: focusShare,
    weakConceptShare: weakShare,
    itemRecords: records,
    weeklyFocus,
    trackedConcepts,
    weakConceptScheduledCount: weakScheduled,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Define the 4 users
// ─────────────────────────────────────────────────────────────────────────
const WEAK_ACC = 0.35;  // ~65% wrong
const BASE_ACC = 0.85;

const users: { profile: LearnerProfile; track: string[]; sessionsPerDay: number }[] = [
  {
    profile: { name: 'A1-wordorder', level: 'A1', weakConceptIds: ['svo-word-order', 'v2-word-order'], weakAccuracy: WEAK_ACC, baseAccuracy: BASE_ACC },
    track: ['svo-word-order', 'v2-word-order', 'noun-gender', 'personal-pronouns', 'to-be-verb'],
    sessionsPerDay: 2,
  },
  {
    // A2 has NO pure "article" concept; article-use lives at A1 (indefinite-articles,
    // definite-articles-singular) and resurfaces in A2 superlative-adjectives (article-use tag).
    // We make the user weak on superlative-adjectives (A2-native, article-tagged) so the A2
    // scheduler can actually target it; we ALSO carry the A1 article concepts forward as weak
    // to test whether article weakness inherited from A1 survives into A2 scheduling.
    profile: { name: 'A2-articles', level: 'A2', weakConceptIds: ['superlative-adjectives'], weakAccuracy: WEAK_ACC, baseAccuracy: BASE_ACC },
    track: ['superlative-adjectives', 'indefinite-articles', 'definite-articles-singular', 'perfect-tense', 'conjunctions'],
    sessionsPerDay: 2,
  },
  {
    // No B1 concept carries listening-recognition (verified). Listening is a CHANNEL,
    // not a concept — structurally invisible to concept mastery. We make the B1 user
    // weak on discourse-markers (a B1-native concept with real corpus) and document the
    // listening gap separately in the verdict.
    profile: { name: 'B1-listening', level: 'B1', weakConceptIds: ['discourse-markers'], weakAccuracy: WEAK_ACC, baseAccuracy: BASE_ACC },
    track: ['discourse-markers', 'past-perfect', 'phrasal-verbs', 'cleft-sentences'],
    sessionsPerDay: 1,
  },
  {
    profile: { name: 'B2-cohesion', level: 'B2', weakConceptIds: ['text-cohesion', 'complex-argumentation'], weakAccuracy: WEAK_ACC, baseAccuracy: BASE_ACC },
    track: ['text-cohesion', 'complex-argumentation', 'discourse-markers', 'academic-writing'],
    sessionsPerDay: 1,
  },
];

// NOTE on B1-listening: there is NO graph concept tagged listening-recognition
// at B1 (verified: B1 concepts carry verb-tense/word-order/reading-parsing/etc.,
// none carry listening-recognition). The exercise type listening-comprehension is
// scheduled in the LYTT block, not the lær block, and its concept attribution is
// whatever concept the scheduler picked — the listening *channel* failure is logged
// under that concept with errorTag listening-recognition only on listening items.
// So a "listening-weak" learner cannot be represented as a single weak CONCEPT;
// the weakness is a CHANNEL, and the fingerprint has no channel dimension. We make
// the B1 user weak on the concepts the scheduler actually concentrates on and
// document that listening weakness is structurally invisible to concept mastery.

// ─────────────────────────────────────────────────────────────────────────
// Run all + build report
// ─────────────────────────────────────────────────────────────────────────
function pct(n: number): string { return `${Math.round(n * 100)}%`; }

function timelineTable(days: DaySnapshot[], conceptId: string): string {
  let out = `| Day | rawScore | decayedScore | phase | SRS lvl | nextReview | attempts | classification |\n`;
  out += `|---|---|---|---|---|---|---|---|\n`;
  for (const d of days) {
    const c = d.trackedConcepts[conceptId];
    if (!c) continue;
    const nr = c.nextReviewAt ? new RealDate(c.nextReviewAt).toISOString().slice(5, 10) : '—';
    out += `| ${d.day} | ${c.rawScore} | ${c.decayedScore} | ${c.phase} | ${c.srsLevel} | ${nr} | ${c.attemptCount.toFixed(1)} | ${c.classification} |\n`;
  }
  return out;
}

function focusTable(days: DaySnapshot[]): string {
  let out = `| Day | lær items | weak-concept scheduled | weak share of lær | focus-concept share | weeklyFocus |\n`;
  out += `|---|---|---|---|---|---|\n`;
  for (const d of days) {
    if (d.day === 0) continue;
    out += `| ${d.day} | ${d.itemsRun} | ${d.weakConceptScheduledCount} | ${pct(d.weakConceptShare)} | ${pct(d.focusConceptShare)} | ${d.weeklyFocus.join(', ') || '—'} |\n`;
  }
  return out;
}

const results = users.map((u) => ({ u, r: runUser(u.profile, u.sessionsPerDay, u.track) }));

let md = `# NorskCoach — Engine Simulation: 4 Learners × 7 Days\n\n`;
md += `**Date:** 2026-06-01  \n**Harness:** \`output/fp-sim.ts\` (run via \`npx tsx\`)  \n`;
md += `**Method:** REAL engine pure functions (fingerprint.ts, scheduler.ts, weekly-sprint.ts, diagnosis.ts, repair-from-surface.ts) + REAL corpus loader + REAL concept graphs. Mock clock + seeded RNG + replicated \`recordResult\` glue.\n\n`;
md += `**Weak-concept accuracy:** ${pct(WEAK_ACC)} correct (~65% wrong). **Other concepts:** ${pct(BASE_ACC)} correct.\n\n`;

md += `## Harness approximations (honesty — what is NOT pure engine)\n\n`;
md += `- **[A1] \`recordResult\` glue** replicated from \`src/hooks/useFingerprint.ts:272-367\` (mastery → logError → aggregateErrorPatterns → computeProductionGap → passedSentenceIds). Level-progression branches (A1→A2…) omitted (no full-level mastery in 7 days).\n`;
md += `- **[A2] errorTag = \`classifyError(userAnswer, correctAnswer, exerciseType, errorTagsDetectable)\`** — production-faithful (post-E3 A1). All four wired components (FillInBlank, WordOrder, Translation, SpeedRound) now use the observed-diff classifier instead of the old authored-positional \`errorTagsDetectable[0]\`. The classifier defers to authored candidate tags on murky diffs and emits \`unspecified\`/candidate (never an invented grammar tag) on English-output types. conceptId = \`item.conceptIds[0]\` (scheduler-assigned, correct).\n`;
md += `- **[A3] Mock clock** overrides global \`Date\` so engine-internal \`new Date()\`/\`Date.now()\` (decay, srsNextReviewAt, getReviewDueConcepts) see simulated time.\n`;
md += `- **[A4] Learner correctness** is a seeded Bernoulli draw per concept (weak vs base accuracy). The learner model, not the engine.\n`;
md += `- **[A5] Item→sentence resolution** mirrors \`useSession.resolveItem\` (concept pool, level filter, exclude-passed for non-review). We run the **lær block** (recipe-driven, corpus-consuming core); lytt/snakk blocks are not run.\n`;
md += `- **[A6] Seeded \`Math.random\`** for reproducible scheduler shuffle/interleaving.\n`;
md += `- **Force-unlock:** prereq-gated weak concepts (e.g. \`svo-word-order\` needs \`personal-pronouns\`+\`present-tense-regular\`) had their prerequisites seeded to mastered so the weak concept is not \`locked\` from day 0. Per-user forced unlocks listed below.\n\n`;

for (const { u, r } of results) {
  md += `---\n\n## USER: ${u.profile.name} (${u.profile.level}) — weak on ${u.profile.weakConceptIds.join(', ')}\n\n`;
  md += `Sessions/day: ${u.sessionsPerDay}. Forced-unlock prereqs (harness): ${r.forcedUnlocks.length ? r.forcedUnlocks.join(', ') : 'none'}.\n\n`;

  md += `### Scheduler focus on the weak concept (lær block)\n\n`;
  md += focusTable(r.days);
  md += `\n`;

  for (const c of u.track) {
    md += `### Timeline — \`${c}\`${u.profile.weakConceptIds.includes(c) ? ' (WEAK)' : ''}\n\n`;
    md += timelineTable(r.days, c);
    md += `\n`;
  }

  // Cross-surface
  md += `### Cross-surface coherence (journal error via \`repairFromSurface\`) on \`${u.profile.weakConceptIds[0]}\`\n\n`;
  const cs = r.crossSurface!;
  md += `- Concept rawScore: ${cs.before.rawScore} → ${cs.after.rawScore} (attempts ${cs.before.attemptCount.toFixed(1)} → ${cs.after.attemptCount.toFixed(1)})\n`;
  md += `- Error logged under concept: \`${cs.loggedConcept}\`, errorTag: \`${cs.loggedTag}\`\n`;
  md += `- Same concept as session? **${cs.loggedConcept === u.profile.weakConceptIds[0] ? 'YES' : 'NO'}**\n\n`;

  // Authored-tag vs concept analysis (Q5)
  const allRecords = r.days.flatMap((d) => d.itemRecords).filter((rec) => !rec.correct && rec.loggedErrorTag);
  const weakRecords = allRecords.filter((rec) => u.profile.weakConceptIds.includes(rec.conceptId));
  const tagCounts: Record<string, number> = {};
  for (const rec of weakRecords) {
    const key = `${rec.conceptId} → tag:${rec.loggedErrorTag}`;
    tagCounts[key] = (tagCounts[key] ?? 0) + 1;
  }
  md += `### Concept-mastery vs error-TAG on weak-concept failures (Q5)\n\n`;
  md += `Wrong answers on weak concepts: ${weakRecords.length}. Concept attribution (from \`item.conceptIds[0]\`) vs logged tag (from \`errorTagsDetectable[0]\`):\n\n`;
  md += `| concept (correctly attributed) → logged errorTag | count |\n|---|---|\n`;
  for (const [k, v] of Object.entries(tagCounts).sort((a, b) => b[1] - a[1])) md += `| ${k} | ${v} |\n`;
  md += `\n`;

  // Diagnosis output
  const diag = runDiagnosis(r.finalFp);
  md += `### \`runDiagnosis\` output (final fingerprint)\n\n`;
  if (diag.length === 0) md += `No diagnosis rule fired.\n\n`;
  else {
    md += `| root cause | confidence | focus |\n|---|---|---|\n`;
    for (const d of diag) md += `| ${d.rootCauseConceptId} | ${d.confidence} | ${d.recommendedFocus} |\n`;
    md += `\n`;
  }

  // weak concept primary-weak rank
  const weakRank = getPrimaryWeakConcepts(r.finalFp, 10);
  md += `\`getPrimaryWeakConcepts\` top-10 (weakest first): ${weakRank.join(', ')}\n\n`;
}

writeFileSync(join(process.cwd(), 'output', 'pandoai-fingerprint-sim-2026-06-01.md'), md, 'utf-8');
console.log('Report written to output/pandoai-fingerprint-sim-2026-06-01.md');

// Console summary
for (const { u, r } of results) {
  const last = r.days[r.days.length - 1];
  const weak = u.profile.weakConceptIds[0]!;
  const wc = last.trackedConcepts[weak];
  console.log(`\n${u.profile.name}: weak ${weak} day7 raw=${wc?.rawScore} decayed=${wc?.decayedScore} phase=${wc?.phase} class=${wc?.classification}`);
  const avgFocus = r.days.slice(1).reduce((s, d) => s + d.focusConceptShare, 0) / 7;
  const avgWeak = r.days.slice(1).reduce((s, d) => s + d.weakConceptShare, 0) / 7;
  console.log(`  avg focus-share=${pct(avgFocus)} avg weak-share=${pct(avgWeak)} crossSurface-sameConcept=${r.crossSurface!.loggedConcept === weak}`);
}
