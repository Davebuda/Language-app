/**
 * Shared helpers for the fingerprint-first audit harness.
 * Builds realistic fingerprints, concept graphs, and sentence pools
 * from actual content files so tests prove real behavior, not mocks.
 */
import { createEmptyFingerprint } from '@/types/fingerprint';
import type { MistakeFingerprint, ConceptMastery, CEFRLevel } from '@/types/fingerprint';
import type { ConceptGraph } from '@/types/concepts';
import type { Sentence } from '@/types/content';
import type { ExerciseType } from '@/types/session';

import a1GraphJson from '@content/concepts/a1-graph.json';
import a2GraphJson from '@content/concepts/a2-graph.json';
import b1GraphJson from '@content/concepts/b1-graph.json';

const a1Graph = a1GraphJson as ConceptGraph;
const a2Graph = a2GraphJson as ConceptGraph;
const b1Graph = b1GraphJson as ConceptGraph;

export { a1Graph, a2Graph, b1Graph };

export const AUDIT_USER_ID = 'audit-harness-user';

export function graphForLevel(level: CEFRLevel): ConceptGraph {
  switch (level) {
    case 'B1': return b1Graph;
    case 'A2': return a2Graph;
    case 'B2': return b1Graph; // B2 has no graph — this is an audit signal
    default: return a1Graph;
  }
}

export function makeMastery(conceptId: string, overrides: Partial<ConceptMastery> = {}): ConceptMastery {
  return {
    conceptId,
    rawScore: 50,
    confidenceScore: 0.5,
    decayedScore: 45,
    attemptCount: 10,
    correctCount: 5,
    uniqueDaysActive: 2,
    lastAttemptAt: new Date().toISOString(),
    lastCorrectAt: new Date().toISOString(),
    streak: 1,
    recentOutcomes: [true, false, true, false, true],
    srsLevel: 0,
    nextReviewAt: null,
    ...overrides,
  };
}

export function makeWeakMastery(conceptId: string): ConceptMastery {
  return makeMastery(conceptId, {
    rawScore: 30,
    decayedScore: 25,
    confidenceScore: 0.3,
    attemptCount: 8,
    correctCount: 2,
  });
}

export function makeStrongMastery(conceptId: string): ConceptMastery {
  return makeMastery(conceptId, {
    rawScore: 90,
    decayedScore: 88,
    confidenceScore: 0.9,
    attemptCount: 25,
    correctCount: 22,
    uniqueDaysActive: 5,
    streak: 8,
    recentOutcomes: [true, true, true, true, true],
  });
}

export function makeReviewDueMastery(conceptId: string): ConceptMastery {
  return makeMastery(conceptId, {
    rawScore: 75,
    decayedScore: 65,
    nextReviewAt: new Date(Date.now() - 86400000).toISOString(),
    srsLevel: 2,
  });
}

export function makeSentence(id: string, conceptId: string, types: ExerciseType[] = ['translation-to-norwegian', 'fill-in-blank', 'word-order', 'translation-to-english']): Sentence {
  return {
    id,
    norwegian: `Norsk ${id}`,
    english: `English ${id}`,
    conceptIds: [conceptId],
    vocabularyClusters: [],
    errorTagsDetectable: [],
    cefrLevel: 'A1',
    difficulty: 1,
    exerciseTypes: types,
  };
}

export function buildSentencePool(graph: ConceptGraph, perConcept = 5): {
  sentences: Record<string, Sentence>;
  availableSentenceIds: Record<string, string[]>;
} {
  const sentences: Record<string, Sentence> = {};
  const availableSentenceIds: Record<string, string[]> = {};
  for (const concept of graph.concepts) {
    availableSentenceIds[concept.id] = [];
    for (let i = 0; i < perConcept; i++) {
      const sid = `${concept.id}-s${i}`;
      sentences[sid] = makeSentence(sid, concept.id);
      availableSentenceIds[concept.id].push(sid);
    }
  }
  return { sentences, availableSentenceIds };
}

export function buildFingerprintForLevel(level: CEFRLevel, graph: ConceptGraph): MistakeFingerprint {
  const fp = createEmptyFingerprint(AUDIT_USER_ID);
  fp.currentLevel = level;
  const conceptMastery: Record<string, ConceptMastery> = {};
  for (const concept of graph.concepts) {
    if (concept.prerequisites.length === 0) {
      conceptMastery[concept.id] = makeMastery(concept.id);
    }
  }
  return { ...fp, conceptMastery };
}

export type FailureCategory = 'broken' | 'fake' | 'disconnected' | 'random' | 'duplicated';

export interface AuditFinding {
  id: string;
  category: FailureCategory;
  severity: 'critical' | 'major' | 'minor';
  component: string;
  description: string;
  evidence: string;
  fix: string;
}

export interface AuditReport {
  timestamp: string;
  verdict: 'PASS' | 'PARTIAL' | 'FAIL';
  fingerprintChainIntact: boolean;
  dailyOppgaverLevelAware: boolean;
  passedItemsSuppressed: boolean;
  weeklyProgressReal: boolean;
  findings: AuditFinding[];
  testResults: {
    suite: string;
    passed: number;
    failed: number;
    tests: { name: string; status: 'pass' | 'fail'; evidence?: string }[];
  }[];
}
