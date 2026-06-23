'use client'

import { Check } from 'lucide-react'
import { THEMES, type ThemeName } from '@/lib/theme'

/**
 * Presentational theme chooser shared by onboarding and profile. Each card
 * previews its OWN theme's palette (base · signal · surface · mastery) — not the
 * currently-active theme — so the swatches stay accurate regardless of context.
 */
export function ThemePicker({
  value,
  onSelect,
}: {
  value: ThemeName
  onSelect: (theme: ThemeName) => void
}) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Velg tema">
      {THEMES.map((t) => {
        const active = value === t.id
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(t.id)}
            className="flex min-h-[56px] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors"
            style={{
              borderColor: active ? 'var(--nc-signal-border)' : 'var(--nc-border)',
              background: active ? 'var(--nc-signal-tint)' : 'rgba(255,255,255,0.04)',
            }}
          >
            <span
              className="flex shrink-0 overflow-hidden rounded-md border"
              style={{ borderColor: 'var(--nc-border-strong)' }}
              aria-hidden
            >
              {[t.swatch.bg, t.swatch.signal, t.swatch.surface, t.swatch.honey].map((c, i) => (
                <span key={i} className="size-6" style={{ background: c }} />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9rem] font-bold text-[var(--nc-text)]">{t.label}</span>
              <span className="mt-0.5 block text-[0.72rem] leading-snug text-[var(--nc-text-muted)]">
                {t.tagline}
              </span>
            </span>
            <span
              className="flex size-5 shrink-0 items-center justify-center rounded-full border"
              style={{
                borderColor: active ? 'var(--nc-signal)' : 'var(--nc-border-strong)',
                background: active ? 'var(--nc-signal)' : 'transparent',
              }}
              aria-hidden
            >
              {active ? <Check size={13} strokeWidth={3} style={{ color: 'var(--nc-signal-fg)' }} /> : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
