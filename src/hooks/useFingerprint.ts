'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { useFingerprintStore } from '@/stores/fingerprint-store';
import { useSessionStore } from '@/stores/session-store';
import { loadFingerprint, saveFingerprint } from '@/storage/indexeddb';
import { createEmptyFingerprint, normalizeFingerprint } from '@/types/fingerprint';
import type { MistakeFingerprint, DailyProgress } from '@/types/fingerprint';
import {
  updateConceptMastery,
  refreshDecay,
  logError,
  aggregateErrorPatterns,
  computeProductionGap,
  brickWeightForExercise,
  bumpDailyBrick,
  recordVocabResult,
  ensureWeekOpen,
  closeWeek,
  openWeek,
  seedInitialMastery,
} from '@/engine';
import type { VocabResultInput } from '@/engine';
import { recordSpeakingProductionToFingerprint } from '@/engine/repair-from-surface';
import { migrateWeeklySprintFields } from '@/engine/weekly-sprint';
import { emitEvent } from '@/lib/events';
import { logWeeklyCheckComplete, logConceptExposure } from '@/lib/logEvents';
import type { ExerciseResult } from '@/types/session';
import { getGraphForLevel, a1Graph, a2Graph, b1Graph } from '@/lib/concept-graph-loader';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const A1_CONCEPTS = a1Graph.concepts;
const A2_CONCEPTS = a2Graph.concepts;
const B1_CONCEPTS = b1Graph.concepts;

const ANON_ID_KEY = 'norsk-coach-anon-id';

function getOrCreateAnonId(): string {
  const stored = localStorage.getItem(ANON_ID_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(ANON_ID_KEY, id);
  return id;
}

function checkA1Complete(fp: MistakeFingerprint): boolean {
  return A1_CONCEPTS.every((node) => {
    const m = fp.conceptMastery[node.id];
    return (
      m != null &&
      m.rawScore >= node.masteryThreshold &&
      m.attemptCount >= node.minAttempts
    );
  });
}

function checkA2Complete(fp: MistakeFingerprint): boolean {
  return A2_CONCEPTS.every((c) => {
    const m = fp.conceptMastery[c.id];
    return m && m.rawScore >= c.masteryThreshold && m.attemptCount >= c.minAttempts;
  });
}

function checkB1Complete(fp: MistakeFingerprint): boolean {
  return B1_CONCEPTS.every((c) => {
    const m = fp.conceptMastery[c.id];
    return m && m.rawScore >= c.masteryThreshold && m.attemptCount >= c.minAttempts;
  });
}

async function loadFingerprintFromSupabase(userId: string): Promise<MistakeFingerprint | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('fingerprint_sync')
    .select('data')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  const raw = data.data;
  if (raw && typeof raw === 'object' && 'userId' in raw && 'conceptMastery' in raw && 'recentErrors' in raw) {
    // Backfill fields added since this remote fingerprint was last synced, same
    // as the local path — a legacy Supabase fp (e.g. missing dailyProgress or
    // vocabularyMastery) must not reach render unbackfilled and crash a reader.
    return normalizeFingerprint(raw as MistakeFingerprint);
  }
  return null;
}

