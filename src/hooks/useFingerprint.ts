'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { useFingerprintStore } from '@/stores/fingerprint-store';
import { useSessionStore } from '@/stores/session-store';
import { loadFingerprint, saveFingerprint } from '@/storage/indexeddb';
import { createEmptyFingerprint } from '@/types/fingerprint';
import type { MistakeFingerprint } from '@/types/fingerprint';
import {
  updateConceptMastery,
  refreshDecay,
  logError,
  aggregateErrorPatterns,
  ensureWeekOpen,
  closeWeek,
  openWeek,
  seedInitialMastery,
} from '@/engine';
import { migrateWeeklySprintFields } from '@/engine/weekly-sprint';
import { emitEvent } from '@/lib/events';
import { logWeeklyCheckComplete, logConceptExposure } from '@/lib/logEvents';
import type { ExerciseResult } from '@/types/session';
import { getGraphForLevel, a1Graph } from '@/lib/concept-graph-loader';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const A1_CONCEPTS = a1Graph.concepts;

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
    return raw as MistakeFingerprint;
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
      const updatedMastery = updateConceptMastery(existing, result.correct, minAttempts, minDays);

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

      // ── A1 → A2 level progression ────────────────────────────────────────
      if (updated.currentLevel === 'A1' && checkA1Complete(updated)) {
        updated = { ...updated, currentLevel: 'A2', updatedAt: new Date().toISOString() };
        try { localStorage.setItem('norskcoach_levelup_pending', '1'); } catch { /* ignore */ }
        emitEvent({
          eventType: 'level_changed',
          mode: 'session',
          payload: { from: 'A1', to: 'A2' },
        });
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

    setFingerprint(next)
    saveFingerprint(next).catch(console.warn)
    if (user) {
      saveFingerprintToSupabase(next).catch(console.warn)
      logConceptExposure(user.id, unique)
    }
  }, [setFingerprint, user])

  return { fingerprint, status, recordResult, refreshFingerprint, ensureWeekOpenAndPersist, recordWeeklyCheckResult, recordExposure };
}
