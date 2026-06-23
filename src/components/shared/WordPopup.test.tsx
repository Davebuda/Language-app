/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WordPopup } from './WordPopup'
import type { WordExplanation } from '@/lib/word-explanation'

// jsdom does not implement matchMedia → useMediaQuery returns false → the desktop
// Radix Popover path renders. Radix mounts the content only after the trigger is
// activated, so each test opens the popover first.

async function openPopup(word = 'huset') {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: word }))
  return user
}

describe('WordPopup', () => {
  it('renders the verified corpus rule as primary trusted content', async () => {
    const explanation: WordExplanation = {
      norwegian: 'huset',
      verified: { rule: 'Substantivkjønn', english: 'the house' },
      source: 'corpus',
    }
    render(
      <WordPopup word="huset" explanation={explanation}>
        huset
      </WordPopup>,
    )
    await openPopup()

    expect(screen.getByText('Regel')).toBeInTheDocument()
    expect(screen.getByText('Substantivkjønn')).toBeInTheDocument()
    expect(screen.getByText('the house')).toBeInTheDocument()
    // No AI suggestion + no honest-empty state on a corpus result.
    expect(screen.queryByText('Forslag')).not.toBeInTheDocument()
    expect(screen.queryByText('Ingen oppslag ennå')).not.toBeInTheDocument()
  })

  it('renders an AI suggestion under a clearly-marked "forslag" label', async () => {
    const explanation: WordExplanation = {
      norwegian: 'greie',
      aiSuggested: 'kanskje «sak» eller «ting»',
      source: 'ai',
    }
    render(
      <WordPopup word="greie" explanation={explanation}>
        greie
      </WordPopup>,
    )
    await openPopup('greie')

    expect(screen.getByText('Forslag')).toBeInTheDocument()
    expect(screen.getByText('kanskje «sak» eller «ting»')).toBeInTheDocument()
    // An AI-only result is not the honest-empty state.
    expect(screen.queryByText('Ingen oppslag ennå')).not.toBeInTheDocument()
  })

  it('renders the honest empty state for source "none"', async () => {
    const explanation: WordExplanation = {
      norwegian: 'xyz',
      source: 'none',
    }
    render(
      <WordPopup word="xyz" explanation={explanation}>
        xyz
      </WordPopup>,
    )
    await openPopup('xyz')

    expect(screen.getByText('Ingen oppslag ennå')).toBeInTheDocument()
    // Nothing fabricated.
    expect(screen.queryByText('Regel')).not.toBeInTheDocument()
    expect(screen.queryByText('Forslag')).not.toBeInTheDocument()
  })

  it('shows the Save button only when onSave is provided, and fires it', async () => {
    const explanation: WordExplanation = {
      norwegian: 'huset',
      verified: { rule: 'Substantivkjønn' },
      source: 'corpus',
    }
    const onSave = vi.fn()

    // Without onSave: open the popup, no Save button.
    const { unmount } = render(
      <WordPopup word="huset" explanation={explanation}>
        huset
      </WordPopup>,
    )
    await openPopup()
    expect(
      screen.queryByRole('button', { name: 'Lagre i notatboka' }),
    ).not.toBeInTheDocument()
    unmount()

    // With onSave: the Save button renders and fires its handler.
    render(
      <WordPopup word="huset" explanation={explanation} onSave={onSave}>
        huset
      </WordPopup>,
    )
    const user = await openPopup()
    const saveButton = screen.getByRole('button', { name: 'Lagre i notatboka' })
    expect(saveButton).toBeInTheDocument()
    await user.click(saveButton)
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
