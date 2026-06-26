'use client'

import { useState, useEffect } from 'react'
import { aiService } from '@/ai'
import { useAIStatusStore } from '@/stores/ai-status-store'
import type { CoachContext } from '@/ai/types'

// Tier-2 Slices D + B — Kari's coaching voice, the non-blocking way. Returns the
// `template` line INSTANTLY (first paint never waits), then, only if the AI is ready,
// fetches a warm Kari-voiced version and swaps it in. DISPLAY-ONLY: it narrates, it
// never moves mastery. When `cacheKey` is given the result is cached for the day, so a
// latency-sensitive surface (the dashboard home) calls the AI at most once per day and
// shows the cached line instantly on every later load — no flash, no repeat call. When
// the AI is down the template simply stays (honest offline fallback). Pass ctx=null to
// disable (e.g. before data has loaded).

function todayKey(): string {
  return new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD, matches lane-completion
}

export function useKariLine(ctx: CoachContext | null, template: string, cacheKey?: string): string {
  const [line, setLine] = useState(template)
  // AI initialises asynchronously (AILoader in the root layout). Subscribe to the
  // mode so that when it flips to ready AFTER this hook first mounted, the effect
  // re-runs and fetches — otherwise a first page load would be stuck on the template.
  const aiMode = useAIStatusStore((s) => s.aiMode)

  // Serialise the context so the effect only re-runs when the real inputs change,
  // not on every render (CoachContext is a fresh object literal each render).
  const ctxKey = ctx ? JSON.stringify(ctx) : null

  useEffect(() => {
    // Always show the latest template first (covers template updates, e.g. the focus
    // line resolving once the fingerprint loads).
    setLine(template)
    if (!ctx) return

    let cancelled = false
    const fullKey = cacheKey ? `norskcoach_kari_${cacheKey}_${todayKey()}` : null

    // Cached today → instant, no AI call, no flash.
    if (fullKey) {
      try {
        const cached = localStorage.getItem(fullKey)
        if (cached) { setLine(cached); return }
      } catch { /* ignore */ }
    }

    // Only spend an AI call when it can actually succeed; otherwise keep the template.
    if (!aiService.isReady()) return

    aiService.coachLine(ctx)
      .then((res) => {
        if (cancelled) return
        if (res.source === 'ai' && res.line) {
          setLine(res.line)
          if (fullKey) { try { localStorage.setItem(fullKey, res.line) } catch { /* ignore */ } }
        }
      })
      .catch(() => { /* keep template */ })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctxKey, template, cacheKey, aiMode])

  return line
}
