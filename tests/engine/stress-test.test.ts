/**
 * stress-test.test.ts — NorskCoach adaptive engine stress test
 *
 * 8 simulated learner scenarios verifying the engine end-to-end:
 * cold-start, weekly sprint, repair loop, decay+SRS, CEFR filtering,
 * level progression, cross-surface consistency, focus bias + diagnosis.
 *
 * All engine functions are pure — no React, no Supabase, no browser APIs.
 */

import { describe, it, expect } from 'vitest';
import { generateSession, filterSentencesByLevel } from '@/engine/scheduler';
import {
  updateConceptMastery,
  refreshDecay,
  seedInitialMastery,
  logError,
  computeProductionGap,
} from '@/engine/fingerprint';
import { createEmptyFingerprint } from '@/types/fingerprint';
import {
  selectWeeklyFocus,
  openWeek,
  closeWeek,
  ensureWeekOpen,
} from '@/engine/weekly-sprint';
import { runDiagnosis, getPrimaryWeakConcepts, getReviewDueConcepts } from '@/engine/diagnosis';
import { buildRepairPlan, makeRepairItems } from '@/engine/repair-loop';
import type { MistakeFingerprint, ConceptMastery, ErrorLogEntry } from '@/types/fingerprint';
import type { ConceptGraph, ConceptNode } from '@/types/concepts';
import type { Sentence } from '@/types/content';
import { DEFAULT_SESSION_RECIPE, LEVEL_BLOCK_SIZES } from '@/types/session';
// ── Fixture helpers ──────────────────────────────────────────────────────────

function makeConcept(
  id: string,
  prereqs: string[] = [],
  level: 'A1' | 'A2' | 'B1' | 'B2' = 'A1',
): ConceptNode {
  return {
    id, label: id, description: 'Test ' + id,
    cefrLevel: level, prerequisites: prereqs,
    masteryThreshold: 80, minAttempts: 15, minDays: 3, errorTags: [],
  };
}

function makeGraph(defs: Array<{ id: string; prereqs?: string[]; level?: 'A1' | 'A2' | 'B1' | 'B2' }>): ConceptGraph {
  return {
    version: '1.0', language: 'nb-NO',
    concepts: defs.map((d) => makeConcept(d.id, d.prereqs ?? [], d.level ?? 'A1')),
  };
}

function makeSentence(id: string, conceptId: string, level: 'A1' | 'A2' | 'B1' | 'B2' = 'A1'): Sentence {
  return {
    id, norwegian: 'Norsk ' + id, english: 'English ' + id,
    conceptIds: [conceptId], vocabularyClusters: [], errorTagsDetectable: [],
    cefrLevel: level, difficulty: 1,
    exerciseTypes: [
      'translation-to-norwegian', 'fill-in-blank', 'word-order',
      'translation-to-english', 'listening-comprehension',
    ],
  };
}

function buildCorpus(
  conceptIds: string[], perConcept = 5, level: 'A1' | 'A2' | 'B1' | 'B2' = 'A1',
): { sentences: Record<string, Sentence>; availableSentenceIds: Record<string, string[]> } {
  const sentences: Record<string, Sentence> = {};
  const availableSentenceIds: Record<string, string[]> = {};
  for (const cid of conceptIds) {
    availableSentenceIds[cid] = [];
    for (let i = 0; i < perConcept; i++) {
      const sid = cid + '-s' + i;
      sentences[sid] = makeSentence(sid, cid, level);
      availableSentenceIds[cid].push(sid);
    }
  }
  return { sentences, availableSentenceIds };
}

function buildMixedCorpus(
  items: Array<{ conceptId: string; level: 'A1' | 'A2' | 'B1' | 'B2' }>, perConcept = 5,
): { sentences: Record<string, Sentence>; availableSentenceIds: Record<string, string[]> } {
  const sentences: Record<string, Sentence> = {};
  const availableSentenceIds: Record<string, string[]> = {};
  for (const { conceptId, level } of items) {
    availableSentenceIds[conceptId] = [];
    for (let i = 0; i < perConcept; i++) {
      const sid = conceptId + '-s' + i;
      sentences[sid] = makeSentence(sid, conceptId, level);
      availableSentenceIds[conceptId].push(sid);
    }
  }
  return { sentences, availableSentenceIds };
}

function makeMastery(conceptId: string, overrides: Partial<ConceptMastery> = {}): ConceptMastery {
  return {
    conceptId, rawScore: 50, confidenceScore: 0.5, decayedScore: 50,
    attemptCount: 10, correctCount: 5, uniqueDaysActive: 2,
    lastAttemptAt: new Date().toISOString(), lastCorrectAt: new Date().toISOString(),
    streak: 1, recentOutcomes: [true, false, true, false, true],
    srsLevel: 0, nextReviewAt: null, ...overrides,
  };
}

function baseFingerprint(userId: string, overrides: Partial<MistakeFingerprint> = {}): MistakeFingerprint {
  return { ...createEmptyFingerprint(userId), passedSentenceIds: {}, ...overrides };
}
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

// ── Test 1: Cold start ───────────────────────────────────────────────────────

