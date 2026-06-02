'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { CSSProperties } from 'react'
import type { ProductionWallView, BrickCellWeight } from '@/lib/production-wall'

// Brick weight → visual. Distinguished by FILL + TEXTURE, never colour alone
// (WCAG AA: legible in greyscale). production = solid; guided = solid + corner
// notch; recognition = hatch; exposure = dashed outline; empty = faint.
const BRICK_STYLE: Record<BrickCellWeight, CSSProperties> = {
  // production = clean solid (strongest, full credit).
  production: { background: 'var(--nc-signal)' },
  // guided = scaffolded → lime with a dark diagonal hatch. Distinct from solid
  // production in GREYSCALE (texture, not colour) and reads as the lesser weight.
  guided: { background: 'repeating-linear-gradient(135deg, var(--nc-signal) 0 6px, rgba(13,13,19,0.34) 6px 8px)' },
  // recognition = faint lime hatch on dark (mostly dark — clearly below production).
  recognition: {
    background: 'repeating-linear-gradient(135deg, rgba(200,255,32,0.16) 0 3px, transparent 3px 6px)',
    border: '1px solid rgba(200,255,32,0.20)',
  },
  exposure: { background: 'transparent', border: '1px dashed rgba(237,238,233,0.22)' },
  empty: { background: 'rgba(255,255,255,0.04)' },
}

const LEGEND: { weight: BrickCellWeight; label: string }[] = [
  { weight: 'production', label: 'Produksjon' },
  { weight: 'guided', label: 'Med stillas' },
  { weight: 'recognition', label: 'Gjenkjenning' },
  { weight: 'exposure', label: 'Eksponering' },
]

function Brick({ weight }: { weight: BrickCellWeight }) {
  return <div className="h-5 rounded-[4px]" style={BRICK_STYLE[weight]} />
}

export function ProductionWall({ view }: { view: ProductionWallView }) {
  const reduce = useReducedMotion()
  const maxBar = Math.max(1, ...view.weekBars.map((b) => b.value))

  return (
    <section
      aria-label={`${view.wallCaption} — ${view.heroCount} ${view.heroUnit}`}
      className="overflow-hidden rounded-[0.65rem] bg-[var(--nc-card)] border border-[var(--nc-border)] p-3"
    >
      {/* ── Objective + hero ── */}
      <div className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-signal-dim,#9ec01a)]">
        {view.objectiveKicker}
      </div>
      <h2 className="mt-1.5 text-balance text-[1.25rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--nc-text)]">
        {view.objectiveTitle}
      </h2>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[3.25rem] font-extrabold leading-[0.8] tracking-[-0.04em] tabular-nums text-[var(--nc-signal)]">
          {view.heroCount}
        </span>
        <span className="text-[11px] font-bold text-[var(--nc-text-muted)]">{view.heroUnit}</span>
        <span className="ml-auto text-right text-[10px] leading-[1.5] tabular-nums text-[var(--nc-text-dim)]">
          <b className="font-bold text-[var(--nc-text)]">{view.speakingMinutes}</b> min snakket
          {!view.lexical && view.gapConceptCount > 0 ? (
            <>
              <br />
              produksjonsgap · <b className="font-bold text-[var(--nc-text)]">{view.gapConceptCount}</b>{' '}
              begrep{view.gapConceptCount === 1 ? '' : 'er'}
            </>
          ) : null}
        </span>
      </div>

      {/* B2 lexical denominator — honest "of N you've missed", full-width to avoid the hero-row squeeze */}
      {view.lexical && view.lexical.missed > 0 ? (
        <div className="mt-1 text-[10px] text-[var(--nc-text-dim)]">
          av <b className="font-bold text-[var(--nc-text)]">{view.lexical.missed}</b> ord du har bommet på
        </div>
      ) : null}

      {/* ── Brick wall ── */}
      <div className="mt-3 rounded-lg bg-[rgba(0,0,0,0.18)] p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-[var(--nc-text-dim)]">
            {view.wallCaption}
          </span>
          <span className="text-[10px] text-[var(--nc-text-muted)]">{view.wallNote}</span>
        </div>
        <div className="grid grid-cols-6 gap-[5px]">
          {view.bricks.map((cell, i) =>
            cell.landed && !reduce ? (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <Brick weight={cell.weight} />
              </motion.div>
            ) : (
              <Brick key={i} weight={cell.weight} />
            ),
          )}
        </div>

        {/* ── Legend (fill+texture, greyscale-safe) ── */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[var(--nc-border)] pt-2.5">
          {LEGEND.filter((l) => l.weight !== 'guided' || view.legendShowsGuided).map((l) => (
            <span key={l.weight} className="flex items-center gap-1.5 text-[9.5px] text-[var(--nc-text-muted)]">
              <span
                aria-hidden="true"
                className="size-[12px] shrink-0 rounded-[3px]"
                style={BRICK_STYLE[l.weight]}
              />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* ── B2 honest interim ── */}
      {view.interim ? (
        <p className="mt-2.5 rounded-lg border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-2 text-[10px] leading-[1.45] text-[var(--nc-text-dim)]">
          {view.interim}
        </p>
      ) : null}

      {/* ── Weekly sprint strip ── */}
      <div className="mt-2.5">
        <div className="mb-2 text-[9px] font-extrabold uppercase tracking-[0.13em] text-[var(--nc-text-dim)]">
          {view.rollupLabel}
        </div>
        <div className="flex h-[46px] items-end gap-1.5">
          {view.weekBars.map((bar, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-[5px]">
              <div
                className="w-full rounded-[3px]"
                style={{
                  height: `${Math.max(6, Math.round((bar.value / maxBar) * 34))}px`,
                  background: bar.live ? 'var(--nc-signal)' : 'rgba(200,255,32,0.20)',
                }}
              />
              <span
                className="text-[8.5px] uppercase tracking-[0.04em]"
                style={{
                  color: bar.live ? 'var(--nc-signal)' : 'var(--nc-text-dim)',
                  fontWeight: bar.live ? 800 : 400,
                }}
              >
                {bar.weekday}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[10.5px] leading-[1.45] text-[var(--nc-text-muted)]">{view.rollupDetail}</p>
      </div>
    </section>
  )
}
