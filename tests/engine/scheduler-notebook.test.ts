import { describe, it, expect } from 'vitest';
import { generateSession } from '@/engine/scheduler';
import type { SchedulerInput } from '@/engine/scheduler';
import type { MistakeFingerprint } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';
import type { NotebookItem } from '@/types/notebook';

// ── Minimal fixture builders (mirrors scheduler.test.ts) ──────────────────────

function makeFingerprint(overrides: Partial<MistakeFingerprint> = {}): MistakeFingerprint {
  return {
    userId: 'test-user',
    currentLevel: 'A1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    diagnosticCompleted: true,
    sessionsCompleted: 1,
    conceptMastery: {},
    recentErrors: [],
    errorPatterns: {},
    productionGap: {},
    speakingMinutes: 0,
    inputProductionPreference: 'balanced',
    weeklyFocus: [],
    weekStartedAt: null,
    weeklySprintHistory: [],
    ...overrides,
  };
}

function makeGraph(conceptIds: string[]): ConceptGraph {
  return {
    concepts: conceptIds.map((id) => ({
      id,
      label: id,
      cefrLevel: 'A1',
      prerequisites: [],
      masteryThreshold: 70,
      minAttempts: 3,
      minDays: 1,
      primaryErrorTag: 'noun-gender' as const,
    })),
    edges: [],
  };
}

function makeSentence(id: string, conceptIds: string[], exerciseTypes: string[]): Sentence {
  return {
    id,
    norwegian: `Norsk setning ${id}.`,
    english: `English sentence ${id}.`,
    conceptIds,
    vocabularyClusters: [],
    errorTagsDetectable: ['noun-gender'],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: exerciseTypes as Sentence['exerciseTypes'],
  };
}

function makeNotebookItem(overrides: Partial<NotebookItem> & { id: string }): NotebookItem {
  const now = new Date().toISOString();
  return {
    userId: 'test-user',
    type: 'phrase',
    norwegian: 'Jeg vil ha kaffe',
    english: 'I want coffee',
    source: 'manual',
    tags: [],
    reviewStatus: 'new',
    verified: false,
    promoted: true,
    srsLevel: 0,
    nextReviewAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function baseInput(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  const conceptIds = ['noun-gender', 'v2-word-order', 'personal-pronouns'];
  const s1 = makeSentence('s1', ['noun-gender'], ['translation-to-norwegian', 'fill-in-blank']);
  const s2 = makeSentence('s2', ['v2-word-order'], ['translation-to-norwegian', 'word-order']);
  const s3 = makeSentence('s3', ['personal-pronouns'], ['translation-to-norwegian', 'translation-to-english']);
  return {
    fingerprint: makeFingerprint({
      conceptMastery: Object.fromEntries(
        conceptIds.map((id) => [id, {
          conceptId: id, rawScore: 40, confidenceScore: 0.4, decayedScore: 40,
          attemptCount: 2, uniqueDaysActive: 1, streak: 0, recentOutcomes: [false],
          nextReviewAt: null, srsLevel: 0, lastAttemptAt: new Date().toISOString(),
        }])
      ),
    }),
    graph: makeGraph(conceptIds),
    sentences: { s1, s2, s3 },
    availableSentenceIds: {
      'noun-gender': ['s1'],
      'v2-word-order': ['s2'],
      'personal-pronouns': ['s3'],
    },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateSession — notebook practice injection (T3.12)', () => {
  it('injects at most 2 notebook items as translation-to-norwegian new-material', () => {
    const notebookItems: NotebookItem[] = [
      makeNotebookItem({ id: 'nb1', norwegian: 'Jeg er sulten', english: 'I am hungry' }),
      makeNotebookItem({ id: 'nb2', norwegian: 'Hvor er toalettet', english: 'Where is the toilet' }),
      makeNotebookItem({ id: 'nb3', norwegian: 'Takk for maten', english: 'Thanks for the food' }),
    ];
    const { session } = generateSession(baseInput({ notebookItems }));

    const nbInjected = session.items.filter((i) => i.selectionReason === 'notebook_practice');
    expect(nbInjected.length).toBeLessThanOrEqual(2);
    expect(nbInjected.length).toBe(2);

    for (const item of nbInjected) {
      expect(item.exerciseType).toBe('translation-to-norwegian');
      expect(item.contentId.startsWith('notebook:')).toBe(true);
      expect(item.purpose).toBe('new-material');
      expect(item.isRepairItem).toBe(false);
    }
  });

  it('excludes a notebook item that lacks english (no prompt to grade against)', () => {
    const notebookItems: NotebookItem[] = [
      makeNotebookItem({ id: 'nb-no-eng', norwegian: 'Et eller annet', english: undefined }),
      makeNotebookItem({ id: 'nb-has-eng', norwegian: 'God morgen', english: 'Good morning' }),
    ];
    const { session } = generateSession(baseInput({ notebookItems }));

    const nbInjected = session.items.filter((i) => i.selectionReason === 'notebook_practice');
    const contentIds = nbInjected.map((i) => i.contentId);
    expect(contentIds).toContain('notebook:nb-has-eng');
    expect(contentIds).not.toContain('notebook:nb-no-eng');
  });

  it('never places notebook items in the review block', () => {
    const notebookItems: NotebookItem[] = [
      makeNotebookItem({ id: 'nb1', norwegian: 'Jeg er sulten', english: 'I am hungry' }),
    ];
    const { blocks } = generateSession(baseInput({ notebookItems }));

    // notebook items live in the lær block only; assert none carry a review purpose
    const notebookInReview = blocks
      .flatMap((b) => b.items)
      .some((i) => i.selectionReason === 'notebook_practice' && i.purpose === 'review');
    expect(notebookInReview).toBe(false);

    const lærBlock = blocks.find((b) => b.type === 'lær');
    const allNotebook = blocks.flatMap((b) => b.items).filter((i) => i.selectionReason === 'notebook_practice');
    expect(allNotebook.length).toBeGreaterThan(0);
    for (const item of allNotebook) {
      expect(lærBlock?.items).toContain(item);
    }
  });

  it('leaves existing generation unchanged when notebookItems is omitted', () => {
    const { session: withOut } = generateSession(baseInput());
    const { session: withEmpty } = generateSession(baseInput({ notebookItems: [] }));

    expect(withOut.items.some((i) => i.selectionReason === 'notebook_practice')).toBe(false);
    expect(withEmpty.items.some((i) => i.selectionReason === 'notebook_practice')).toBe(false);
  });
});
