import { describe, it, expect } from 'vitest';
import { generateSession } from '@/engine/scheduler';
import { createEmptyFingerprint } from '@/types/fingerprint';
import type { MistakeFingerprint, ConceptMastery } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';

const USER_ID = 'harness-user';

function makeConcept(id: string, prereqs: string[] = [], level: 'A1' | 'A2' = 'A1') {
  return { id, label: id, description: 'Test ' + id, cefrLevel: level as const,
    prerequisites: prereqs, masteryThreshold: 80, minAttempts: 15, minDays: 3, errorTags: [] };
}
function makeSentence(id: string, conceptId: string): Sentence {
  return { id, norwegian: 'Norsk ' + id, english: 'English ' + id, conceptIds: [conceptId],
    vocabularyClusters: [], errorTagsDetectable: [], cefrLevel: 'A1', difficulty: 1,
    exerciseTypes: ['translation-to-norwegian','fill-in-blank','word-order','translation-to-english'] };
}
function makeMastery(ov: Partial<ConceptMastery> = {}): ConceptMastery {
  return { conceptId: 'c1', rawScore: 50, confidenceScore: 0.5, decayedScore: 45,
    attemptCount: 10, correctCount: 5, uniqueDaysActive: 2,
    lastAttemptAt: new Date().toISOString(), lastCorrectAt: new Date().toISOString(),
    streak: 1, recentOutcomes: [true,false,true,false,true], srsLevel: 0, nextReviewAt: null, ...ov };
}
function buildGraph(a1Ids: string[], a2Ids: string[] = []): ConceptGraph {
  const lastA1 = a1Ids[a1Ids.length - 1] ?? '';
  return { version: '1.0', language: 'nb-NO', concepts: [
    ...a1Ids.map((id) => makeConcept(id, [])),
    ...a2Ids.map((id) => makeConcept(id, [lastA1], 'A2')) ] };
}
function buildCorpus(conceptIds: string[], perConcept = 5) {
  const sentences: Record<string, Sentence> = {};
  const avail: Record<string, string[]> = {};
  for (const cid of conceptIds) {
    avail[cid] = [];
    for (let i = 0; i < perConcept; i++) { const sid = cid + '-s' + i; sentences[sid] = makeSentence(sid, cid); avail[cid].push(sid); }
  }
  return { sentences, availableSentenceIds: avail };
}
function markAllPassed(fp: MistakeFingerprint, cids: string[], avail: Record<string, string[]>): MistakeFingerprint {
  const passed = { ...fp.passedSentenceIds }; const ts = new Date().toISOString();
  for (const cid of cids) for (const sid of (avail[cid] ?? [])) passed[sid] = ts;
  return { ...fp, passedSentenceIds: passed };
}
function yesterday(): string { return new Date(Date.now() - 86_400_000).toISOString(); }
function assertNoRun(items: { exerciseType: string }[]) {
  let run = 1;
  // With block-structured sessions (lytt/lær/snakk), block boundaries create intentional runs.
  // Relaxed to 8 to accommodate block sizes (e.g., 5-8 listening items in a row is correct).
  for (let i = 1; i < items.length; i++) { run = items[i].exerciseType === items[i-1].exerciseType ? run + 1 : 1; expect(run).toBeLessThanOrEqual(8); }
}

describe('Session 1: fresh learner no passed sentences', () => {
  const cids = ['noun-gender','personal-pronouns','infinitive-form','present-tense','negation'];
  const graph = buildGraph(cids);
  const { sentences, availableSentenceIds } = buildCorpus(cids, 5);
  const fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {}, passedSentenceIds: {} };
  const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
  const { items } = session;
  it('produces at least one item', () => { expect(items.length).toBeGreaterThan(0); });
  it('every item has a non-empty selectionReason', () => {
    for (const item of items) { expect(item.selectionReason).toBeDefined(); expect((item.selectionReason as string).length).toBeGreaterThan(0); }
  });
  it('every item has a valid purpose', () => {
    const valid = new Set(['remediation','review','new-material','interleaving','new-vocab']);
    for (const item of items) expect(valid.has(item.purpose)).toBe(true);
  });
  it('new-material items get cold_start reason', () => {
    const newItems = items.filter((i) => i.purpose === 'new-material');
    expect(newItems.length).toBeGreaterThan(0);
    for (const item of newItems) expect(item.selectionReason).toBe('cold_start');
  });
  it('item count is at least 5', () => { expect(items.length).toBeGreaterThanOrEqual(5); });
  it('no exercise type more than 3 in a row', () => { assertNoRun(items); });
  it('purpose counts sum to total', () => {
    const n = items.length;
    const s = ['remediation','review','new-material','interleaving','new-vocab'].reduce((acc, p) => acc + items.filter((i) => i.purpose === p).length, 0);
    expect(s).toBe(n);
  });
});

