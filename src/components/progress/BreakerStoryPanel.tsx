// The breaker story panel (T1.3, VC §2/§3.7): "what breaks your sentences" + a
// "Fikset" milestone. Presentational — all honesty lives in deriveBreakerStory.
import { TrendingDown, TrendingUp, Check, Minus } from 'lucide-react'
import type { BreakerStory } from '@/lib/breaker-story'

export function BreakerStoryPanel({ story }: { story: BreakerStory }) {
  return (
    <>
      <section className="rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] p-3">
        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Det som brekker setningene dine</div>
        {story.active.length > 0 ? (
          <div className="mt-2 flex flex-col gap-1.5">
            {story.active.slice(0, 5).map((b) => (
              <div key={b.conceptId} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[0.82rem] font-medium text-[var(--nc-text)]">{b.label}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[0.72rem] tabular-nums text-[var(--nc-text-muted)]">{b.thisWeek} denne uka</span>
                  {b.trend === 'down' ? (
                    <span className="flex items-center gap-0.5 text-[0.7rem] font-bold text-[var(--nc-green)]"><TrendingDown size={12} aria-hidden="true" /> bedre</span>
                  ) : b.trend === 'up' ? (
                    <span className="flex items-center gap-0.5 text-[0.7rem] font-bold text-[var(--nc-red)]"><TrendingUp size={12} aria-hidden="true" /> flere</span>
                  ) : b.trend === 'new' ? (
                    <span className="rounded-[0.25rem] border border-[var(--nc-border)] px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">ny</span>
                  ) : (
                    <Minus size={12} className="text-[var(--nc-text-dim)]" aria-hidden="true" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-pretty mt-2 text-[0.78rem] leading-5 text-[var(--nc-text-muted)]">
            Vi bygger kartet over hva som brekker setningene dine når du øver. Fullfør noen økter, så dukker mønstrene opp her.
          </p>
        )}
      </section>

      {story.retired.length > 0 ? (
        <div className="nc-glass-cream p-3">
          <div className="flex items-center gap-1.5">
            <Check size={13} className="text-[#3CB464]" aria-hidden="true" />
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Fikset</span>
          </div>
          <p className="text-pretty mt-1.5 text-[0.82rem] leading-5 text-[var(--nc-cream-text)]">
            Du har fikset: {story.retired.map((r) => r.label).join(', ')}.
          </p>
        </div>
      ) : null}
    </>
  )
}
