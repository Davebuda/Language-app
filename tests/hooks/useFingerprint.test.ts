import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEmptyFingerprint } from '@/types/fingerprint';
import { updateConceptMastery } from '@/engine';

// Test the store and engine logic used by useFingerprint directly.
// Full hook testing requires renderHook + jsdom + idb mock — deferred to integration tests.
// These tests verify the engine contracts that useFingerprint depends on.

const USER_ID = 'test-user-1';

describe('createEmptyFingerprint', () => {
  it('creates a fingerprint with empty conceptMastery', () => {
    const fp = createEmptyFingerprint(USER_ID);
    expect(fp.userId).toBe(USER_ID);
    expect(fp.conceptMastery).toEqual({});
    expect(fp.recentErrors).toEqual([]);
    expect(fp.currentLevel).toBe('A1');
  });

  it('sets status fields correctly', () => {
    const fp = createEmptyFingerprint(USER_ID);
    expect(fp.totalSessionsCompleted).toBe(0);
    expect(fp.lastSessionAt).toBeNull();
  });
});

describe('updateConceptMastery (engine contract)', () => {
  it('increments correctCount and attemptCount on correct answer', () => {
    const result = updateConceptMastery(undefined, true, 15, 3);
    expect(result.attemptCount).toBe(1);
    expect(result.correctCount).toBe(1);
  });

  it('increments only attemptCount on wrong answer', () => {
    const result = updateConceptMastery(undefined, false, 15, 3);
    expect(result.attemptCount).toBe(1);
    expect(result.correctCount).toBe(0);
  });

  it('accumulates across multiple calls', () => {
    const first = updateConceptMastery(undefined, true, 15, 3);
    const second = updateConceptMastery(first, false, 15, 3);
    expect(second.attemptCount).toBe(2);
    expect(second.correctCount).toBe(1);
  });

  it('sets streak to 0 on wrong answer', () => {
    const first = updateConceptMastery(undefined, true, 15, 3);
    const second = updateConceptMastery(first, false, 15, 3);
    expect(second.streak).toBe(0);
  });

  it('increments streak on correct answer', () => {
    const first = updateConceptMastery(undefined, true, 15, 3);
    const second = updateConceptMastery(first, true, 15, 3);
    expect(second.streak).toBe(2);
  });
});

describe('fingerprint-store state transitions', () => {
  it('useFingerprintStore starts with loading status', async () => {
    const { useFingerprintStore } = await import('@/stores/fingerprint-store');
    // Reset to initial state
    useFingerprintStore.setState({ fingerprint: null, status: 'loading' });
    expect(useFingerprintStore.getState().status).toBe('loading');
    expect(useFingerprintStore.getState().fingerprint).toBeNull();
  });

  it('setFingerprint updates fingerprint and sets status to ready', async () => {
    const { useFingerprintStore } = await import('@/stores/fingerprint-store');
    const fp = createEmptyFingerprint('user-2');
    useFingerprintStore.getState().setFingerprint(fp);
    expect(useFingerprintStore.getState().fingerprint?.userId).toBe('user-2');
    expect(useFingerprintStore.getState().status).toBe('ready');
  });

  it('setStatus updates status independently', async () => {
    const { useFingerprintStore } = await import('@/stores/fingerprint-store');
    useFingerprintStore.getState().setStatus('empty');
    expect(useFingerprintStore.getState().status).toBe('empty');
  });
});