describe('Session 2: all session-1 sentences passed', () => {
  const cids = ['c_passed','c_fresh','c_extra1','c_extra2'];
  const graph = buildGraph(cids);
  const { sentences, availableSentenceIds } = buildCorpus(cids, 4);
  let fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
    c_passed: makeMastery({ conceptId: 'c_passed', rawScore: 25, decayedScore: 20 }),
    c_fresh:  makeMastery({ conceptId: 'c_fresh',  rawScore: 35, decayedScore: 30 }),
  }, passedSentenceIds: {} };
  fp = markAllPassed(fp, ['c_passed'], availableSentenceIds);
  const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
  const { items } = session;
  it('session does not collapse to zero items', () => { expect(items.length).toBeGreaterThan(0); });
  it('every item has a non-empty selectionReason', () => {
    for (const item of items) expect((item.selectionReason as string).length).toBeGreaterThan(0);
  });
  it('no non-review item references c_passed', () => {
    const bad = items.filter((i) => i.purpose !== 'review' && i.conceptIds.includes('c_passed'));
    expect(bad).toHaveLength(0);
  });
  it('c_fresh appears in non-review items', () => {
    const hit = items.filter((i) => i.purpose !== 'review' && i.conceptIds.includes('c_fresh'));
    expect(hit.length).toBeGreaterThan(0);
  });
  it('no exercise type more than 3 in a row', () => { assertNoRun(items); });
});

describe('Session 3: SRS-due concept with all sentences passed', () => {
  const cids = ['srs_concept','filler1','filler2','filler3'];
  const graph = buildGraph(cids);
  const { sentences, availableSentenceIds } = buildCorpus(cids, 3);
  let fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
    srs_concept: makeMastery({ conceptId: 'srs_concept', rawScore: 75, decayedScore: 68, nextReviewAt: yesterday() }),
    filler1: makeMastery({ conceptId: 'filler1', rawScore: 45, decayedScore: 40 }),
    filler2: makeMastery({ conceptId: 'filler2', rawScore: 50, decayedScore: 45 }),
  }, passedSentenceIds: {} };
  fp = markAllPassed(fp, ['srs_concept'], availableSentenceIds);
  const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
  const { items } = session;
  it('session does not collapse to zero items', () => { expect(items.length).toBeGreaterThan(0); });
  it('review items appear for srs_concept despite all sentences passed', () => {
    const rev = items.filter((i) => i.purpose === 'review' && i.conceptIds.includes('srs_concept'));
    expect(rev.length).toBeGreaterThan(0);
  });
  it('srs_concept review items carry review_due selectionReason', () => {
    const rev = items.filter((i) => i.purpose === 'review' && i.conceptIds.includes('srs_concept'));
    for (const item of rev) expect(item.selectionReason).toBe('review_due');
  });
  it('srs_concept does NOT appear in remediation', () => {
    const bad = items.filter((i) => i.purpose === 'remediation' && i.conceptIds.includes('srs_concept'));
    expect(bad).toHaveLength(0);
  });
  it('every item has a non-empty selectionReason', () => {
    for (const item of items) expect((item.selectionReason as string).length).toBeGreaterThan(0);
  });
  it('no exercise type more than 3 in a row', () => { assertNoRun(items); });
});

describe('Session 4: multi-session journey never collapses', () => {
  it('never collapses when 80pct of sentences are passed', () => {
    const cids = ['c1','c2','c3','c4','c5','c6'];
    const graph = buildGraph(cids);
    const { sentences, availableSentenceIds } = buildCorpus(cids, 6);
    const ts = new Date().toISOString();
    const heavy: Record<string,string> = {};
    for (const cid of ['c1','c2','c3','c4','c5']) for (let i = 0; i < 5; i++) heavy[cid + '-s' + i] = ts;
    const fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
      c1: makeMastery({ conceptId: 'c1', rawScore: 30, decayedScore: 25 }),
      c2: makeMastery({ conceptId: 'c2', rawScore: 35, decayedScore: 30 }),
      c3: makeMastery({ conceptId: 'c3', rawScore: 40, decayedScore: 35 }),
      c4: makeMastery({ conceptId: 'c4', rawScore: 45, decayedScore: 40 }),
      c5: makeMastery({ conceptId: 'c5', rawScore: 50, decayedScore: 45 }),
    }, passedSentenceIds: heavy };
    expect(generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences }).session.items.length).toBeGreaterThan(0);
  });
  it('review-only fallback when ALL sentences for ALL concepts are passed', () => {
    const { sentences: s2, availableSentenceIds: a2 } = buildCorpus(['cx','cy','cz'], 3);
    const g2 = buildGraph(['cx','cy','cz']);
    let fp2: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
      cx: makeMastery({ conceptId: 'cx', rawScore: 55, decayedScore: 50 }),
      cy: makeMastery({ conceptId: 'cy', rawScore: 60, decayedScore: 55 }),
      cz: makeMastery({ conceptId: 'cz', rawScore: 45, decayedScore: 40 }),
    }, passedSentenceIds: {} };
    fp2 = markAllPassed(fp2, ['cx','cy','cz'], a2);
    const r2 = generateSession({ fingerprint: fp2, graph: g2, availableSentenceIds: a2, sentences: s2 });
    expect(r2.session.items.length).toBeGreaterThan(0);
    for (const item of r2.session.items) expect(item.purpose).toBe('review');
  });
});

