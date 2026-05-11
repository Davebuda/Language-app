'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useFingerprintStore } from '@/stores/fingerprint-store';
import { useFingerprint } from '@/hooks/useFingerprint';
import { generateSession, buildRepairPlan, makeRepairItems } from '@/engine';
import { aiService } from '@/ai';
import type { ExerciseResult, SessionItem } from '@/types/session';
import type { Sentence, ResolvedContent } from '@/types/content';
import type { GenerateParams } from '@/ai/types';
import type { ConceptGraph } from '@/types/concepts';
import conceptGraphJson from '@content/concepts/a1-graph.json';

const conceptGraph = conceptGraphJson as ConceptGraph;

const SCENARIOS = [
  'daily-routine', 'food', 'transport', 'family',
  'shopping', 'work', 'weather', 'health',
];

// Build AI generation params from a session item + current fingerprint state
function buildGenerateParams(
  item: SessionItem,
  fingerprint: ReturnType<typeof useFingerprintStore.getState>['fingerprint'],
  scenario: string,
): GenerateParams {
  const conceptId = item.conceptIds[0] ?? '';
  const mastery = fingerprint?.conceptMastery[conceptId];
  const recentErrors = (fingerprint?.recentErrors ?? [])
    .filter((e) => e.conceptId === conceptId)
    .slice(0, 5)
    .map((e) => e.errorTag);

  return {
    conceptId,
    exerciseType: item.exerciseType,
    level: fingerprint?.currentLevel ?? 'A1',
    purpose: item.purpose,
    recentErrors,
    masteryScore: mastery?.rawScore,
    productionGap: fingerprint?.productionGap[conceptId] ?? 0,
    scenario,
  };
}

