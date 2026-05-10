import type { MistakeFingerprint } from '@/types/fingerprint';

export interface DiagnosisResult {
  rootCauseConceptId: string;
  confidence: number; // 0–1
  reasoning: string;  // Plain-language explanation of why
  affectedConceptIds: string[];
  recommendedFocus: 'production' | 'recognition' | 'mechanics' | 'application';
}

// Root cause rules — codified versions of what a human tutor would see
const DIAGNOSIS_RULES: Array<{
  name: string;
  detect: (fingerprint: MistakeFingerprint) => DiagnosisResult | null;
}> = [
  {
    name: 'article-and-adjective-point-to-gender',
    detect(fp) {
      const recentErrors = fp.recentErrors.slice(0, 50);
      const articleErrors = recentErrors.filter((e) => e.errorTag === 'article-use').length;
      const adjErrors = recentErrors.filter((e) => e.errorTag === 'adjective-agreement').length;

      if (articleErrors >= 3 && adjErrors >= 2) {
        return {
          rootCauseConceptId: 'noun-gender',
          confidence: 0.85,
          reasoning:
            "Frequent article and adjective agreement errors usually share the same root cause: noun gender is not yet reliable. Drilling articles and adjectives separately won't help until gender is solid.",
          affectedConceptIds: [
            'indefinite-articles',
            'definite-articles-singular',
            'adjective-agreement',
          ],
          recommendedFocus: 'mechanics',
        };
      }
      return null;
    },
  },
  {
    name: 'production-failure-but-recognition-success',
    detect(fp) {
      const productionGaps = Object.entries(fp.productionGap).filter(([, gap]) => gap > 40);
      if (productionGaps.length >= 2) {
        const [conceptId] = productionGaps.sort(([, a], [, b]) => b - a)[0];
        return {
          rootCauseConceptId: conceptId,
          confidence: 0.75,
          reasoning:
            'The learner recognizes correct forms but fails to produce them. This is a production gap, not a knowledge gap — more writing and speaking exercises needed, not more drilling.',
          affectedConceptIds: productionGaps.map(([id]) => id),
          recommendedFocus: 'production',
        };
      }
      return null;
    },
  },
  {
    name: 'listening-failures-point-to-comprehension',
    detect(fp) {
      const recentErrors = fp.recentErrors.slice(0, 50);
      const listeningErrors = recentErrors.filter(
        (e) => e.errorTag === 'listening-recognition'
      ).length;
      const total = recentErrors.length;

      if (total > 10 && listeningErrors / total > 0.35) {
        return {
          rootCauseConceptId: 'listening-comprehension',
          confidence: 0.8,
          reasoning:
            'A high proportion of errors occur in listening exercises. The learner may know the grammar and vocabulary but cannot process spoken Norwegian at normal speed. Slow audio and more listening exposure needed.',
          affectedConceptIds: [],
          recommendedFocus: 'recognition',
        };
      }
      return null;
    },
  },
  {
    name: 'word-order-errors-in-context-not-drills',
    detect(fp) {
      const recentErrors = fp.recentErrors.slice(0, 50);
      const wordOrderInContext = recentErrors.filter(
        (e) =>
          e.errorTag === 'word-order' &&
          ['reading-comprehension', 'free-writing', 'translation-to-norwegian'].includes(
            e.exerciseType
          )
      ).length;
      const wordOrderInDrills = recentErrors.filter(
        (e) => e.errorTag === 'word-order' && e.exerciseType === 'fill-in-blank'
      ).length;

      if (wordOrderInContext >= 3 && wordOrderInDrills === 0) {
        return {
          rootCauseConceptId: 'v2-word-order',
          confidence: 0.7,
          reasoning:
            'Word order errors appear in natural context but not in isolated drills. The learner knows the V2 rule in isolation but cannot apply it automatically yet. Contextual practice needed.',
          affectedConceptIds: ['v2-word-order', 'svo-word-order'],
          recommendedFocus: 'application',
        };
      }
      return null;
    },
  },
];

export function runDiagnosis(fingerprint: MistakeFingerprint): DiagnosisResult[] {
  const results: DiagnosisResult[] = [];

  for (const rule of DIAGNOSIS_RULES) {
    const result = rule.detect(fingerprint);
    if (result) results.push(result);
  }

  // Sort by confidence
  return results.sort((a, b) => b.confidence - a.confidence);
}

export function getPrimaryWeakConcepts(
  fingerprint: MistakeFingerprint,
  limit = 3
): string[] {
  return Object.entries(fingerprint.conceptMastery)
    .filter(([, m]) => m.attemptCount > 0)
    .sort(([, a], [, b]) => a.decayedScore - b.decayedScore)
    .slice(0, limit)
    .map(([id]) => id);
}

export function getDecayingConcepts(
  fingerprint: MistakeFingerprint,
  threshold = 70
): string[] {
  return Object.entries(fingerprint.conceptMastery)
    .filter(([, m]) => m.rawScore >= threshold && m.decayedScore < threshold)
    .map(([id]) => id);
}
