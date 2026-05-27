'use client'

import { useLevelContent } from '@/hooks/useLevelContent'

export function LevelFallbackBanner() {
  const { isComplete, fallbackMessage } = useLevelContent()

  if (isComplete || !fallbackMessage) return null

  return (
    <div
      role="status"
      className="rounded-[0.875rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-4 py-3 text-[13px] leading-relaxed text-[var(--nc-text-muted)]"
    >
      {fallbackMessage}
    </div>
  )
}