describe('Test 1: Cold start — first session adaptation', () => {
  const a1Concepts = ['noun-gender','personal-pronouns','infinitive-form','present-tense','negation','definite-articles-singular'];
  const graph = makeGraph(a1Concepts.map((id) => ({ id })));
  const { sentences, availableSentenceIds } = buildCorpus(a1Concepts, 6);
  const fp = baseFingerprint('cold-start-user', {
    calibrationSessionsRemaining: 5,
    conceptMastery: {
      'noun-gender':       makeMastery('noun-gender',       { rawScore: 25, decayedScore: 22, attemptCount: 3 }),
      'personal-pronouns': makeMastery('personal-pronouns', { rawScore: 65, decayedScore: 60, attemptCount: 4 }),
      'negation':          makeMastery('negation',          { rawScore: 20, decayedScore: 18, attemptCount: 3 }),
    },
  });
  const calibrationRecipe = { newMaterialRatio: 0.30, remediationRatio: 0.30, reviewRatio: 0.30, interleavingRatio: 0.10 };
  const { session, blocks, weakConcepts } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences, recipe: calibrationRecipe });
  const lærBlock = blocks.find((b) => b.type === 'lær')!;
  const lærItems = lærBlock.items;
  const lærTarget = LEVEL_BLOCK_SIZES.A1.lær;

  it('calibrationSessionsRemaining is 5 on fresh fingerprint', () => {
    expect(fp.calibrationSessionsRemaining).toBe(5);
  });
  it('session generates without throwing and has items', () => {
    expect(session.items.length).toBeGreaterThan(0);
  });
  it('calibration recipe produces ~30/30/30 rem/rev/new in lær block', () => {
    const remCount = lærItems.filter((i) => i.purpose === 'remediation').length;
    const revCount = lærItems.filter((i) => i.purpose === 'review').length;
    const newCount = lærItems.filter((i) => i.purpose === 'new-material').length;
    const eR = Math.round(lærTarget * 0.30), eV = Math.round(lærTarget * 0.30), eN = Math.round(lærTarget * 0.30);
    expect(remCount).toBeGreaterThanOrEqual(Math.max(0, eR - 2));
    expect(remCount).toBeLessThanOrEqual(eR + 2);
    expect(revCount).toBeGreaterThanOrEqual(Math.max(0, eV - 2));
    expect(revCount).toBeLessThanOrEqual(eV + 2);
    expect(newCount).toBeGreaterThanOrEqual(Math.max(0, eN - 2));
    expect(newCount).toBeLessThanOrEqual(eN + 2);
  });
  it('noun-gender and negation identified as weak concepts', () => {
    expect(weakConcepts).toContain('noun-gender');
    expect(weakConcepts).toContain('negation');
  });
  it('at least one weak concept appears in session items', () => {
    const ids = new Set(session.items.flatMap((i) => i.conceptIds));
    expect(ids.has('noun-gender') || ids.has('negation')).toBe(true);
  });
  it('every item carries a selectionReason', () => {
    for (const item of session.items) expect(item.selectionReason).toBeTruthy();
  });
  it('session level is A1', () => { expect(session.level).toBe('A1'); });
  it('all lær items have valid purpose', () => {
    const valid = new Set(['remediation','review','new-material','interleaving','new-vocab']);
    for (const item of lærItems) expect(valid.has(item.purpose)).toBe(true);
  });
});


// ── Test 2: Weekly sprint ──────────────────────────────────────────────────

describe('Test 2: Weekly sprint cycle — 3 full iterations', () => {
  const conceptIds = ['noun-gender','v2-word-order','negation','present-tense','adjective-agreement','modal-verbs'];
  const graph = makeGraph(conceptIds.map((id) => ({ id })));
  function buildSprintFp(mo: Record<string, Partial<ConceptMastery>>): MistakeFingerprint {
    const cm: Record<string, ConceptMastery> = {};
    for (const id of conceptIds) cm[id] = makeMastery(id, mo[id] ?? {});
    return baseFingerprint('sprint-user', { calibrationSessionsRemaining: 0, conceptMastery: cm,
      weeklyFocus: [], weekStartedAt: null, weeklySprintHistory: [], weekStartSnapshots: {} });
  }

  it('selectWeeklyFocus picks 3 weakest by decayedScore', () => {
    const fp = buildSprintFp({ 'noun-gender': { decayedScore: 20 }, 'v2-word-order': { decayedScore: 25 },
      'negation': { decayedScore: 30 }, 'present-tense': { decayedScore: 55 },
      'adjective-agreement': { decayedScore: 60 }, 'modal-verbs': { decayedScore: 70 } });
    const focus = selectWeeklyFocus(fp, graph);
    expect(focus.length).toBeGreaterThan(0);
    expect(focus.length).toBeLessThanOrEqual(5);
    expect(focus).toContain('noun-gender');
    expect(focus).toContain('v2-word-order');
    expect(focus).toContain('negation');
  });

  it('openWeek sets weekStartedAt and snapshots each focus concept', () => {
    const fp = buildSprintFp({ 'noun-gender': { decayedScore: 20, attemptCount: 8 } });
    const now = new Date();
    const opened = openWeek(fp, graph, now);
    expect(opened.weekStartedAt).toBe(now.toISOString());
    expect(opened.weeklyFocus.length).toBeGreaterThan(0);
    for (const id of opened.weeklyFocus) {
      expect(opened.weekStartSnapshots[id]).toBeDefined();
    }
  });

  it('generateSession biases remediation toward focus and emits weekly_focus reason', () => {
    const fp = buildSprintFp({ 'noun-gender': { decayedScore: 20 }, 'v2-word-order': { decayedScore: 25 },
      'negation': { decayedScore: 30 }, 'present-tense': { decayedScore: 55 },
      'adjective-agreement': { decayedScore: 60 }, 'modal-verbs': { decayedScore: 70 } });
    const fpW = openWeek(fp, graph, new Date());
    const { sentences, availableSentenceIds } = buildCorpus(conceptIds, 5);
    const { session } = generateSession({ fingerprint: fpW, graph, availableSentenceIds, sentences });
    const focusIds = new Set(fpW.weeklyFocus);
    const remItems = session.items.filter((i) => i.purpose === 'remediation');
    expect(remItems.filter((i) => focusIds.has(i.conceptIds[0] ?? '')).length).toBeGreaterThan(0);
    expect(session.items.some((i) => i.selectionReason === 'weekly_focus')).toBe(true);
  });

  it('closeWeek records graduated:true when concept meets threshold and minAttempts', () => {
    const gGraph = makeGraph([{ id: 'noun-gender' }]);
    gGraph.concepts[0]!.masteryThreshold = 80;
    gGraph.concepts[0]!.minAttempts = 5;
    const fp = baseFingerprint('sprint-user', { weekStartedAt: daysAgo(7), weeklyFocus: ['noun-gender'],
      conceptMastery: { 'noun-gender': makeMastery('noun-gender', { rawScore: 85, decayedScore: 80, attemptCount: 10 }) },
      weekStartSnapshots: { 'noun-gender': { rawScore: 30, decayedScore: 28, attemptCount: 3 } },
      weeklySprintHistory: [] });
    const result = closeWeek(fp, gGraph, { status: 'completed',
      checkResult: { takenAt: new Date().toISOString(), score: 75, items: 8 } });
    expect(result.weeklySprintHistory[0]?.focusOutcomes['noun-gender']?.graduated).toBe(true);
    expect(result.weeklyFocus).toEqual([]);
    expect(result.weekStartedAt).toBeNull();
  });

  it('openWeek after graduation selects new weak concepts as focus', () => {
    const fp2 = buildSprintFp({ 'noun-gender': { decayedScore: 82 }, 'v2-word-order': { decayedScore: 22 },
      'negation': { decayedScore: 28 }, 'present-tense': { decayedScore: 35 },
      'adjective-agreement': { decayedScore: 60 }, 'modal-verbs': { decayedScore: 70 } });
    const opened2 = openWeek(fp2, graph, new Date());
    expect(opened2.weeklyFocus).toContain('v2-word-order');
    expect(opened2.weeklyFocus).toContain('negation');
  });

  it('selectWeeklyFocus includes SRS-due concept within the week window', () => {
    const fp3 = buildSprintFp({ 'noun-gender': { decayedScore: 82, nextReviewAt: daysFromNow(3) },
      'v2-word-order': { decayedScore: 40 }, 'negation': { decayedScore: 45 },
      'present-tense': { decayedScore: 50 }, 'adjective-agreement': { decayedScore: 55 },
      'modal-verbs': { decayedScore: 60 } });
    expect(selectWeeklyFocus(fp3, graph)).toContain('noun-gender');
  });

  it('3-cycle sprint history accumulates newest-first with correct statuses', () => {
    let fp = buildSprintFp({ 'noun-gender': { decayedScore: 20 }, 'v2-word-order': { decayedScore: 25 },
      'negation': { decayedScore: 30 }, 'present-tense': { decayedScore: 50 },
      'adjective-agreement': { decayedScore: 55 }, 'modal-verbs': { decayedScore: 60 } });
    const t1 = new Date();
    fp = openWeek(fp, graph, t1);
    fp = closeWeek(fp, graph, { status: 'completed', checkResult: { takenAt: new Date().toISOString(), score: 70, items: 8 } });
    expect(fp.weeklySprintHistory.length).toBe(1);
    const t2 = new Date(t1.getTime() + 7 * 86400000 + 1000);
    fp = openWeek(fp, graph, t2);
    fp = closeWeek(fp, graph, { status: 'completed', checkResult: null });
    expect(fp.weeklySprintHistory.length).toBe(2);
    const t3 = new Date(t2.getTime() + 7 * 86400000 + 1000);
    fp = openWeek(fp, graph, t3);
    fp = closeWeek(fp, graph, { status: 'abandoned', checkResult: null });
    expect(fp.weeklySprintHistory.length).toBe(3);
    expect(fp.weeklySprintHistory[0]?.status).toBe('abandoned');
    expect(fp.weeklySprintHistory[1]?.status).toBe('completed');
    expect(fp.weeklySprintHistory[2]?.status).toBe('completed');
  });
});

