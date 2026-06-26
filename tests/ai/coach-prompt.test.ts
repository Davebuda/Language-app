import { describe, it, expect } from 'vitest'
import { buildCoachPrompt } from '@/ai/prompts'

// Tier-2 Slices D + B — the prompt contract for Kari's coaching voice. The system
// prompt must carry the honesty guard (only restate given facts, never claim mastery/
// progress) for EVERY kind, and each kind's user prompt must surface the real facts it
// was given so Kari narrates truth, not invention. This is a DISPLAY-ONLY line.

describe('buildCoachPrompt — Kari coaching voice (Tier-2 D+B)', () => {
  it('every kind carries the no-overclaim honesty guard + Bokmål + one-line rules', () => {
    const kinds = [
      buildCoachPrompt({ kind: 'session-intro', level: 'B1', focusLabel: 'noun gender' }),
      buildCoachPrompt({ kind: 'session-complete', level: 'B1', accuracyPct: 80, repairCount: 2, itemCount: 9 }),
      buildCoachPrompt({ kind: 'dashboard-focus', level: 'B1', focusLabel: 'noun gender', reasoning: 'errors cluster on gender' }),
    ]
    for (const { system } of kinds) {
      expect(system).toMatch(/NEVER claim the learner has mastered/i)
      expect(system).toMatch(/Norwegian Bokmål only/i)
      expect(system).toMatch(/ONE short line/i)
    }
  })

  it('session-intro names the focus and invites starting', () => {
    const { user } = buildCoachPrompt({ kind: 'session-intro', level: 'A2', focusLabel: 'modal verbs' })
    expect(user).toContain('modal verbs')
    expect(user).toMatch(/start/i)
  })

  it('session-complete surfaces the real outcome facts it was given', () => {
    const { user } = buildCoachPrompt({ kind: 'session-complete', level: 'B1', accuracyPct: 75, repairCount: 3, itemCount: 10, focusLabel: 'negation' })
    expect(user).toContain('75%')
    expect(user).toContain('3')
    expect(user).toContain('10')
    expect(user).toContain('negation')
    expect(user).toMatch(/do not overclaim/i)
  })

  it('dashboard-focus passes the focus + its reasoning through to be rephrased warmly', () => {
    const { user } = buildCoachPrompt({ kind: 'dashboard-focus', level: 'B2', focusLabel: 'adjective agreement', reasoning: 'article + adjective errors share a root' })
    expect(user).toContain('adjective agreement')
    expect(user).toContain('article + adjective errors share a root')
  })
})
