'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useFingerprintStore } from '@/stores/fingerprint-store';
import { useFingerprint } from '@/hooks/useFingerprint';
import { generateSession, buildRepairPlan, makeRepairItems } from '@/engine';
import { aiService } from '@/ai';
import { emitEvent } from '@/lib/events';
import type { ExerciseResult, SessionItem, ExerciseType, SessionRecipe } from '@/types/session';
import type { Sentence, ResolvedContent } from '@/types/content';
import { getGraphForLevel } from '@/lib/concept-graph-loader';

const SCENARIOS = [
  'daily-routine', 'food', 'transport', 'family',
  'shopping', 'work', 'weather', 'health',
];


// Generate up to 5 sentences for a concept and add them to the in-memory pool.
// Called in the background when the unused pool runs low.
async function topUpConcept(
  conceptId: string,
  preferredExerciseType: string,
  existingSeeds: Sentence[],
): Promise<void> {
  const { fingerprint } = useFingerprintStore.getState();
  if (!fingerprint) return;
  const exerciseTypes = [
    preferredExerciseType,
    'translation-to-norwegian',
    'fill-in-blank',
    'word-order',
    'translation-to-english',
  ];
  for (let i = 0; i < 5; i++) {
    try {
      const exerciseType = (exerciseTypes[i % exerciseTypes.length] ?? 'translation-to-norwegian') as ExerciseType;
      const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)] ?? 'daily-routine';
      const generated = await aiService.generateContent({
        conceptId,
        exerciseType,
        level: fingerprint.currentLevel,
        purpose: 'new-material',
        recentErrors: (fingerprint.recentErrors ?? [])
          .filter((e) => e.conceptId === conceptId)
          .slice(0, 3)
          .map((e) => e.errorTag),
        masteryScore: fingerprint.conceptMastery[conceptId]?.rawScore,
        productionGap: fingerprint.productionGap[conceptId] ?? 0,
        scenario,
      });
      if (generated) {
        // ResolvedContent satisfies Sentence — cast is safe
        existingSeeds.push(generated as Sentence);
      }
    } catch {
      // Silent — content top-up is best-effort
    }
  }
}