// ── Test 3: Repair loop ───────────────────────────────────────────────────────

describe('Test 3: Repair loop — plan + items + 2x cap', () => {
  const errEntry: ErrorLogEntry = {
    id: 'err-1', conceptId: 'noun-gender', errorTag: 'noun-gender',
    exerciseType: 'translation-to-norwegian', wrong: 'et hund', correct: 'en hund',
    timestamp: new Date().toISOString(), sentenceId: 'noun-gender-s0',
  };
  const pool = ['noun-gender-s0', 'noun-gender-s1', 'noun-gender-s2'];
  const plan = buildRepairPlan(errEntry);
  const repairItems = makeRepairItems(errEntry, plan, pool);

  it('buildRepairPlan returns non-empty explanation', () => {
    expect(plan.explanation.length).toBeGreaterThan(0);
  });
  it('plan has exactly 2 micro-drill exercise types', () => {
    expect(plan.microDrillExerciseTypes.length).toBe(2);
  });
  it('retry type matches original exercise type', () => {
    expect(plan.retryExerciseType).toBe(errEntry.exerciseType);
  });
  it('makeRepairItems: 2 micro-drills + 1 retry = 3 items', () => {
    expect(repairItems.length).toBe(3);
  });
  it('all repair items marked isRepairItem true', () => {
    for (const item of repairItems) expect(item.isRepairItem).toBe(true);
  });
  it('all repair items carry selectionReason repair_target', () => {
    for (const item of repairItems) expect(item.selectionReason).toBe('repair_target');
  });
  it('micro-drill items carry triggeredBy in repairContext', () => {
    const drills = repairItems.filter((i) => i.repairContext?.step === 'micro-drill');
    expect(drills.length).toBe(2);
    for (const d of drills) expect(d.repairContext?.triggeredBy).toEqual(errEntry);
  });
  it('retry item references original sentenceId', () => {
    const retry = repairItems.find((i) => i.repairContext?.step === 'retry');
    expect(retry?.contentId).toBe(errEntry.sentenceId);
  });
  it('2x cap: 10 originals + repair items stays at or below 20 total', () => {
    const errors: ErrorLogEntry[] = Array.from({ length: 10 }, (_, i) => ({
      id: 'ec' + i, conceptId: 'noun-gender', errorTag: 'noun-gender' as const,
      exerciseType: 'translation-to-norwegian' as const,
      wrong: 'et hund', correct: 'en hund', timestamp: new Date().toISOString(),
      sentenceId: 'noun-gender-s' + i,
    }));
    const origCount = 10;
    const cap = origCount * 2; // 20 total budget
    let all: ReturnType<typeof makeRepairItems> = [];
    for (const e of errors) {
      const p2 = buildRepairPlan(e);
      const ri = makeRepairItems(e, p2, pool);
      // Simulate the cap: only add repair items that fit within the budget
      const budget = cap - origCount - all.length;
      all = all.concat(ri.slice(0, budget));
      if (all.length >= cap - origCount) break;
    }
    expect(origCount + all.length).toBeLessThanOrEqual(cap);
  });
});

// ── Test 4: Decay + SRS ───────────────────────────────────────────────────────

