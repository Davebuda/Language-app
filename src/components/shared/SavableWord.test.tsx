/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the notebook hook so we assert exactly what SavableWord hands saveItem,
// without touching IndexedDB / auth / the zustand store.
const saveItem = vi.fn()
vi.mock('@/hooks/useNotebook', () => ({
  useNotebook: () => ({
    items: [],
    status: 'ready',
    saveItem,
    updateItem: vi.fn(),
    removeItem: vi.fn(),
  }),
}))

import { SavableWord } from './SavableWord'

// jsdom has no matchMedia → useMediaQuery returns false → the desktop Radix
// Popover path renders; Radix mounts content only after the trigger is clicked.
async function openPopup(word: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: new RegExp(word) }))
  return user
}

describe('SavableWord', () => {
  beforeEach(() => {
    saveItem.mockClear()
  })

  it('renders the clickable trigger', () => {
    render(
      <SavableWord text="huset" source="reading">
        huset
      </SavableWord>,
    )
    // WordPopup wraps the trigger children in a real <button>.
    expect(screen.getByRole('button', { name: /huset/ })).toBeInTheDocument()
  })

  it('saves with norwegian=text, source, and verified=true for a corpus-resolved word', async () => {
    // conceptId 'noun-gender' resolves to a corpus rule → source 'corpus'.
    render(
      <SavableWord
        text="huset"
        source="okt"
        conceptId="noun-gender"
        sourceSentence="Jeg ser huset."
      >
        huset
      </SavableWord>,
    )
    const user = await openPopup('huset')
    await user.click(screen.getByRole('button', { name: 'Lagre i notatboka' }))

    expect(saveItem).toHaveBeenCalledTimes(1)
    const arg = saveItem.mock.calls[0][0]
    expect(arg.norwegian).toBe('huset')
    expect(arg.source).toBe('okt')
    expect(arg.type).toBe('word')
    expect(arg.conceptId).toBe('noun-gender')
    expect(arg.sourceSentence).toBe('Jeg ser huset.')
    // A corpus-resolved item is verified.
    expect(arg.verified).toBe(true)
  })

  it('saves verified=false and omits english (no fabrication) for an AI-only word', async () => {
    // No conceptId/errorTag → no corpus rule; only an AI 'why' → source 'ai'.
    render(
      <SavableWord
        text="greie"
        source="conversation"
        aiExplanation="kanskje «sak» eller «ting»"
      >
        greie
      </SavableWord>,
    )
    const user = await openPopup('greie')
    await user.click(screen.getByRole('button', { name: 'Lagre i notatboka' }))

    expect(saveItem).toHaveBeenCalledTimes(1)
    const arg = saveItem.mock.calls[0][0]
    expect(arg.norwegian).toBe('greie')
    expect(arg.source).toBe('conversation')
    expect(arg.verified).toBe(false)
    // No corpus english → english is never fabricated.
    expect(arg.english).toBeUndefined()
    // The AI 'why' is carried as the explanation.
    expect(arg.explanation).toBe('kanskje «sak» eller «ting»')
  })

  it('is idempotent — a second Save click does not save twice', async () => {
    render(
      <SavableWord text="huset" source="reading" conceptId="noun-gender">
        huset
      </SavableWord>,
    )
    const user = await openPopup('huset')
    const saveButton = screen.getByRole('button', { name: 'Lagre i notatboka' })
    await user.click(saveButton)
    await user.click(saveButton)
    expect(saveItem).toHaveBeenCalledTimes(1)
    // Saved state is reflected in the trigger.
    expect(screen.getByText('Lagret i notatboka')).toBeInTheDocument()
  })
})
