'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/stores/session-store';
import { useFingerprintStore } from '@/stores/fingerprint-store';
import { useFingerprint } from '@/hooks/useFingerprint';
import { useNotebook } from '@/hooks/useNotebook';
import { useNotebookStore } from '@/stores/notebook-store';
import { getEligibleNotebookItems } from '@/lib/notebook-promotion';
import { advanceNotebookSrs } from '@/lib/srs';
import { generateSession, buildRepairPlan, makeRepairItems } from '@/engine';
import { aiService } from '@/ai';
import { emitEvent } from '@/lib/events';
import type { ExerciseResult, SessionItem, ExerciseType, SessionRecipe, SessionBlock } from '@/types/session';
import { sentenceSupportsType } from '@/types/session';
import type { Sentence, ResolvedContent, ResolvedClozePassage } from '@/types/content';
import { SEED_PASSAGES, SEED_PASSAGE_IDS } from '@/lib/passage-pool';
import { getGraphForLevel } from '@/lib/concept-graph-loader';
import { buildClozeFromSentence } from '@/lib/auto-cloze';
import { withinLevelCeiling, preferAtLevel } from '@/lib/at-level-select';

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
  const { recordResult: recordFingerprintResult, ensureWeekOpenAndPersist, recordSpeakingProduction } = useFingerprint();
  // Notebook practice (T3.13/T3.14): feeds eligible saved items into the session
  // and advances ONLY their own SRS on grade — never conceptMastery (Rule 8 / T1.6).
  const { items: notebookItems, updateItem: updateNotebookItem } = useNotebook();

  // itemId → resolved content (AI-generated or seed fallback)
  const contentCache = useRef<Map<string, ResolvedContent>>(new Map());
  // itemId → resolved cloze passage (parallel cache — does not widen contentCache)
  const passageCache = useRef<Map<string, ResolvedClozePassage>>(new Map());
  // conceptId → sentences that support various exercise types
  const seedsByConceptId = useRef<Map<string, Sentence[]>>(new Map());
  const lastErrorRef = useRef<Parameters<typeof buildRepairPlan>[0] | null>(null);

  // Toggle flips to force re-renders when new content resolves
  const [, forceUpdate] = useState(0);

  const { session, currentItemIndex, isInRepair, repairPlan } = sessionStore;
  const currentItem = session?.items[currentItemIndex] ?? null;
  const currentContent = currentItem ? contentCache.current.get(currentItem.id) : undefined;
  const currentCloze = currentItem ? passageCache.current.get(currentItem.id) : undefined;

  // Compute which block the current item belongs to and its 0-based position within
  // that block. Returns null when the session has no blocks (backward compatibility).
  const currentBlock: {
    block: SessionBlock;
    blockIndex: number;
    positionInBlock: number;
  } | null = (() => {
    const blocks = session?.blocks;
    if (!blocks || blocks.length === 0) return null;
    let offset = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      if (!block) continue;
      const blockSize = block.items.length;
      if (currentItemIndex < offset + blockSize) {
        return { block, blockIndex: i, positionInBlock: currentItemIndex - offset };
      }
      offset += blockSize;
    }
    // currentItemIndex is past all blocks (session complete) — return last block boundary
    const lastBlock = blocks[blocks.length - 1];
    if (!lastBlock) return null;
    return { block: lastBlock, blockIndex: blocks.length - 1, positionInBlock: lastBlock.items.length };
  })();

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

    // ── Notebook-practice path ───────────────────────────────────────────────
    // A notebook_practice item carries contentId `notebook:<id>`. Resolve its
    // ResolvedContent directly from the notebook store (the item is the prompt
    // source, not the corpus). source:'generated' routes grading through the
    // fallbackContent path the components already handle.
    if (item.contentId.startsWith('notebook:')) {
      const nbId = item.contentId.slice('notebook:'.length);
      const nb = useNotebookStore.getState().items.find((i) => i.id === nbId);
      if (nb) {
        const currentLevel = useFingerprintStore.getState().fingerprint?.currentLevel ?? 'A1';
        const resolved: ResolvedContent = {
          id: nb.id,
          norwegian: nb.norwegian,
          english: nb.english ?? '',
          conceptIds: nb.conceptId ? [nb.conceptId] : [],
          vocabularyClusters: [],
          errorTagsDetectable: [],
          cefrLevel: currentLevel,
          difficulty: 2,
          exerciseTypes: ['translation-to-norwegian'],
          notes: nb.grammarNote,
          acceptedAnswers: [],
          source: 'generated',
          isReviewFallback: false,
        };
        contentCache.current.set(item.id, resolved);
        forceUpdate((n) => n + 1);
      }
      return;
    }

    // ── Cloze-passage path ───────────────────────────────────────────────────
    if (item.exerciseType === 'cloze-passage') {
      if (passageCache.current.has(item.id)) return;
      const conceptId = item.conceptIds[0] ?? '';
      const passedIds = useFingerprintStore.getState().fingerprint?.passedSentenceIds ?? {};
      const candidateIds = (SEED_PASSAGE_IDS[conceptId] ?? []).filter((id) => !passedIds[id]);
      const pickId = candidateIds[Math.floor(Math.random() * candidateIds.length)]
        ?? (SEED_PASSAGE_IDS[conceptId] ?? [])[0];
      const passage = pickId ? SEED_PASSAGES[pickId] : undefined;
      if (passage) {
        passageCache.current.set(item.id, { ...passage, source: 'seed' });
        forceUpdate((n) => n + 1);
        return;
      }
      // Auto-cloze fallback: no authored passage (e.g. B1/B2) → build a single-gap
      // cloze from an eligible, unpassed, at-or-below-level seed sentence. Honest:
      // source:'generated' marks it as derived from a vetted sentence (Rule 6).
      const levelOrder = ['A1', 'A2', 'B1', 'B2'];
      const maxLevelIdx = levelOrder.indexOf(
        useFingerprintStore.getState().fingerprint?.currentLevel ?? 'A1',
      );
      const seeds = seedsByConceptId.current.get(conceptId) ?? [];
      for (const s of seeds) {
        if (s.norwegian.includes('___') || passedIds[s.id]) continue;
        if (levelOrder.indexOf(s.cefrLevel) > maxLevelIdx) continue;
        const built = buildClozeFromSentence(s);
        if (built) {
          passageCache.current.set(item.id, { ...built, source: 'generated' });
          forceUpdate((n) => n + 1);
          return;
        }
      }
      return;
    }

    // ── Seed path (synchronous) ──────────────────────────────────────────────
    const conceptId = item.conceptIds[0] ?? '';
    const currentLevel = useFingerprintStore.getState().fingerprint?.currentLevel ?? 'A1';
    // CEFR ceiling (safety, load-bearing post p6 Q-matrix): a foundational concept
    // is now tagged on higher-level sentences too, so this concept index can hold
    // above-level content — a learner must never be served above their level.
    const seeds = withinLevelCeiling(seedsByConceptId.current.get(conceptId) ?? [], currentLevel);

    const usedIds = useSessionStore.getState().usedSentenceIds;

    // Dynamic top-up: if the unused pool is thin, generate more sentences in the background
    const unusedSeeds = seeds.filter((s) => !usedIds.has(s.id));
    if (unusedSeeds.length < 3 && aiService.isReady()) {
      void topUpConcept(conceptId, item.exerciseType, seeds);
    }

    // Never use fill-in-blank sentences (containing ___) for non-blank exercises
    const isFillBlank = item.exerciseType === 'fill-in-blank';
    const eligible = isFillBlank ? seeds : seeds.filter((s) => !s.norwegian.includes('___'));

    const compatible = eligible.filter((s) => sentenceSupportsType(s.exerciseTypes, item.exerciseType));
    const pool = compatible.length > 0 ? compatible : eligible;

    // Exclude passed sentences from normal progression; allow for review/repair
    const passedIds = useFingerprintStore.getState().fingerprint?.passedSentenceIds ?? {};
    const isReviewOrRepair = item.purpose === 'review' || item.isRepairItem;
    const notPassed = isReviewOrRepair ? pool : pool.filter((s) => !passedIds[s.id]);

    // When all seeds are passed for a non-review item, we have no fresh content
    // for this concept. Rather than silently recycling passed content as if it
    // were new (a no-silent-substitution violation), we honestly disclose it as
    // a repetition via isReviewFallback (the UI shows a "Repetisjon" badge) and
    // queue AI top-up for future items. The scheduler should normally have
    // filtered this concept out, so this is defense-in-depth.
    const isReviewFallback = notPassed.length === 0 && !isReviewOrRepair;
    if (isReviewFallback && aiService.isReady()) {
      void topUpConcept(conceptId, item.exerciseType, seeds);
    }
    const effectivePool = notPassed.length > 0 ? notPassed : pool;

    // Prefer sentences not yet used in this session; fall back to full pool if exhausted
    const fresh = effectivePool.filter((s) => !usedIds.has(s.id));
    const freshOrAll = fresh.length > 0 ? fresh : effectivePool;
    // Remediate-at-level: prefer current-level sentences (the Q-matrix put the
    // foundational concept on B1/B2 sentences) over lower-level ones, so a B2
    // learner weak on gender practises it inside B2 content, not an A1 drill.
    // Falls back to the full pool when no at-level sentence exists.
    const source = preferAtLevel(freshOrAll, currentLevel);
    const picked = source[Math.floor(Math.random() * source.length)];
    if (picked) {
      sessionStore.markSentenceUsed(picked.id);
      contentCache.current.set(item.id, { ...picked, source: 'seed', isReviewFallback });
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

    // Notebook practice (T3.14): pass the learner's eligible saved items to the
    // scheduler. translation-to-norwegian shows English as the prompt and grades
    // the Norwegian answer, so items lacking either side are unusable — filter
    // them out here. Empty list is safe: the scheduler treats it as no injection.
    const eligibleNotebookItems = getEligibleNotebookItems(notebookItems, fingerprint).filter(
      (i) => i.norwegian && i.english,
    );

    const output = generateSession({ fingerprint, graph: activeGraph, availableSentenceIds: availableSentenceIdsProp, sentences, recipe: calibrationRecipe, availablePassageIds: SEED_PASSAGE_IDS, passages: SEED_PASSAGES, notebookItems: eligibleNotebookItems });
    contentCache.current.clear();
    passageCache.current.clear();
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
  }, [sessionStore, prefetch, availableSentenceIdsProp, ensureWeekOpenAndPersist, notebookItems]);

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
      const resolvedContent = contentCache.current.get(item?.id ?? '');
      const enrichedResult = { ...result, sentenceId: resolvedContent?.id ?? result.sentenceId };

      sessionStore.recordResult(enrichedResult);

      // G-02 + S-02: a speed-round MISS is unreliable evidence — speed-round is
      // rapid recall graded by exact-match English under a timer, so a "wrong"
      // is most often a valid paraphrase, a speed typo, or an empty timeout
      // submission, NOT a real error. Per Pipeline Honesty (Rule 8) it must not
      // punish: no fingerprint error, no SRS reset, no repair loop. The learner
      // still sees the canonical answer in the component before advancing. A
      // CORRECT speed-round still bricks + advances normally.
      const isSpeedRoundMiss = item?.exerciseType === 'speed-round' && !result.correct;
      if (!isSpeedRoundMiss) {
        if (item?.selectionReason === 'notebook_practice') {
          // Rule 8 / T1.6: a notebook-practice result advances ONLY the notebook
          // item's own SRS. It must NEVER reach recordFingerprintResult /
          // updateConceptMastery — an unverified saved item cannot move the
          // diagnosis fingerprint or mastery.
          const nbId = item.contentId.slice('notebook:'.length);
          const nb = useNotebookStore.getState().items.find((i) => i.id === nbId);
          if (nb) {
            updateNotebookItem(
              nbId,
              advanceNotebookSrs({ srsLevel: nb.srsLevel, nextReviewAt: nb.nextReviewAt }, result.correct),
            );
          }
        } else {
          recordFingerprintResult(enrichedResult);
        }
      }

      const sessionId = useSessionStore.getState().session?.id;
      emitEvent({
        eventType: 'exercise_result',
        mode: 'session',
        sessionId,
        conceptIds: [result.conceptId],
        errorTags: result.errorTag ? [result.errorTag] : [],
        payload: { correct: result.correct, exerciseType: item?.exerciseType },
      });

      if (result.correct || isSpeedRoundMiss) {
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
    [sessionStore, recordFingerprintResult, updateNotebookItem],
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

  const submitClozeResults = useCallback((results: ExerciseResult[]) => {
    const sessionId = useSessionStore.getState().session?.id;
    const currentIndex = useSessionStore.getState().currentItemIndex;

    for (const r of results) {
      sessionStore.recordResult(r);
      recordFingerprintResult(r);
      emitEvent({
        eventType: 'exercise_result',
        mode: 'session',
        sessionId,
        conceptIds: [r.conceptId],
        errorTags: r.errorTag ? [r.errorTag] : [],
        payload: { correct: r.correct, exerciseType: 'cloze-passage' },
      });
    }

    const wrong = results.filter((r) => !r.correct);
    const repairItems: SessionItem[] = [];
    for (const r of wrong) {
      const error = {
        id: crypto.randomUUID(),
        conceptId: r.conceptId,
        errorTag: r.errorTag ?? 'unspecified',
        exerciseType: 'fill-in-blank' as ExerciseType,
        wrong: r.userAnswer,
        correct: r.correctAnswer,
        timestamp: new Date().toISOString(),
        sentenceId: undefined,
      } as const;
      const plan = buildRepairPlan(error);
      const conceptSentenceIds = availableSentenceIdsProp[r.conceptId] ?? [];
      repairItems.push(...makeRepairItems(error, plan, conceptSentenceIds));
    }

    if (repairItems.length > 0) {
      void resolveItem(repairItems[0]);
      repairItems.slice(1).forEach((it) => { resolveItem(it); });
      useSessionStore.getState().injectRepairItems(repairItems, currentIndex);
    }

    sessionStore.advanceItem();
  }, [sessionStore, recordFingerprintResult, availableSentenceIdsProp, resolveItem]);

  // ── Speaking-production submit (the Snakk block) ─────────────────────────
  // Self-report only: the learner says the Norwegian aloud, then rates it. We
  // record SESSION progress (so the complete screen + exit guard work) but do
  // NOT call recordFingerprintResult — a self-rating must not move mastery or
  // trigger the repair loop. Honest crediting (minutes always; a guided brick
  // only when produced) goes through recordSpeakingProduction. ~6s/utterance
  // estimate matches the existing listen-respond speaking-minutes convention.
  const submitSpeakingResult = useCallback(
    ({ produced, conceptId, itemId }: { produced: boolean; conceptId: string; itemId: string }) => {
      const SPOKEN_MINUTES_PER_UTTERANCE = 0.1;
      const sessionId = useSessionStore.getState().session?.id;
      sessionStore.recordResult({
        sessionId: sessionId ?? '',
        itemId,
        correct: produced,
        userAnswer: '[spoken]',
        correctAnswer: '[spoken]',
        timeTakenSeconds: Math.round(SPOKEN_MINUTES_PER_UTTERANCE * 60),
        conceptId,
      });
      recordSpeakingProduction({ minutes: SPOKEN_MINUTES_PER_UTTERANCE, produced });
      emitEvent({
        eventType: 'exercise_result',
        mode: 'session',
        sessionId,
        conceptIds: [conceptId],
        errorTags: [],
        payload: { correct: produced, exerciseType: 'speaking-production' },
      });
      sessionStore.advanceItem();
    },
    [sessionStore, recordSpeakingProduction],
  );

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
    currentCloze,
    currentItemIndex,
    currentBlock,
    isInRepair,
    repairPlan,
    startNewSession,
    submitResult,
    submitClozeResults,
    submitSpeakingResult,
    continueAfterRepair,
    exitRepair: sessionStore.exitRepair,
  };
}