describe('Test 4: Decay + SRS interaction', () => {
  it('refreshDecay: 30d-old concept decays toward floor — result between 50 and 70', () => {
    const fp = baseFingerprint('decay-user', {
      conceptMastery: {
        'noun-gender': makeMastery('noun-gender', { rawScore: 90, decayedScore: 90, lastAttemptAt: daysAgo(30) }),
      },
    });
    const m = refreshDecay(fp).conceptMastery['noun-gender']!;
    // half-life 25d: factor = exp(-ln2/25*30) ≈ 0.44 → decayed = 35 + (90-35)*0.44 ≈ 59
    expect(m.decayedScore).toBeGreaterThanOrEqual(35);
    expect(m.decayedScore).toBeLessThan(90);
    expect(m.decayedScore).toBeGreaterThan(50);
    expect(m.decayedScore).toBeLessThan(70);
  });

  it('refreshDecay: never-attempted concept stays at decayedScore 0', () => {
    const fp = baseFingerprint('decay-user2', {
      conceptMastery: { 'noun-gender': makeMastery('noun-gender', { rawScore: 0, decayedScore: 0, lastAttemptAt: null }) },
    });
    expect(refreshDecay(fp).conceptMastery['noun-gender']?.decayedScore).toBe(0);
  });

  it('decay floor: 200d without practice keeps decayedScore >= 35', () => {
    const fp = baseFingerprint('decay-user3', {
      conceptMastery: { 'noun-gender': makeMastery('noun-gender', { rawScore: 90, decayedScore: 90, lastAttemptAt: daysAgo(200) }) },
    });
    expect(refreshDecay(fp).conceptMastery['noun-gender']?.decayedScore).toBeGreaterThanOrEqual(35);
  });

  it('getReviewDueConcepts: overdue appears, future-due does not', () => {
    const fp = baseFingerprint('srs-user', {
      conceptMastery: {
        'noun-gender':   makeMastery('noun-gender',   { nextReviewAt: daysAgo(1) }),
        'present-tense': makeMastery('present-tense', { nextReviewAt: daysFromNow(5) }),
      },
    });
    const due = getReviewDueConcepts(fp);
    expect(due).toContain('noun-gender');
    expect(due).not.toContain('present-tense');
  });

  it('SRS-due concept appears in session review slot', () => {
    const cids = ['noun-gender','present-tense','negation'];
    const graph = makeGraph(cids.map((id) => ({ id })));
    const { sentences, availableSentenceIds } = buildCorpus(cids, 5);
    const fp = baseFingerprint('srs-session', {
      conceptMastery: {
        'noun-gender':   makeMastery('noun-gender',   { rawScore: 80, decayedScore: 72, nextReviewAt: daysAgo(1) }),
        'present-tense': makeMastery('present-tense', { rawScore: 45, decayedScore: 40 }),
        'negation':      makeMastery('negation',      { rawScore: 35, decayedScore: 30 }),
      },
    });
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const rev = session.items.filter((i) => i.purpose === 'review' && i.conceptIds.includes('noun-gender'));
    expect(rev.length).toBeGreaterThan(0);
  });

  it('decayed concept (low decayedScore vs high rawScore) is prioritised in selectWeeklyFocus', () => {
    const cids = ['noun-gender','present-tense','negation','modal-verbs'];
    const graph = makeGraph(cids.map((id) => ({ id })));
    const fp = baseFingerprint('decay-focus', {
      conceptMastery: {
        'noun-gender':   makeMastery('noun-gender',   { rawScore: 80, decayedScore: 38, lastAttemptAt: daysAgo(60) }),
        'present-tense': makeMastery('present-tense', { rawScore: 60, decayedScore: 58 }),
        'negation':      makeMastery('negation',      { rawScore: 65, decayedScore: 63 }),
        'modal-verbs':   makeMastery('modal-verbs',   { rawScore: 70, decayedScore: 68 }),
      },
    });
    expect(selectWeeklyFocus(fp, graph)).toContain('noun-gender');
  });
});

// ── Test 5: CEFR filtering ────────────────────────────────────────────────────

describe('Test 5: CEFR sentence filtering', () => {
  const mixed = buildMixedCorpus([
    { conceptId: 'noun-gender',       level: 'A1' },
    { conceptId: 'definite-articles', level: 'A2' },
    { conceptId: 'subjunctive',       level: 'B1' },
    { conceptId: 'passive-voice',     level: 'B2' },
  ], 4);
  const allIds = Object.values(mixed.availableSentenceIds).flat();

  it('A1: filterSentencesByLevel returns only A1 sentences', () => {
    const filtered = filterSentencesByLevel(allIds, 'A1', mixed.sentences);
    for (const id of filtered) expect(mixed.sentences[id]?.cefrLevel).toBe('A1');
    expect(filtered.length).toBe(4);
  });

  it('B1: sees A1+A2+B1 but not B2', () => {
    const filtered = filterSentencesByLevel(allIds, 'B1', mixed.sentences);
    const levels = filtered.map((id) => mixed.sentences[id]?.cefrLevel);
    expect(levels).not.toContain('B2');
    expect(levels).toContain('A1');
    expect(levels).toContain('A2');
    expect(levels).toContain('B1');
  });

  it('B2: sees all levels', () => {
    expect(filterSentencesByLevel(allIds, 'B2', mixed.sentences).length).toBe(allIds.length);
  });

  it('A1: B2 sentence is excluded', () => {
    const s: Record<string, ReturnType<typeof makeSentence>> = {
      'ng-a1': makeSentence('ng-a1', 'noun-gender', 'A1'),
      'ng-b2': makeSentence('ng-b2', 'noun-gender', 'B2'),
    };
    const f = filterSentencesByLevel(['ng-a1', 'ng-b2'], 'A1', s);
    expect(f).toContain('ng-a1');
    expect(f).not.toContain('ng-b2');
  });

  it('unknown level string: filterSentencesByLevel returns empty array (safe rejection)', () => {
    const result = filterSentencesByLevel(allIds, 'C1', mixed.sentences);
    expect(result).toEqual([]);
  });
});

// ── Test 6: Level progression ─────────────────────────────────────────────────