export function useSession(
  sentences: Record<string, Sentence> = {},
  availableSentenceIdsProp: Record<string, string[]> = {},
) {
  const sessionStore = useSessionStore();
  const { recordResult: recordFingerprintResult, ensureWeekOpenAndPersist } = useFingerprint();

  // itemId → resolved content (AI-generated or seed fallback)
  const contentCache = useRef<Map<string, ResolvedContent>>(new Map());
  // conceptId → sentences that support various exercise types
  const seedsByConceptId = useRef<Map<string, Sentence[]>>(new Map());
  const lastErrorRef = useRef<Parameters<typeof buildRepairPlan>[0] | null>(null);

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

  // Resolve content for one item.
  // Seeds are used immediately (never blocks) — AI generation runs in the background
  // and upgrades the content if it completes before the learner submits the item.
  const resolveItem = useCallback(async (item: SessionItem): Promise<void> => {
    if (contentCache.current.has(item.id)) return;

    // ── Seed path (synchronous) ──────────────────────────────────────────────
    const conceptId = item.conceptIds[0] ?? '';
    const seeds = seedsByConceptId.current.get(conceptId) ?? [];

    const usedIds = useSessionStore.getState().usedSentenceIds;

    // Dynamic top-up: if the unused pool is thin, generate more sentences in the background
    const unusedSeeds = seeds.filter((s) => !usedIds.has(s.id));
    if (unusedSeeds.length < 3 && aiService.isReady()) {
      void topUpConcept(conceptId, item.exerciseType, seeds);
    }

    // Never use fill-in-blank sentences (containing ___) for non-blank exercises
    const isFillBlank = item.exerciseType === 'fill-in-blank';
    const eligible = isFillBlank ? seeds : seeds.filter((s) => !s.norwegian.includes('___'));

    const compatible = eligible.filter((s) => s.exerciseTypes.includes(item.exerciseType));
    const pool = compatible.length > 0 ? compatible : eligible;

    // Exclude passed sentences from normal progression; allow for review/repair
    const passedIds = useFingerprintStore.getState().fingerprint?.passedSentenceIds ?? {};
    const isReviewOrRepair = item.purpose === 'review' || item.isRepairItem;
    const notPassed = isReviewOrRepair ? pool : pool.filter((s) => !passedIds[s.id]);
    const effectivePool = notPassed.length > 0 ? notPassed : pool;

    // Prefer sentences not yet used in this session; fall back to full pool if exhausted
    const fresh = effectivePool.filter((s) => !usedIds.has(s.id));
    const source = fresh.length > 0 ? fresh : effectivePool;
    const picked = source[Math.floor(Math.random() * source.length)];
    if (picked) {
      sessionStore.markSentenceUsed(picked.id);
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
    ensureWeekOpenAndPersist();
    const { fingerprint } = useFingerprintStore.getState(); // re-read after potential update
    if (!fingerprint) return;

    const activeGraph = getGraphForLevel(fingerprint.currentLevel);

    const isCalibrating = (fingerprint.calibrationSessionsRemaining ?? 0) > 0;

    const calibrationRecipe: Partial<SessionRecipe> = isCalibrating
      ? {
          newMaterialRatio: 0.30,
          remediationRatio: 0.30,
          reviewRatio: 0.30,
          interleavingRatio: 0.10,
        }
      : {};

    const output = generateSession({ fingerprint, graph: activeGraph, availableSentenceIds: availableSentenceIdsProp, sentences, recipe: calibrationRecipe });
    contentCache.current.clear();
    sessionStore.startSession(output.session);

    // Kick off background model loading on first session start
    aiService.init().catch(() => { /* swallow — service degrades gracefully */ });

    emitEvent({
      eventType: 'session_started',
      mode: 'session',
      sessionId: output.session.id,
      payload: { level: fingerprint.currentLevel, itemCount: output.session.items.length },
    });

    prefetch(output.session.items, 0);
  }, [sessionStore, prefetch, availableSentenceIdsProp, ensureWeekOpenAndPersist]);

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

      const sessionId = useSessionStore.getState().session?.id;
      emitEvent({
        eventType: 'exercise_result',
        mode: 'session',
        sessionId,
        conceptIds: [result.conceptId],
        errorTags: result.errorTag ? [result.errorTag] : [],
        payload: { correct: result.correct, exerciseType: item?.exerciseType },
      });

      if (result.correct) {
        sessionStore.advanceItem();
        return;
      }
      const { fingerprint } = useFingerprintStore.getState();
      const errorCount = (fingerprint?.recentErrors ?? []).filter(
        (e) => e.errorTag === (result.errorTag ?? 'unspecified'),
      ).length;

      // Capture the sentence that was shown — needed so the retry step can use the
      // same sentence rather than drawing randomly from the concept's seed pool.
      const resolvedSentenceId = contentCache.current.get(item?.id ?? '')?.id;

      const error = {
        id: crypto.randomUUID(),
        conceptId: result.conceptId,
        errorTag: result.errorTag ?? 'unspecified',
        exerciseType: item?.exerciseType ?? 'translation-to-norwegian',
        wrong: result.userAnswer,
        correct: result.correctAnswer,
        timestamp: new Date().toISOString(),
        sentenceId: resolvedSentenceId,
      } as const;

      lastErrorRef.current = error;
      const plan = buildRepairPlan(error);
      sessionStore.enterRepair(plan);

      emitEvent({
        eventType: 'repair_triggered',
        mode: 'session',
        sessionId,
        conceptIds: [error.conceptId],
        errorTags: [error.errorTag],
        payload: { wrong: error.wrong, correct: error.correct },
      });

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

      // Pre-seed the retry item's cache with the original resolved content so the
      // learner sees the same sentence they failed on, not a random pool draw.
      // resolveItem checks the cache first and returns early on a hit.
      // Fallback: if the cache lookup fails (should never happen in a live session
      // but handles page-reload or unexpected cache miss), log and let resolveItem
      // fall through to its normal pool selection — graceful degradation, not crash.
      const originalContent = contentCache.current.get(currentItem.id);
      const retryItem = repairItems[repairItems.length - 1];
      if (originalContent && retryItem) {
        contentCache.current.set(retryItem.id, originalContent);
      } else {
        console.warn('[repair] cache miss for original sentence — retry will use pool fallback');
      }

      // Await first item so the learner doesn't land on a blank exercise.
      // Fire-and-forget the rest — retry will hit cache, others resolve normally.
      if (repairItems[0]) await resolveItem(repairItems[0]);
      repairItems.slice(1).forEach((item) => { resolveItem(item); });
      state.injectRepairItems(repairItems, state.currentItemIndex);
    }

    sessionStore.exitRepair();
    sessionStore.advanceItem();
    lastErrorRef.current = null;
  }, [sessionStore, resolveItem]);

  // NOTE: The 3-second auto-skip useEffect was removed here (P0 item 8).
  // The scheduler guard (item 1+2) ensures all queued items have eligible seeds,
  // so resolveItem always finds content. If content is somehow null, the
  // LoadingSkeleton is the honest visible state — the user can exit via X.
  // Silently advancing the counter without user interaction is a no-silent-
  // substitution violation (same class as the AI badge and error tag bugs).

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
