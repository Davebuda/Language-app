import type { MistakeFingerprint } from '@/types/fingerprint';
import { getCumulativeConcepts } from '@/lib/concept-graph-loader';

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
      // GATE (E4): a production gap is only diagnostic when the concept is ALSO
      // evidenced-weak. Without this gate, a NON-weak concept that caught a single
      // lone writing error saturates computeProductionGap to 100 and outranks the
      // genuinely weak concept (which scores lower because it was practiced in both
      // writing and recognition). That made diagnosisResults[0] name the wrong
      // concept. We gate the rule, not the signal: rule 2 may only fire on a concept
      // that is among the learner's primary weak concepts (low decayedScore with
      // enough attempts to trust the score). A lone writing error on a healthy
      // concept can no longer hijack the top diagnosis.
      const evidencedWeak = new Set(
        getPrimaryWeakConcepts(fp, 5).filter((id) => {
          const m = fp.conceptMastery[id];
          return m != null && m.attemptCount >= 5 && m.decayedScore < 50;
        }),
      );
      const productionGaps = Object.entries(fp.productionGap).filter(
        ([id, gap]) => gap > 40 && evidencedWeak.has(id),
      );
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
  {
    // LOWEST-priority fallback. Targeted rules (1–4) reason about specific
    // cross-concept error signatures; they often stay silent. When they do, this
    // rule names the learner's weakest *evidenced* concept so the diagnosis card
    // and repair targeting still point somewhere honest. It deliberately makes no
    // root-cause claim (Operating Rule 6) — it reports the weakest surface, not a
    // fabricated cause. Confidence 0.45 sits below every targeted rule so it never
    // outranks a real signal in `runDiagnosis`'s confidence sort.
    name: 'weakest-evidenced-concept-fallback',
    detect(fp) {
      // Fix 2: filter FIRST (evidence gate), then sort by decayedScore, then pick
      // weakest. The old approach sliced to top-3 by decayed score first, so a
      // genuinely evidenced-weak concept at rank 4 was silently missed.
      const evidenced = Object.values(fp.conceptMastery)
        .filter((m) => m.attemptCount >= 5 && m.decayedScore < 50)
        .sort((a, b) => a.decayedScore - b.decayedScore);
      const weakest = evidenced[0];
      if (!weakest) return null;

      // Fix 1: resolve the concept's human-readable label instead of exposing the
      // raw slug (e.g. "noun-gender") verbatim on the Norwegian dashboard.
      const label =
        getCumulativeConcepts(fp.currentLevel).find((c) => c.id === weakest.conceptId)?.label ??
        weakest.conceptId.replace(/-/g, ' ');

      // Data-derived focus (not hardcoded): a low rawScore means the form itself
      // is still shaky (mechanics); a decayed-but-once-higher score means it was
      // learned and is fading (recognition/review).
      const recommendedFocus: DiagnosisResult['recommendedFocus'] =
        weakest.rawScore < 50 ? 'mechanics' : 'recognition';

      return {
        rootCauseConceptId: weakest.conceptId,
        confidence: 0.45,
        reasoning: `Din svakeste flate nå er ${label} — vi fokuserer øvingen der.`,
        affectedConceptIds: evidenced.slice(0, 3).map((m) => m.conceptId),
        recommendedFocus,
      };
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

export function getReviewDueConcepts(fingerprint: MistakeFingerprint): string[] {
  const now = new Date().toISOString();
  return Object.entries(fingerprint.conceptMastery)
    .filter(([, m]) => m.nextReviewAt != null && m.nextReviewAt <= now)
    .map(([id]) => id);
}