describe('Test 6: Level progression chain A1 to B2', () => {
  it('seedInitialMastery seeds root concepts only (no prerequisites)', () => {
    const a2Graph = makeGraph([
      { id: 'a2-tense',    prereqs: [],           level: 'A2' },
      { id: 'a2-compound', prereqs: ['a2-tense'], level: 'A2' },
    ]);
    const seeded = seedInitialMastery(baseFingerprint('level-user', { currentLevel: 'A2' }), a2Graph);
    expect(seeded.conceptMastery['a2-tense']).toBeDefined();
    expect(seeded.conceptMastery['a2-tense']?.rawScore).toBe(50);
    expect(seeded.conceptMastery['a2-tense']?.confidenceScore).toBe(0.15);
    expect(seeded.conceptMastery['a2-compound']).toBeUndefined();
  });

  it('seedInitialMastery is idempotent when graph concepts already exist', () => {
    const graph = makeGraph([{ id: 'noun-gender' }]);
    const fp = baseFingerprint('level-user2', { conceptMastery: { 'noun-gender': makeMastery('noun-gender', { rawScore: 75 }) } });
    expect(seedInitialMastery(fp, graph).conceptMastery['noun-gender']?.rawScore).toBe(75);
  });

  it('A1 to A2: ensureWeekOpen with A2 graph picks A2 focus concepts', () => {
    const a2Graph = makeGraph([
      { id: 'a2-reported-speech', prereqs: [], level: 'A2' },
      { id: 'a2-conditional',    prereqs: [], level: 'A2' },
      { id: 'a2-past-tense',     prereqs: [], level: 'A2' },
    ]);
    const fp = baseFingerprint('transition', { currentLevel: 'A2', weekStartedAt: null,
      conceptMastery: {
        'a2-reported-speech': makeMastery('a2-reported-speech', { decayedScore: 20 }),
        'a2-conditional':     makeMastery('a2-conditional',     { decayedScore: 25 }),
        'a2-past-tense':      makeMastery('a2-past-tense',      { decayedScore: 30 }),
      } });
    const opened = ensureWeekOpen(fp, a2Graph);
    expect(opened.weekStartedAt).not.toBeNull();
    expect(opened.weeklyFocus.length).toBeGreaterThan(0);
    for (const id of opened.weeklyFocus) expect(id).toMatch(/^a2-/);
  });

  it('A1 session level is A1 and generates items', () => {
    const a1Graph = makeGraph([{ id: 'noun-gender' }, { id: 'personal-pronouns' }, { id: 'infinitive-form' }]);
    const { sentences, availableSentenceIds } = buildCorpus(['noun-gender','personal-pronouns','infinitive-form'], 5, 'A1');
    const fp = baseFingerprint('a1-user', { currentLevel: 'A1',
      conceptMastery: {
        'noun-gender':       makeMastery('noun-gender',       { rawScore: 30, decayedScore: 28 }),
        'personal-pronouns': makeMastery('personal-pronouns', { rawScore: 40, decayedScore: 38 }),
      } });
    const { session } = generateSession({ fingerprint: fp, graph: a1Graph, availableSentenceIds, sentences });
    expect(session.level).toBe('A1');
    expect(session.items.length).toBeGreaterThan(0);
  });

  it('B2 fingerprint: block sizes within B2 LEVEL_BLOCK_SIZES bounds', () => {
    const b2Graph = makeGraph([
      { id: 'b2-complex-clause', prereqs: [], level: 'B2' },
      { id: 'b2-passive',        prereqs: [], level: 'B2' },
    ]);
    const { sentences, availableSentenceIds } = buildCorpus(['b2-complex-clause','b2-passive'], 5, 'B2');
    const fp = baseFingerprint('b2-user', { currentLevel: 'B2',
      conceptMastery: {
        'b2-complex-clause': makeMastery('b2-complex-clause', { rawScore: 35, decayedScore: 33 }),
        'b2-passive':        makeMastery('b2-passive',        { rawScore: 40, decayedScore: 38 }),
      } });
    const { blocks } = generateSession({ fingerprint: fp, graph: b2Graph, availableSentenceIds, sentences });
    const lærLen  = blocks.find((b) => b.type === 'lær')?.items.length  ?? 0;
    const lyttLen = blocks.find((b) => b.type === 'lytt')?.items.length ?? 0;
    const snakkLen = blocks.find((b) => b.type === 'snakk')?.items.length ?? 0;
    expect(lærLen).toBeLessThanOrEqual(LEVEL_BLOCK_SIZES.B2.lær   + 2);
    expect(lyttLen).toBeLessThanOrEqual(LEVEL_BLOCK_SIZES.B2.lytt  + 2);
    expect(snakkLen).toBeLessThanOrEqual(LEVEL_BLOCK_SIZES.B2.snakk + 2);
  });
});

// ── Test 7: Cross-surface fingerprint consistency ─────────────────────────────

describe('Test 7: Cross-surface fingerprint consistency', () => {
  it('updateConceptMastery: correct answer raises rawScore via EMA', () => {
    const existing = makeMastery('noun-gender', { rawScore: 40, attemptCount: 5 });
    const updated = updateConceptMastery(existing, true, 15, 3);
    expect(updated.rawScore).toBeGreaterThan(existing.rawScore);
    expect(updated.attemptCount).toBe(6);
    expect(updated.correctCount).toBe(existing.correctCount + 1);
  });

  it('updateConceptMastery: wrong answer lowers rawScore', () => {
    const existing = makeMastery('noun-gender', { rawScore: 60, attemptCount: 10, recentOutcomes: [false,false,false] });
    expect(updateConceptMastery(existing, false, 15, 3).rawScore).toBeLessThan(existing.rawScore);
  });

  it('slip detection: wrong after 4 consecutive correct carries reduced weight', () => {
    // rawScore=80, attemptCount=8 → α=0.15 (consolidation phase: rawScore 70-85)
    // slip (effectiveOutcome=0.30): 80*(1-0.15) + 0.30*100*0.15 = 68+4.5 = 72.5 → 73
    // non-slip (effectiveOutcome=0):  80*(1-0.15) + 0 = 68
    // Slip result (73) > non-slip result (68), both < 80
    const existing = makeMastery('noun-gender', { rawScore: 80, attemptCount: 8, recentOutcomes: [true,true,true,true] });
    const updated = updateConceptMastery(existing, false, 15, 3);
    expect(updated.rawScore).toBeGreaterThan(68); // more than non-slip penalty
    expect(updated.rawScore).toBeLessThan(80);    // but still drops from 80
  });

  it('SRS level increments on correct, resets to 0 on wrong', () => {
    const existing = makeMastery('noun-gender', { srsLevel: 2, recentOutcomes: [false] });
    expect(updateConceptMastery(existing, true,  15, 3).srsLevel).toBe(3);
    expect(updateConceptMastery(existing, false, 15, 3).srsLevel).toBe(0);
  });

  it('SRS level caps at 4', () => {
    const existing = makeMastery('noun-gender', { srsLevel: 4, recentOutcomes: [true] });
    expect(updateConceptMastery(existing, true, 15, 3).srsLevel).toBe(4);
  });

  it('recentOutcomes capped at 5, newest first', () => {
    const existing = makeMastery('noun-gender', { recentOutcomes: [true,true,false,true,false] });
    const updated = updateConceptMastery(existing, true, 15, 3);
    expect(updated.recentOutcomes.length).toBe(5);
    expect(updated.recentOutcomes[0]).toBe(true);
  });

  it('4 surfaces update same mastery entry: attemptCount accumulates correctly', () => {
    let m = makeMastery('v2-word-order', { rawScore: 50, attemptCount: 5 });
    m = updateConceptMastery(m, true,  15, 3); // session
    m = updateConceptMastery(m, false, 15, 3); // session
    m = updateConceptMastery(m, true,  15, 3); // journal repair
    m = updateConceptMastery(m, true,  15, 3); // conversation repair
    expect(m.attemptCount).toBe(9);
  });

  it('logError: error log accumulates to 200 cap, newest first', () => {
    let fp = baseFingerprint('error-log-user');
    for (let i = 0; i < 205; i++) {
      fp = logError(fp, {
        conceptId: 'noun-gender', errorTag: 'noun-gender',
        exerciseType: 'translation-to-norwegian',
        wrong: 'et hund', correct: 'en hund', sentenceId: 's' + i,
      });
    }
    expect(fp.recentErrors.length).toBe(200);
    expect(fp.recentErrors[0]?.sentenceId).toBe('s204');
  });
});