export function useSession(
  sentences: Record<string, Sentence> = {},
  availableSentenceIdsProp: Record<string, string[]> = {},
) {
  const sessionStore = useSessionStore();
  const { recordResult: recordFingerprintResult } = useFingerprint();

  // itemId → resolved content (AI-generated or seed fallback)
  const contentCache = useRef<Map<string, ResolvedContent>>(new Map());
  // conceptId → sentences that support various exercise types
  const seedsByConceptId = useRef<Map<string, Sentence[]>>(new Map());
  const lastErrorRef = useRef<Parameters<typeof buildRepairPlan>[0] | null>(null);
  // Per-instance scenario cursor — not module-level to avoid HMR drift
  const scenarioCursorRef = useRef(0);

  // Toggle flips to force re-renders when new content resolves
  const [, forceUpdate] = useState(0);

  const { session, currentItemIndex, isInRepair, repairPlan } = sessionStore;
  const currentItem = session?.items[currentItemIndex] ?? null;
  const currentContent = currentItem ? contentCache.current.get(currentItem.id) : undefined;

  // Re-index sentences by concept whenever the map changes
  useEffect(() => {
    const idx = new Map<string, Sentence[]>();
    for (const s of Object.values(sentences)) {
      for (const cid of s.conceptIds) {
        const arr = idx.get(cid) ?? [];
        arr.push(s);
        idx.set(cid, arr);
      }
    }
    seedsByConceptId.current = idx;
  }, [sentences]);

  // Resolve content for one item: try AI, fall back to seed
  const resolveItem = useCallback(async (item: SessionItem): Promise<void> => {
    if (contentCache.current.has(item.id)) return;

    try {
      const { fingerprint } = useFingerprintStore.getState();
      const scenario = SCENARIOS[scenarioCursorRef.current++ % SCENARIOS.length] ?? 'daily-routine';
      const params = buildGenerateParams(item, fingerprint, scenario);

      // Try AI generation first
      const generated = await aiService.generateContent(params);
      if (generated) {
        contentCache.current.set(item.id, generated);
        forceUpdate((n) => n + 1);
        return;
      }
    } catch {
      // AI unavailable — fall through to seed
    }

    // Seed fallback: prefer sentences that support the requested exercise type
    const conceptId = item.conceptIds[0] ?? '';
    const seeds = seedsByConceptId.current.get(conceptId) ?? [];
    const compatible = seeds.filter((s) => s.exerciseTypes.includes(item.exerciseType));
    const pool = compatible.length > 0 ? compatible : seeds;

    const picked = pool[Math.floor(Math.random() * pool.length)];
    if (picked) {
      contentCache.current.set(item.id, { ...picked, source: 'seed' });
      forceUpdate((n) => n + 1);
    }
  }, []);

  // Pre-fetch: resolve current item + the next 2 ahead
  const prefetch = useCallback(
    (items: SessionItem[], fromIndex: number) => {
      const batch = items.slice(fromIndex, fromIndex + 3);
      batch.forEach((item) => { resolveItem(item); });
    },
    [resolveItem],
  );

  const startNewSession = useCallback(async () => {
    const { fingerprint } = useFingerprintStore.getState();
    if (!fingerprint) return;

    const output = generateSession({ fingerprint, graph: conceptGraph, availableSentenceIds: availableSentenceIdsProp });
    contentCache.current.clear();
    sessionStore.startSession(output.session);

    // Kick off background model loading on first session start
    aiService.init().catch(() => { /* swallow — service degrades gracefully */ });

    prefetch(output.session.items, 0);
  }, [sessionStore, prefetch, availableSentenceIdsProp]);

  // Keep the prefetch window moving as the learner progresses
  useEffect(() => {
    if (!session?.items.length) return;
    prefetch(session.items, currentItemIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItemIndex, session?.id]);

  const submitResult = useCallback(
    (result: ExerciseResult) => {
      // Capture before any store mutations — index doesn't advance here, but
      // capturing early makes the dependency explicit and safe against refactors.
      const currentIndex = useSessionStore.getState().currentItemIndex;
      const item = useSessionStore.getState().session?.items[currentIndex];

      sessionStore.recordResult(result);
      recordFingerprintResult(result);

      if (result.correct) {
        sessionStore.advanceItem();
        return;
      }
      const { fingerprint } = useFingerprintStore.getState();
      const errorCount = (fingerprint?.recentErrors ?? []).filter(
        (e) => e.errorTag === (result.errorTag ?? 'word-order'),
      ).length;

      const error = {
        id: crypto.randomUUID(),
        conceptId: result.conceptId,
        errorTag: result.errorTag ?? 'word-order',
        exerciseType: item?.exerciseType ?? 'translation-to-norwegian',
        wrong: result.userAnswer,
        correct: result.correctAnswer,
        timestamp: new Date().toISOString(),
      } as const;

      lastErrorRef.current = error;
      const plan = buildRepairPlan(error);
      sessionStore.enterRepair(plan);

      // Async: upgrade the template explanation with an AI-generated one.
      // Updates the store in-place so the learner sees it if they haven't
      // tapped Continue yet — no jarring layout shift, just text update.
      aiService
        .explainMistake({
          wrong: error.wrong,
          correct: error.correct,
          errorTag: error.errorTag,
          conceptId: error.conceptId,
          level: fingerprint?.currentLevel ?? 'A1',
          errorCount,
        })
        .then((explanation) => {
          if (explanation.source === 'ai') {
            sessionStore.updateRepairExplanation(explanation.text);
          }
        })
        .catch(() => { /* template already shown — no action needed */ });
    },
    [sessionStore, recordFingerprintResult],
  );

  const continueAfterRepair = useCallback(async () => {
    const state = useSessionStore.getState();
    const error = lastErrorRef.current;

    // Only inject repair items for original session items, not for repair items
    // themselves — otherwise a wrong answer on a repair item causes exponential growth.
    const currentItem = state.session?.items[state.currentItemIndex];
    if (error && currentItem && !currentItem.isRepairItem) {
      const seeds = seedsByConceptId.current.get(error.conceptId) ?? [];
      const sentenceIds = seeds.map((s) => s.id);
      const repairItems = makeRepairItems(
        error,
        state.repairPlan ?? buildRepairPlan(error),
        sentenceIds,
      );
      // Await first item so the learner doesn't land on a blank exercise.
      // Fire-and-forget the rest — they'll resolve while the first is shown.
      if (repairItems[0]) await resolveItem(repairItems[0]);
      repairItems.slice(1).forEach((item) => { resolveItem(item); });
      state.injectRepairItems(repairItems, state.currentItemIndex);
    }

    sessionStore.exitRepair();
    sessionStore.advanceItem();
    lastErrorRef.current = null;
  }, [sessionStore, resolveItem]);

  // Auto-advance items whose content can't be resolved (no seed, no generation)
  useEffect(() => {
    if (!session || !currentItem || currentContent || isInRepair) return;
    const isComplete = currentItemIndex >= session.items.length;
    if (isComplete) return;
    // Give resolution 3 s before silently skipping — do NOT record a result
    // to avoid inflating mastery scores for content that was never shown
    const timer = setTimeout(() => {
      if (contentCache.current.has(currentItem.id)) return;
      sessionStore.advanceItem();
    }, 3000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.id, currentContent, isInRepair, session?.id]);

  return {
    session,
    currentItem,
    currentContent,
    currentItemIndex,
    isInRepair,
    repairPlan,
    startNewSession,
    submitResult,
    continueAfterRepair,
    exitRepair: sessionStore.exitRepair,
  };
}
