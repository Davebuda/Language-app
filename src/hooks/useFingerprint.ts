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
} from '@/engine';
import type { ExerciseResult } from '@/types/session';
import type { ConceptGraph } from '@/types/concepts';
import conceptGraphJson from '@content/concepts/a1-graph.json';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const conceptGraph = conceptGraphJson as ConceptGraph;

const ANON_ID_KEY = 'norsk-coach-anon-id';

function getOrCreateAnonId(): string {
  const stored = localStorage.getItem(ANON_ID_KEY);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(ANON_ID_KEY, id);
  return id;
}

// ---------------------------------------------------------------------------
// Supabase sync helpers
// ---------------------------------------------------------------------------

async function loadFingerprintFromSupabase(userId: string): Promise<MistakeFingerprint | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('fingerprint_sync')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  // Validate the stored blob has the required fingerprint shape before casting
  const raw = data.data;
  if (
    raw &&
    typeof raw === 'object' &&
    'userId' in raw &&
    'conceptMastery' in raw &&
    'recentErrors' in raw
  ) {
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

// ---------------------------------------------------------------------------
// Migration: promote anonymous local fingerprint to auth user on first sign-in
// ---------------------------------------------------------------------------

async function migrateAnonFingerprintToUser(user: User): Promise<MistakeFingerprint | null> {
  const anonId = localStorage.getItem(ANON_ID_KEY);
  if (!anonId || anonId === user.id) return null;

  const local = await loadFingerprint(anonId);
  if (!local) return null;

  const migrated: MistakeFingerprint = { ...local, userId: user.id };
  await Promise.all([
    saveFingerprint(migrated),
    saveFingerprintToSupabase(migrated),
  ]);

  // Preserve anon key pointing to new id so we don't migrate again
  localStorage.setItem(ANON_ID_KEY, user.id);
  return migrated;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFingerprint() {
  const { fingerprint, status, setFingerprint, setStatus } = useFingerprintStore();
  const { user, loading: authLoading } = useAuth();
  const prevUserRef = useRef<User | null>(null);
  const bootstrappingRef = useRef(false);

  // Bootstrap: load fingerprint once auth state is resolved
  useEffect(() => {
    if (authLoading) return;
    if (bootstrappingRef.current) return;

    async function bootstrap() {
      bootstrappingRef.current = true;
      if (user) {
        // Signed in — check if this is a fresh sign-in (prev was null)
        const wasAnon = prevUserRef.current === null;

        if (wasAnon) {
          // Try migration first
          const migrated = await migrateAnonFingerprintToUser(user).catch(() => null);
          if (migrated) {
            setFingerprint(refreshDecay(migrated));
            return;
          }
        }

        // Try Supabase, fall back to IndexedDB, fall back to empty
        const remote = await loadFingerprintFromSupabase(user.id).catch(() => null);
        if (remote) {
          setFingerprint(refreshDecay(remote));
          return;
        }

        const local = await loadFingerprint(user.id).catch(() => null);
        if (local) {
          setFingerprint(refreshDecay(local));
          // Backfill remote if missing
          saveFingerprintToSupabase(local).catch(console.warn);
          return;
        }

        const empty = createEmptyFingerprint(user.id);
        setFingerprint(empty);
        setStatus('empty');
      } else {
        // Anonymous
        const anonId = getOrCreateAnonId();
        const local = await loadFingerprint(anonId).catch(() => null);
        if (local) {
          setFingerprint(refreshDecay(local));
        } else {
          const empty = createEmptyFingerprint(anonId);
          setFingerprint(empty);
          setStatus('empty');
        }
      }
    }

    bootstrap().finally(() => { bootstrappingRef.current = false; });
    prevUserRef.current = user;
    // Run only when auth resolves or user identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const recordResult = useCallback(
    (result: ExerciseResult) => {
      const fp = useFingerprintStore.getState().fingerprint;
      if (!fp) return;

      const node = conceptGraph.concepts.find((c) => c.id === result.conceptId);
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
      }

      setFingerprint(updated);
      saveFingerprint(updated).catch(console.warn);

      // Sync to Supabase if authenticated
      if (user) {
        saveFingerprintToSupabase(updated).catch(console.warn);
      }
    },
    [setFingerprint, user]
  );

  const refreshFingerprint = useCallback(() => {
    const fp = useFingerprintStore.getState().fingerprint;
    if (!fp) return;
    const refreshed = refreshDecay(fp);
    setFingerprint(refreshed);
    saveFingerprint(refreshed).catch(console.warn);
    if (user) {
      saveFingerprintToSupabase(refreshed).catch(console.warn);
    }
  }, [setFingerprint, user]);

  return { fingerprint, status, recordResult, refreshFingerprint };
}