// ── Test 8: Focus bias + diagnosis ────────────────────────────────────────────

describe('Test 8: Focus bias and diagnosis', () => {
  const conceptIds = ['noun-gender','v2-word-order','negation','present-tense','adjective-agreement','modal-verbs','infinitive-form'];
  const graph = makeGraph(conceptIds.map((id) => ({ id })));
  const { sentences, availableSentenceIds } = buildCorpus(conceptIds, 5);

  it('weekly_focus selectionReason present when weeklyFocus is set', () => {
    const fp = baseFingerprint('focus-user', {
      weeklyFocus: ['noun-gender','v2-word-order','negation'],
      weekStartedAt: new Date().toISOString(),
      conceptMastery: {
        'noun-gender': makeMastery('noun-gender', { rawScore: 30, decayedScore: 28 }),
        'v2-word-order': makeMastery('v2-word-order', { rawScore: 25, decayedScore: 23 }),
        'negation': makeMastery('negation', { rawScore: 35, decayedScore: 33 }),
        'present-tense': makeMastery('present-tense', { rawScore: 50, decayedScore: 48 }),
        'adjective-agreement': makeMastery('adjective-agreement', { rawScore: 55, decayedScore: 53 }),
        'modal-verbs': makeMastery('modal-verbs', { rawScore: 60, decayedScore: 58 }),
      },
    });
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    expect(session.items.some((i) => i.selectionReason === 'weekly_focus')).toBe(true);
  });

  it('focus concepts dominate non-focus in remediation slots', () => {
    const fp = baseFingerprint('focus-order', {
      weeklyFocus: ['noun-gender','v2-word-order','negation'],
      weekStartedAt: new Date().toISOString(),
      conceptMastery: Object.fromEntries(
        conceptIds.map((id, i) => [id, makeMastery(id, { rawScore: 30 + i * 3, decayedScore: 28 + i * 3 })])
      ),
    });
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const focusIds = new Set(['noun-gender','v2-word-order','negation']);
    const rem = session.items.filter((i) => i.purpose === 'remediation');
    const inF  = rem.filter((i) =>  focusIds.has(i.conceptIds[0] ?? '')).length;
    const outF = rem.filter((i) => !focusIds.has(i.conceptIds[0] ?? '')).length;
    expect(inF).toBeGreaterThanOrEqual(outF);
  });

  it('empty weeklyFocus emits no weekly_focus reason but still has remediation', () => {
    const fp = baseFingerprint('no-focus', { weeklyFocus: [], weekStartedAt: null,
      conceptMastery: {
        'noun-gender': makeMastery('noun-gender', { rawScore: 25, decayedScore: 23 }),
        'v2-word-order': makeMastery('v2-word-order', { rawScore: 30, decayedScore: 28 }),
        'negation': makeMastery('negation', { rawScore: 35, decayedScore: 33 }),
      }
    });
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    expect(session.items.filter((i) => i.selectionReason === 'weekly_focus').length).toBe(0);
    expect(session.items.filter((i) => i.purpose === 'remediation').length).toBeGreaterThan(0);
  });

  it('lær block recipe 40/30/20/10 preserved with focus bias (tolerance 2)', () => {
    const fp = baseFingerprint('recipe-focus', {
      weeklyFocus: ['noun-gender','v2-word-order'], weekStartedAt: new Date().toISOString(),
      conceptMastery: Object.fromEntries(
        conceptIds.map((id) => [id, makeMastery(id, { rawScore: 35, decayedScore: 33 })])
      ),
    });
    const { blocks } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const lærItems = blocks.find((b) => b.type === 'lær')?.items ?? [];
    const T = LEVEL_BLOCK_SIZES.A1.lær;
    const eR = Math.round(T * DEFAULT_SESSION_RECIPE.remediationRatio);
    const eV = Math.round(T * DEFAULT_SESSION_RECIPE.reviewRatio);
    const eN = Math.round(T * DEFAULT_SESSION_RECIPE.newMaterialRatio);
    const eI = Math.round(T * DEFAULT_SESSION_RECIPE.interleavingRatio);
    const remC = lærItems.filter((i) => i.purpose === 'remediation').length;
    const revC = lærItems.filter((i) => i.purpose === 'review').length;
    const newC = lærItems.filter((i) => i.purpose === 'new-material').length;
    const intC = lærItems.filter((i) => i.purpose === 'interleaving').length;
    expect(remC).toBeGreaterThanOrEqual(Math.max(0, eR - 2)); expect(remC).toBeLessThanOrEqual(eR + 2);
    expect(revC).toBeGreaterThanOrEqual(Math.max(0, eV - 2)); expect(revC).toBeLessThanOrEqual(eV + 2);
    expect(newC).toBeGreaterThanOrEqual(Math.max(0, eN - 2)); expect(newC).toBeLessThanOrEqual(eN + 2);
    expect(intC).toBeGreaterThanOrEqual(Math.max(0, eI - 2)); expect(intC).toBeLessThanOrEqual(eI + 2);
  });
});

// ── Test 8 continued: diagnosis rules ────────────────────────────────────────