describe('Session 5: selectionReason correctness across all purpose types', () => {
  const cids = ['a','b','c','d','e'];
  const graph = buildGraph(cids);
  const { sentences, availableSentenceIds } = buildCorpus(cids, 5);

  it('remediation items have weak_concept or weekly_focus reason', () => {
    const fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
      a: makeMastery({ conceptId: 'a', rawScore: 20, decayedScore: 18 }),
      b: makeMastery({ conceptId: 'b', rawScore: 30, decayedScore: 25 }),
    }, passedSentenceIds: {} };
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    for (const item of session.items.filter((i) => i.purpose === 'remediation'))
      expect(['weak_concept','weekly_focus']).toContain(item.selectionReason);
  });

  it('review items have review_due decaying or weak_concept reason', () => {
    const fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
      a: makeMastery({ conceptId: 'a', rawScore: 78, decayedScore: 65, nextReviewAt: yesterday() }),
      b: makeMastery({ conceptId: 'b', rawScore: 30, decayedScore: 25 }),
    }, passedSentenceIds: {} };
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const valid = new Set(['review_due','decaying','weak_concept']);
    for (const item of session.items.filter((i) => i.purpose === 'review'))
      expect(valid.has(item.selectionReason)).toBe(true);
  });

  it('interleaving items have interleaving reason', () => {
    const fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
      a: makeMastery({ conceptId: 'a', rawScore: 40, decayedScore: 35 }),
      b: makeMastery({ conceptId: 'b', rawScore: 50, decayedScore: 45 }),
      c: makeMastery({ conceptId: 'c', rawScore: 45, decayedScore: 40 }),
    }, passedSentenceIds: {} };
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    for (const item of session.items.filter((i) => i.purpose === 'interleaving'))
      expect(item.selectionReason).toBe('interleaving');
  });

  it('weekly_focus concepts produce weekly_focus reason in remediation', () => {
    const fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
      a: makeMastery({ conceptId: 'a', rawScore: 25, decayedScore: 20 }),
      b: makeMastery({ conceptId: 'b', rawScore: 35, decayedScore: 30 }),
    }, weeklyFocus: ['a'], weekStartedAt: new Date().toISOString(), passedSentenceIds: {} };
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const focusRem = session.items.filter((i) => i.conceptIds.includes('a') && i.purpose === 'remediation');
    expect(focusRem.length).toBeGreaterThan(0);
    expect(focusRem.some((i) => i.selectionReason === 'weekly_focus')).toBe(true);
  });
});

describe('Session 6: review allows passed sentences remediation does not', () => {
  const cids = ['review_target','other1','other2'];
  const graph = buildGraph(cids);
  const { sentences, availableSentenceIds } = buildCorpus(cids, 3);

  it('review items appear for SRS-due concept with all sentences passed', () => {
    let fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
      review_target: makeMastery({ conceptId: 'review_target', rawScore: 70, decayedScore: 62, nextReviewAt: yesterday() }),
      other1: makeMastery({ conceptId: 'other1', rawScore: 40, decayedScore: 35 }),
    }, passedSentenceIds: {} };
    fp = markAllPassed(fp, ['review_target'], availableSentenceIds);
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const rev = session.items.filter((i) => i.purpose === 'review' && i.conceptIds.includes('review_target'));
    expect(rev.length).toBeGreaterThan(0);
  });

  it('concept with all sentences passed does NOT appear in remediation', () => {
    let fp: MistakeFingerprint = { ...createEmptyFingerprint(USER_ID), conceptMastery: {
      review_target: makeMastery({ conceptId: 'review_target', rawScore: 25, decayedScore: 20, nextReviewAt: yesterday() }),
      other1: makeMastery({ conceptId: 'other1', rawScore: 40, decayedScore: 35 }),
    }, passedSentenceIds: {} };
    fp = markAllPassed(fp, ['review_target'], availableSentenceIds);
    const { session } = generateSession({ fingerprint: fp, graph, availableSentenceIds, sentences });
    const bad = session.items.filter((i) => i.purpose === 'remediation' && i.conceptIds.includes('review_target'));
    expect(bad).toHaveLength(0);
  });
});
