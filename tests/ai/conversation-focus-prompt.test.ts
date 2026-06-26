import { describe, it, expect } from 'vitest'
import { buildConversationPrompt } from '@/ai/prompts'

// Tier-2 Slice A — the prompt-level contract for diagnosis-aware Kari. When a focus
// concept is passed, the system prompt weaves a gentle steer toward it AND keeps the
// guardrails (never name the grammar point / never lecture). When none is passed, the
// prompt is unchanged from the general persona — Kari never invents a weak spot. This
// is a DISPLAY-ONLY steer; it shapes the chat and never moves mastery.

const MSGS = [{ role: 'user', content: 'Hei!' }]

describe('buildConversationPrompt — diagnosis-aware focus steer (Tier-2 Slice A)', () => {
  it('weaves a steer toward the focus concept, with the no-lecture guardrail', () => {
    const { system } = buildConversationPrompt(MSGS, 'B1', 'food', undefined, 'common-modal-verbs')
    expect(system).toContain('WHAT THIS LEARNER IS WORKING ON')
    // maps the conceptId to its human label, not the raw slug
    expect(system).toContain('modal verbs')
    // the honesty/feel guardrail must be present
    expect(system).toMatch(/NEVER name the grammar point/i)
  })

  it('adds NO focus section when no concept is passed (general persona unchanged)', () => {
    const { system } = buildConversationPrompt(MSGS, 'B1', 'food')
    expect(system).not.toContain('WHAT THIS LEARNER IS WORKING ON')
  })

  it('falls back to the raw conceptId when it has no label (still a safe steer)', () => {
    const { system } = buildConversationPrompt(MSGS, 'B1', 'food', undefined, 'word-formation')
    expect(system).toContain('WHAT THIS LEARNER IS WORKING ON')
    expect(system).toContain('word-formation')
  })
})