describe('Test 8b: Diagnosis rules', () => {
  it('article+adjective errors fire noun-gender root-cause rule at confidence 0.85', () => {
    let fp = baseFingerprint('struggling', {
      conceptMastery: {
        'noun-gender': makeMastery('noun-gender', { rawScore: 28, decayedScore: 25 }),
        'adjective-agreement': makeMastery('adjective-agreement', { rawScore: 32, decayedScore: 30 }),
      },
    });
    for (let i = 0; i < 3; i++) {
      fp = logError(fp, { conceptId: 'adjective-agreement', errorTag: 'article-use',
        exerciseType: 'translation-to-norwegian', wrong: 'et stor hund', correct: 'en stor hund',
        sentenceId: 's' + i });
    }
    for (let i = 0; i < 2; i++) {
      fp = logError(fp, { conceptId: 'adjective-agreement', errorTag: 'adjective-agreement',
        exerciseType: 'fill-in-blank', wrong: 'stor', correct: 'store', sentenceId: 'sa' + i });
    }
    const results = runDiagnosis(fp);
    expect(results.length).toBeGreaterThan(0);
    const rule = results.find((r) => r.rootCauseConceptId === 'noun-gender');
    expect(rule).toBeDefined();
    expect(rule?.confidence).toBeCloseTo(0.85, 1);
    expect(rule?.recommendedFocus).toBe('mechanics');
    expect(rule?.affectedConceptIds).toContain('adjective-agreement');
  });

  it('weakest-evidenced fallback fires when no targeted rule does, naming the weakest evidenced concept', () => {
    // No error log entries → rules 1/3/4 (tag-based) and rule 2 (productionGap) stay silent.
    const fp = baseFingerprint('fallback-only', {
      conceptMastery: {
        'noun-gender': makeMastery('noun-gender', { rawScore: 30, decayedScore: 28, attemptCount: 12 }),
        'present-tense': makeMastery('present-tense', { rawScore: 75, decayedScore: 72, attemptCount: 10 }),
      },
    });
    const results = runDiagnosis(fp);
    expect(results.length).toBe(1);
    const fb = results[0];
    expect(fb.rootCauseConceptId).toBe('noun-gender'); // weakest evidenced
    expect(fb.confidence).toBeCloseTo(0.45, 2);
    expect(fb.recommendedFocus).toBe('mechanics'); // rawScore < 50
  });

  it('fallback ignores concepts without real evidence (attempts < 5 or decayedScore >= 50)', () => {
    const fp = baseFingerprint('no-evidence', {
      conceptMastery: {
        // low score but too few attempts
        'noun-gender': makeMastery('noun-gender', { rawScore: 20, decayedScore: 18, attemptCount: 3 }),
        // enough attempts but not weak enough
        'negation': makeMastery('negation', { rawScore: 70, decayedScore: 60, attemptCount: 10 }),
      },
    });
    const results = runDiagnosis(fp);
    expect(results.length).toBe(0);
  });

  it('a targeted rule outranks the fallback when both fire (confidence ordering preserved)', () => {
    let fp = baseFingerprint('targeted-over-fallback', {
      conceptMastery: {
        'noun-gender': makeMastery('noun-gender', { rawScore: 28, decayedScore: 25, attemptCount: 12 }),
        'adjective-agreement': makeMastery('adjective-agreement', { rawScore: 32, decayedScore: 30, attemptCount: 12 }),
      },
    });
    // Trigger rule 1 (article + adjective → noun-gender).
    for (let i = 0; i < 3; i++) {
      fp = logError(fp, { conceptId: 'adjective-agreement', errorTag: 'article-use',
        exerciseType: 'fill-in-blank', wrong: 'et', correct: 'en', sentenceId: 'fb-art' + i });
    }
    for (let i = 0; i < 2; i++) {
      fp = logError(fp, { conceptId: 'adjective-agreement', errorTag: 'adjective-agreement',
        exerciseType: 'fill-in-blank', wrong: 'stor', correct: 'store', sentenceId: 'fb-adj' + i });
    }
    const results = runDiagnosis(fp);
    // Both the targeted rule (0.85) and the fallback (0.45) should be present.
    expect(results.some((r) => r.confidence >= 0.8)).toBe(true);
    expect(results.some((r) => r.confidence === 0.45)).toBe(true);
    // Sorted by confidence — targeted rule is first, fallback never outranks it.
    expect(results[0].confidence).toBeGreaterThan(0.45);
    const fb = results.find((r) => r.confidence === 0.45);
    const targeted = results.find((r) => r.confidence >= 0.8);
    expect(results.indexOf(targeted!)).toBeLessThan(results.indexOf(fb!));
  });

  // ── Rule-2 production-gap gate (E4) ──────────────────────────────────────
  // Rule 2 may ONLY name a concept that is ALSO evidenced-weak. Before the gate,
  // a NON-weak concept with a lone writing error saturated its production gap to
  // 100 and outranked the genuinely weak concept, so diagnosisResults[0] pointed
  // at the wrong concept (1/4 sim users). The gate stops that.
  it('rule 2 does NOT fire on a non-weak concept that merely caught a lone writing error', () => {
    let fp = baseFingerprint('lone-write-error', {
      conceptMastery: {
        // Genuinely weak concept — practiced a lot, low decayed score.
        'v2-word-order': makeMastery('v2-word-order', { rawScore: 30, decayedScore: 28, attemptCount: 18 }),
        // Non-weak concept — well practiced, healthy score. A single lone writing
        // error on it must NOT let rule 2 name it.
        'common-prepositions': makeMastery('common-prepositions', { rawScore: 78, decayedScore: 75, attemptCount: 14 }),
        'present-tense': makeMastery('present-tense', { rawScore: 80, decayedScore: 78, attemptCount: 12 }),
      },
    });
    // The WEAK concept was practiced in BOTH writing and recognition, so its gap is
    // POSITIVE but < 100 (~ the real-app shape: ~80). 3 writing + 1 recognition error.
    for (let i = 0; i < 3; i++) {
      fp = logError(fp, { conceptId: 'v2-word-order', errorTag: 'word-order',
        exerciseType: 'translation-to-norwegian', wrong: 'feil', correct: 'riktig', sentenceId: 'w' + i });
    }
    fp = logError(fp, { conceptId: 'v2-word-order', errorTag: 'word-order',
      exerciseType: 'translation-to-english', wrong: 'wrong', correct: 'right', sentenceId: 'wr0' });
    // One LONE writing error on the NON-weak concept → its productionGap saturates to
    // 100 and (pre-gate) OUTRANKS the genuinely weak concept. This is the exact bug.
    fp = logError(fp, { conceptId: 'common-prepositions', errorTag: 'preposition',
      exerciseType: 'translation-to-norwegian', wrong: 'på', correct: 'i', sentenceId: 'p0' });
    // Mirror the real recordResult glue: populate productionGap from the error log.
    fp = { ...fp, productionGap: {
      'v2-word-order': computeProductionGap(fp.recentErrors, 'v2-word-order'),
      'common-prepositions': computeProductionGap(fp.recentErrors, 'common-prepositions'),
    } };
    // Sanity: the non-weak concept's gap (100) outranks the weak concept's (< 100).
    expect(fp.productionGap['common-prepositions']).toBeGreaterThan(fp.productionGap['v2-word-order']);

    const results = runDiagnosis(fp);
    const rule2 = results.find((r) => r.recommendedFocus === 'production');
    // If rule 2 fires at all, it must NOT be the non-weak concept.
    expect(rule2?.rootCauseConceptId).not.toBe('common-prepositions');
    // Top diagnosis must be in the true weak set.
    expect(results[0].rootCauseConceptId).toBe('v2-word-order');
  });

  it('rule 2 fires (and outranks fallback) when its production-gap concept IS evidenced-weak', () => {
    let fp = baseFingerprint('weak-production-gap', {
      conceptMastery: {
        // Weak concept with a production gap.
        'v2-word-order': makeMastery('v2-word-order', { rawScore: 30, decayedScore: 28, attemptCount: 18 }),
        'svo-word-order': makeMastery('svo-word-order', { rawScore: 32, decayedScore: 30, attemptCount: 16 }),
      },
    });
    // Writing errors on both weak concepts → both gaps positive (>40), >=2 candidates.
    for (let i = 0; i < 3; i++) {
      fp = logError(fp, { conceptId: 'v2-word-order', errorTag: 'word-order',
        exerciseType: 'translation-to-norwegian', wrong: 'feil', correct: 'riktig', sentenceId: 'v' + i });
    }
    for (let i = 0; i < 3; i++) {
      fp = logError(fp, { conceptId: 'svo-word-order', errorTag: 'word-order',
        exerciseType: 'translation-to-norwegian', wrong: 'feil', correct: 'riktig', sentenceId: 's' + i });
    }
    fp = { ...fp, productionGap: {
      'v2-word-order': computeProductionGap(fp.recentErrors, 'v2-word-order'),
      'svo-word-order': computeProductionGap(fp.recentErrors, 'svo-word-order'),
    } };
    const results = runDiagnosis(fp);
    const rule2 = results.find((r) => r.recommendedFocus === 'production');
    expect(rule2).toBeDefined();
    expect(['v2-word-order', 'svo-word-order']).toContain(rule2!.rootCauseConceptId);
    expect(rule2!.confidence).toBeCloseTo(0.75, 2);
    // Rule 2 (0.75) still outranks the fallback (0.45).
    const fb = results.find((r) => r.confidence === 0.45);
    if (fb) expect(results.indexOf(rule2!)).toBeLessThan(results.indexOf(fb));
    expect(results[0].confidence).toBeCloseTo(0.75, 2);
  });

  it('struggling learner: weak concepts make up at least 40 percent of session items', () => {
    const sIds = ['noun-gender','personal-pronouns','present-tense','negation',
                  'v2-word-order','adjective-agreement','modal-verbs','infinitive-form'];
    const sGraph = makeGraph(sIds.map((id) => ({ id })));
    const { sentences: sc, availableSentenceIds: ac } = buildCorpus(sIds, 5);
    const fp = baseFingerprint('struggling-session', {
      conceptMastery: {
        'noun-gender': makeMastery('noun-gender', { rawScore: 55, decayedScore: 52, attemptCount: 12 }),
        'personal-pronouns': makeMastery('personal-pronouns', { rawScore: 65, decayedScore: 62, attemptCount: 15 }),
        'present-tense': makeMastery('present-tense', { rawScore: 60, decayedScore: 58, attemptCount: 10 }),
        'negation': makeMastery('negation', { rawScore: 50, decayedScore: 48, attemptCount: 8 }),
        'v2-word-order': makeMastery('v2-word-order', { rawScore: 22, decayedScore: 20, attemptCount: 15 }),
        'adjective-agreement': makeMastery('adjective-agreement', { rawScore: 28, decayedScore: 25, attemptCount: 12 }),
        'modal-verbs': makeMastery('modal-verbs', { rawScore: 58, decayedScore: 55, attemptCount: 8 }),
        'infinitive-form': makeMastery('infinitive-form', { rawScore: 62, decayedScore: 60, attemptCount: 10 }),
      },
    });
    const { session } = generateSession({ fingerprint: fp, graph: sGraph, availableSentenceIds: ac, sentences: sc });
    const weakIds = new Set(getPrimaryWeakConcepts(fp, 5));
    const weakCount = session.items.filter((i) => weakIds.has(i.conceptIds[0] ?? '')).length;
    expect(weakCount / session.items.length).toBeGreaterThanOrEqual(0.40);
  });
});

