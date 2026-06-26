import { describe, it, expect } from 'vitest'
import { buildConversationFocus } from '@/lib/conversation-focus'
import type { MistakeFingerprint, ErrorLogEntry } from '@/types/fingerprint'

// Tier-2 Slice A: the focus that diagnosis-aware Kari steers toward must be gated at
// the SAME >=0.7 confidence the dashboard uses to name a root cause — so Kari never
// references a weak spot the engine has no real evidence for. >=3 of a single class
// → 0.7 (focus returned); 2 → 0.6 (null, mid-band); 0/none → null.

function err(tag: ErrorLogEntry['errorTag'], i: number): ErrorLogEntry {
  return { id: `e${i}`, conceptId: 'x', errorTag: tag, exerciseType: 'translation-to-norwegian', wrong: 'a', correct: 'b', timestamp: new Date().toISOString() }
}

function fpWith(errors: ErrorLogEntry[]): MistakeFingerprint {
  const now = new Date().toISOString()
  return {
    userId: 'u', currentLevel: 'B1', createdAt: now, updatedAt: now,
    diagnosticCompleted: true, sessionsCompleted: 3,
    conceptMastery: {}, recentErrors: errors, errorPatterns: {}, productionGap: {}, speakingMinutes: 0,
    inputProductionPreference: 'balanced', weeklyFocus: [], weekStartedAt: null, weeklySprintHistory: [],
  }
}

describe('buildConversationFocus — diagnosis-aware Kari (Tier-2 Slice A)', () => {
  it('returns the root-cause conceptId when a >=0.7 diagnosis fires', () => {
    const f = fpWith([err('modal-verb', 1), err('modal-verb', 2), err('modal-verb', 3)])
    expect(buildConversationFocus(f)).toBe('common-modal-verbs')
  })

  it('returns null at mid confidence (0.6) — Kari does not steer on a weak signal', () => {
    const f = fpWith([err('pronoun-choice', 1), err('pronoun-choice', 2)])
    expect(buildConversationFocus(f)).toBeNull()
  })

  it('returns null with no real signal (cold start) — never fabricates a weak spot', () => {
    expect(buildConversationFocus(fpWith([]))).toBeNull()
    expect(buildConversationFocus(null)).toBeNull()
    expect(buildConversationFocus(undefined)).toBeNull()
  })
})