async function saveFingerprintToSupabase(fp: MistakeFingerprint): Promise<void> {
  const supabase = createClient();
  await supabase.from('fingerprint_sync').upsert(
    { user_id: fp.userId, data: fp, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
}

// Legacy diagnostic concept-id → canonical graph concept-id (P0.5-02).
// Existing user fingerprints carry these legacy keys; rename them on bootstrap
// so the keys match the curriculum graph and downstream lookups succeed.
const LEGACY_CONCEPT_ID_RENAMES: Record<string, string> = {
  'present-tense-verbs': 'present-tense-regular',
  'negation-placement': 'negation',
  'past-tense-regular': 'preterite-regular',
  'modal-verbs': 'common-modal-verbs',
  'prepositions-place': 'common-prepositions',
};

// Idempotent: a second call on the migrated fingerprint is a no-op because
// legacy keys disappear after the first run.
function migrateConceptIds(fp: MistakeFingerprint): { migrated: MistakeFingerprint; changed: boolean } {
  let changed = false;
  const conceptMastery = { ...fp.conceptMastery };

  for (const [oldKey, newKey] of Object.entries(LEGACY_CONCEPT_ID_RENAMES)) {
    const legacy = conceptMastery[oldKey];
    if (!legacy) continue;
    const existing = conceptMastery[newKey];
    if (existing) {
      // Merge policy: prefer the entry with the newer lastAttemptAt.
      // If existing.lastAttemptAt is null, keep legacy (carries diagnostic seed signal).
      // Ties and both-null cases prefer legacy for determinism.
      const legacyNewer =
        !existing.lastAttemptAt ||
        (legacy.lastAttemptAt != null && legacy.lastAttemptAt >= existing.lastAttemptAt);
      conceptMastery[newKey] = legacyNewer
        ? { ...legacy, conceptId: newKey }
        : existing;
    } else {
      conceptMastery[newKey] = { ...legacy, conceptId: newKey };
    }
    delete conceptMastery[oldKey];
    changed = true;
  }

  // Rewrite recentErrors[].conceptId; leave askedDiagnosticQuestionIds alone
  // (those are question IDs, not concept IDs).
  const recentErrors = fp.recentErrors.map((e) => {
    const remap = LEGACY_CONCEPT_ID_RENAMES[e.conceptId];
    if (remap) {
      changed = true;
      return { ...e, conceptId: remap };
    }
    return e;
  });

  if (changed) {
    return {
      migrated: { ...fp, conceptMastery, recentErrors, updatedAt: new Date().toISOString() },
      changed: true,
    };
  }
  return { migrated: fp, changed: false };
}

async function applyMigration(
  fp: MistakeFingerprint,
  persist: 'local' | 'local+remote',
): Promise<MistakeFingerprint> {
  const { migrated: afterConceptIds, changed: conceptIdsChanged } = migrateConceptIds(fp);
  const { migrated, changed: weeklySprintChanged } = migrateWeeklySprintFields(afterConceptIds);
  const changed = conceptIdsChanged || weeklySprintChanged;
  if (changed) {
    await saveFingerprint(migrated);
    if (persist === 'local+remote') {
      saveFingerprintToSupabase(migrated).catch(console.warn);
    }
  }
  return migrated;
}

async function migrateAnonFingerprintToUser(user: User): Promise<MistakeFingerprint | null> {
  const anonId = localStorage.getItem(ANON_ID_KEY);
  if (!anonId || anonId === user.id) return null;
  const local = await loadFingerprint(anonId);
  if (!local) return null;
  const migrated: MistakeFingerprint = { ...local, userId: user.id };
  await Promise.all([saveFingerprint(migrated), saveFingerprintToSupabase(migrated)]);
  localStorage.setItem(ANON_ID_KEY, user.id);
  return migrated;
}

export function useFingerprint() {
  const { fingerprint, status, setFingerprint } = useFingerprintStore();
  const { user, loading: authLoading } = useAuth();
  const prevUserRef = useRef<User | null>(null);
  const bootstrappingRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (bootstrappingRef.current) return;

    // P0.5-14 (F009): drop the empty `norskcoach-fingerprint` IndexedDB if
    // it's hanging around in the browser from an older code path. The store
    // is unused; deleting it removes the two-DB confusion observed in the
    // third walkthrough.
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('norskcoach-fingerprint');
    }

    async function bootstrap() {
      bootstrappingRef.current = true;
      if (user) {
        const wasAnon = prevUserRef.current === null;
        if (wasAnon) {
          const migrated = await migrateAnonFingerprintToUser(user).catch(() => null);
          if (migrated) {
            const reconciled = await applyMigration(migrated, 'local+remote');
            const graph = getGraphForLevel(reconciled.currentLevel);
            const withWeek = ensureWeekOpen(reconciled, graph);
            setFingerprint(refreshDecay(withWeek));
            if (withWeek !== reconciled) {
              await saveFingerprint(withWeek);
              saveFingerprintToSupabase(withWeek).catch(console.warn);
            }
            return;
          }
        }
        const remote = await loadFingerprintFromSupabase(user.id).catch(() => null);
        if (remote) {
          const reconciled = await applyMigration(remote, 'local+remote');
          const graph = getGraphForLevel(reconciled.currentLevel);
          const withWeek = ensureWeekOpen(reconciled, graph);
          setFingerprint(refreshDecay(withWeek));
          if (withWeek !== reconciled) {
            await saveFingerprint(withWeek);
            saveFingerprintToSupabase(withWeek).catch(console.warn);
          }
          return;
        }
        const local = await loadFingerprint(user.id).catch(() => null);
        if (local) {
          const reconciled = await applyMigration(local, 'local+remote');
          const graph = getGraphForLevel(reconciled.currentLevel);
          const withWeek = ensureWeekOpen(reconciled, graph);
          setFingerprint(refreshDecay(withWeek));
          if (withWeek !== reconciled) {
            await saveFingerprint(withWeek);
            saveFingerprintToSupabase(withWeek).catch(console.warn);
          } else if (reconciled === local) {
            saveFingerprintToSupabase(local).catch(console.warn);
          }
          return;
        }
        const empty = createEmptyFingerprint(user.id);
        const graph = getGraphForLevel(empty.currentLevel);
        const seeded = seedInitialMastery(empty, graph);
        const withWeek = ensureWeekOpen(seeded, graph);
        setFingerprint(withWeek);
        await saveFingerprint(withWeek);
        saveFingerprintToSupabase(withWeek).catch(console.warn);
      } else {
        const anonId = getOrCreateAnonId();
        const local = await loadFingerprint(anonId).catch(() => null);
        if (local) {
          const reconciled = await applyMigration(local, 'local');
          const graph = getGraphForLevel(reconciled.currentLevel);
          const withWeek = ensureWeekOpen(reconciled, graph);
          setFingerprint(refreshDecay(withWeek));
          if (withWeek !== reconciled) {
            await saveFingerprint(withWeek);
          }
        } else {
          const empty = createEmptyFingerprint(anonId);
          const graph = getGraphForLevel(empty.currentLevel);
          const seeded = seedInitialMastery(empty, graph);
          const withWeek = ensureWeekOpen(seeded, graph);
          setFingerprint(withWeek);
          await saveFingerprint(withWeek);
        }
      }
    }

    bootstrap().finally(() => { bootstrappingRef.current = false; });
    prevUserRef.current = user;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const recordResult = useCallback(
    (result: ExerciseResult) => {
      const fp = useFingerprintStore.getState().fingerprint;
      if (!fp) return;

      const activeGraph = getGraphForLevel(fp.currentLevel);
      const node = activeGraph.concepts.find((c) => c.id === result.conceptId);
      const minAttempts = node?.minAttempts ?? 15;
      const minDays = node?.minDays ?? 3;

      const existing = fp.conceptMastery[result.conceptId];
      // Self-verified near-miss (translate-to-English recourse, VC §3.7): the
      // learner attested an unverified answer as correct. Honour it as a real but
      // SMALLER mastery move (half the EMA step) and FREEZE the SRS ladder — the
      // system never verified it, so it must not advance review spacing (VC §3.1).
      const scale = result.selfVerified ? 0.5 : 1;
      const rawMastery = updateConceptMastery(existing, result.correct, minAttempts, minDays, scale);
      const updatedMastery =
        result.selfVerified && existing
          ? { ...rawMastery, srsLevel: existing.srsLevel ?? 0, nextReviewAt: existing.nextReviewAt ?? null }
          : rawMastery;

      let updated: MistakeFingerprint = {
        ...fp,
        conceptMastery: {
          ...fp.conceptMastery,
          [result.conceptId]: { ...updatedMastery, conceptId: result.conceptId },
        },
        updatedAt: new Date().toISOString(),
      };

      if (!result.correct && result.errorTag) {
        const sessionItems = useSessionStore.getState().session?.items ?? [];
        const matchingItem = sessionItems.find((i) => i.id === result.itemId);
        updated = logError(updated, {
          conceptId: result.conceptId,
          errorTag: result.errorTag,
          exerciseType: matchingItem?.exerciseType ?? 'translation-to-norwegian',
          wrong: result.userAnswer,
          correct: result.correctAnswer,
          sentenceId: result.itemId,
        });
        updated = { ...updated, errorPatterns: aggregateErrorPatterns(updated) };
      }

      // ── Production-vs-recognition gap ────────────────────────────────────
      // Recompute for this concept from the (possibly just-updated) error log.
      // Previously computeProductionGap was never called, so productionGap
      // stayed {} forever and the scheduler's production/recognition pool
      // selection (resolveExercisePool) and the diagnosis rule both read a
      // constant 0. Wiring it here gives them a real signal.
      updated = {
        ...updated,
        productionGap: {
          ...updated.productionGap,
          [result.conceptId]: computeProductionGap(updated.recentErrors, result.conceptId),
        },
      };

      // ── Passed sentence tracking ────────────────────────────────────────
      if (result.correct && result.sentenceId) {
        updated = {
          ...updated,
          passedSentenceIds: {
            ...updated.passedSentenceIds,
            [result.sentenceId]: new Date().toISOString(),
          },
        };
      }

      // ── A1 → A2 level progression ────────────────────────────────────────
      if (updated.currentLevel === 'A1' && checkA1Complete(updated)) {
        updated = { ...updated, currentLevel: 'A2', updatedAt: new Date().toISOString() };
        const a2GraphLocal = getGraphForLevel('A2');
        updated = seedInitialMastery(updated, a2GraphLocal);
        const withWeek = ensureWeekOpen(updated, a2GraphLocal);
        if (withWeek !== updated) updated = withWeek;
        try { localStorage.setItem('norskcoach_levelup_pending', '1'); } catch { /* ignore */ }
        emitEvent({
          eventType: 'level_changed',
          mode: 'session',
          payload: { from: 'A1', to: 'A2' },
        });
      }

      // ── A2 → B1 level progression ────────────────────────────────────────
      if (updated.currentLevel === 'A2' && checkA2Complete(updated)) {
        updated = { ...updated, currentLevel: 'B1', updatedAt: new Date().toISOString() };
        updated = seedInitialMastery(updated, getGraphForLevel('B1'));
        updated = ensureWeekOpen(updated, getGraphForLevel('B1'));
        try { localStorage.setItem('norskcoach_levelup_pending', '1'); } catch { /* ignore */ }
      }

      // ── B1 → B2 level progression ────────────────────────────────────────
      if (updated.currentLevel === 'B1' && checkB1Complete(updated)) {
        updated = { ...updated, currentLevel: 'B2', updatedAt: new Date().toISOString() };
        try { localStorage.setItem('norskcoach_levelup_pending', '1'); } catch { /* ignore */ }
      }

      // ── Daily brick tally (production wall) ────────────────────────────
      // One correct in-session answer lays one brick, weighted by exercise type
      // (production vs recognition). A wrong answer lays NO brick — errors live
      // in the repair loop, not on the progress wall.
      if (result.correct) {
        const sessionItems = useSessionStore.getState().session?.items ?? [];
        const item = sessionItems.find((i) => i.id === result.itemId);
        const weight = item ? brickWeightForExercise(item.exerciseType) : 'recognition';
        updated = bumpDailyBrick(updated, weight);
      }

      setFingerprint(updated);
      saveFingerprint(updated).catch(console.warn);
      if (user) { saveFingerprintToSupabase(updated).catch(console.warn); }
    },
    [setFingerprint, user]
  );

  const refreshFingerprint = useCallback(() => {
    const fp = useFingerprintStore.getState().fingerprint;
    if (!fp) return;
    const refreshed = refreshDecay(fp);
    setFingerprint(refreshed);
    saveFingerprint(refreshed).catch(console.warn);
    if (user) { saveFingerprintToSupabase(refreshed).catch(console.warn); }
  }, [setFingerprint, user]);

  const ensureWeekOpenAndPersist = useCallback(() => {
    const fp = useFingerprintStore.getState().fingerprint;
    if (!fp) return;
    const graph = getGraphForLevel(fp.currentLevel);
    const withWeek = ensureWeekOpen(fp, graph);
    if (withWeek !== fp) {
      setFingerprint(withWeek);
      saveFingerprint(withWeek).catch(console.warn);
      if (user) saveFingerprintToSupabase(withWeek).catch(console.warn);
    }
  }, [setFingerprint, user]);

  const recordWeeklyCheckResult = useCallback(
    ({ score, items, now }: { score: number; items: number; now?: Date }) => {
      const fp = useFingerprintStore.getState().fingerprint;
      if (!fp) return;
      const moment = now ?? new Date();
      const graph = getGraphForLevel(fp.currentLevel);
      const closed = closeWeek(fp, graph, {
        status: 'completed',
        checkResult: { takenAt: moment.toISOString(), score, items },
        now: moment,
      });
      const reopened = openWeek(closed, graph, moment);
      setFingerprint(reopened);
      saveFingerprint(reopened).catch(console.warn);
      if (user) saveFingerprintToSupabase(reopened).catch(console.warn);
      // Phase 4b: anonymized telemetry — auth users only, guests skipped inside.
      if (user) logWeeklyCheckComplete(user.id, { score, items });
    },
    [setFingerprint, user]
  );

  const recordExposure = useCallback((conceptIds: string[]) => {
    if (!conceptIds.length) return
    const unique = Array.from(new Set(conceptIds))
    const now = new Date().toISOString()

    const fp = useFingerprintStore.getState().fingerprint
    if (!fp) return

    const next: typeof fp = { ...fp, conceptMastery: { ...fp.conceptMastery } }
    for (const conceptId of unique) {
      const existing = next.conceptMastery[conceptId]
      if (!existing) continue  // unknown concept — silently skip (defensive)
      next.conceptMastery[conceptId] = {
        ...existing,
        attemptCount: existing.attemptCount + 0.3,
        lastAttemptAt: now,
        // rawScore unchanged — exposure is not a mastery signal
        // confidenceScore unchanged
        // decayedScore unchanged
      }
    }
    next.updatedAt = now

    // Exposure lays the faintest brick on today's wall (read/heard, not produced).
    const withBrick = bumpDailyBrick(next, 'exposure')
    setFingerprint(withBrick)
    saveFingerprint(withBrick).catch(console.warn)
    if (user) {
      saveFingerprintToSupabase(withBrick).catch(console.warn)
      logConceptExposure(user.id, unique)
    }
  }, [setFingerprint, user])

  const recordBlockProgress = useCallback(
    (blockType: 'lytt' | 'lær' | 'snakk', completed: number, total: number, correct: number) => {
      const fp = useFingerprintStore.getState().fingerprint;
      if (!fp) return;

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const existing = fp.dailyProgress.find(d => d.date === today);

      const todayProgress: DailyProgress = existing ?? {
        date: today,
        blocks: {
          lytt: { completed: 0, total: 0, correct: 0 },
          lær: { completed: 0, total: 0, correct: 0 },
          snakk: { completed: 0, total: 0, correct: 0 },
        },
        completedAt: null,
      };

      todayProgress.blocks[blockType] = { completed, total, correct };

      // Check if all blocks are done
      const allDone = Object.values(todayProgress.blocks).every(b => b.completed >= b.total && b.total > 0);
      if (allDone) todayProgress.completedAt = new Date().toISOString();

      // Replace or prepend today's entry, keep 7 days
      const otherDays = fp.dailyProgress.filter(d => d.date !== today);
      const updated = { ...fp, dailyProgress: [todayProgress, ...otherDays].slice(0, 7) };

      setFingerprint(updated);
      saveFingerprint(updated).catch(console.warn);
      if (user) saveFingerprintToSupabase(updated).catch(console.warn);
    },
    [setFingerprint, user]
  );

  // ── Vocab track (B2 conjugation drill, Slice 3.3) ────────────────────────
  // Fold one vocab answer into cluster mastery (activation gate) and, on a
  // correct production, lay a production brick on today's wall. Mirrors
  // recordResult's persist pattern.
  const recordVocabAnswer = useCallback((input: VocabResultInput) => {
    const fp = useFingerprintStore.getState().fingerprint;
    if (!fp) return;
    let updated = recordVocabResult(fp, input);
    if (input.correct) {
      updated = bumpDailyBrick(updated, input.isProduction ? 'production' : 'recognition');
    }
    setFingerprint(updated);
    saveFingerprint(updated).catch(console.warn);
    if (user) saveFingerprintToSupabase(updated).catch(console.warn);
  }, [setFingerprint, user]);

  // ── Speaking production (the daily Snakk block + shadowing) ──────────────
  // Honest, self-report-only crediting for spoken Norwegian:
  //   - `minutes` ALWAYS accrues to speakingMinutesTotal (the learner spoke —
  //     time is the one objective signal a self-report can stand behind).
  //   - a GUIDED (reduced-weight) production brick lands ONLY when `produced`
  //     is true (Flytende/Nølende). It NEVER moves mastery and NEVER logs an
  //     error: a self-rating is too gameable to be an objective judge (Rule 8).
  const recordSpeakingProduction = useCallback(
    ({ minutes, produced }: { minutes: number; produced: boolean }) => {
      const fp = useFingerprintStore.getState().fingerprint;
      if (!fp) return;
      const updated = recordSpeakingProductionToFingerprint(fp, { minutes, produced });
      setFingerprint(updated);
      saveFingerprint(updated).catch(console.warn);
      if (user) saveFingerprintToSupabase(updated).catch(console.warn);
    },
    [setFingerprint, user]
  );

  return { fingerprint, status, recordResult, refreshFingerprint, ensureWeekOpenAndPersist, recordWeeklyCheckResult, recordExposure, recordBlockProgress, recordVocabAnswer, recordSpeakingProduction };
}