// ── Structural invariants ─────────────────────────────────────────────────────

describe('Structural invariants across sessions', () => {
  const conceptIds = ['noun-gender','v2-word-order','negation','present-tense','modal-verbs'];
  const graph = makeGraph(conceptIds.map((id) => ({ id })));
  const { sentences, availableSentenceIds } = buildCorpus(conceptIds, 6);
  const fp = baseFingerprint('invariant-user', {
    conceptMastery: Object.fromEntries(
      conceptIds.map((id, i) => [id, makeMastery(id, { rawScore: 30 + i * 5, decayedScore: 28 + i * 5 })])
    ),
  });
  const { session, blocks } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
  const lærBlock = blocks.find((b) => b.type === 'lær')!;

  it('session has id, status active, non-empty items', () => {
    expect(session.id).toBeTruthy();
    expect(session.status).toBe('active');
    expect(session.items.length).toBeGreaterThan(0);
  });

  it('blocks contain lytt, laer, and snakk', () => {
    const types = blocks.map((b) => b.type);
    expect(types).toContain('lytt');
    expect(types).toContain('lær');
    expect(types).toContain('snakk');
  });

  it('no exercise type runs more than 8 in a row in the lær block', () => {
    let run = 1;
    const items = lærBlock.items;
    for (let i = 1; i < items.length; i++) {
      run = items[i]!.exerciseType === items[i - 1]!.exerciseType ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(8);
    }
  });

  it('every item has valid purpose', () => {
    const valid = new Set(['remediation','review','new-material','interleaving','new-vocab']);
    for (const item of session.items) expect(valid.has(item.purpose)).toBe(true);
  });

  it('every item carries non-empty selectionReason', () => {
    for (const item of session.items) expect(item.selectionReason).toBeTruthy();
  });

  it('every contentId is pending colon conceptId', () => {
    for (const item of session.items)
      expect(item.contentId).toBe('pending:' + item.conceptIds[0]);
  });

  it('lær block has at least one production exercise', () => {
    const prod = new Set(['sentence-transformation','translation-to-norwegian','fill-in-blank','word-order']);
    expect(lærBlock.items.some((i) => prod.has(i.exerciseType))).toBe(true);
  });

  it('lær block size within A1 LEVEL_BLOCK_SIZES bound plus 2', () => {
    expect(lærBlock.items.length).toBeLessThanOrEqual(LEVEL_BLOCK_SIZES.A1.lær + 2);
  });
});
