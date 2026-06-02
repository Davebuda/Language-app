'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { ProductionWallView, BrickCellWeight } from '@/lib/production-wall'

// Brick weight → visual. Distinguished by FILL + TEXTURE, never colour alone
// (WCAG AA: legible in greyscale). production = solid; guided = solid + hatch;
// recognition = faint hatch; exposure = dashed outline; empty = faint.
const BRICK_STYLE: Record<BrickCellWeight, CSSProperties> = {
  production: { background: 'var(--nc-signal)' },
  guided: { background: 'repeating-linear-gradient(135deg, var(--nc-signal) 0 6px, rgba(13,13,19,0.34) 6px 8px)' },
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

// The detailed production meter (brick wall + full sprint) is opt-in — the two
// always-visible halves carry the daily summary; this remembers the drawer state.
const STORE_KEY = 'nc-today-detail'

function Brick({ weight }: { weight: BrickCellWeight }) {
  return <div className="h-5 rounded-[4px]" style={BRICK_STYLE[weight]} />
}

export interface ProductionWallProps {
  view: ProductionWallView
  /** Session call-to-action meta, e.g. "25 oppgaver · ca. 19 min". */
  sessionMeta: string
  /** Coach's one-line reason for today's focus (the "why"). */
  coachReason: string
  /** Where the start CTA navigates. */
  startHref?: string
}

/**
 * The unified "I dag" command card — merges the production meter and the
 * "Start dagens økt" hero into one block. Two always-visible tonal halves:
 * a dark STATUS zone (objective + today's production count + week-glance) and
 * a lime ACT zone (coach reason + start CTA). The detailed brick wall + labelled
 * weekly sprint live in an optional drawer so the production-honesty visual is
 * retained without a second competing block.
 *
 * Weight hierarchy (strategic, steep falloff): two anchors only — the production
 * number and "Start dagens økt" — everything else recedes.
 */
export function ProductionWall({ view, sessionMeta, coachReason, startHref = '/session' }: ProductionWallProps) {
  const reduce = useReducedMotion()
  const maxBar = Math.max(1, ...view.weekBars.map((b) => b.value))
  const sparkMax = maxBar

  // Detail drawer: default closed; first client render matches the server
  // (closed) → no hydration flash. Stored preference applied after mount.
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      setOpen(localStorage.getItem(STORE_KEY) === '1')
    } catch {
      // best-effort
    }
  }, [])
  const toggle = () =>
    setOpen((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORE_KEY, next ? '1' : '0')
      } catch {
        // ignore
      }
      return next
    })

  return (
    <section
      aria-label={`Dagens mål — ${view.heroCount} ${view.heroUnit}. Start dagens økt.`}
      className="overflow-hidden rounded-[0.65rem] bg-[var(--nc-card)] border border-[var(--nc-border)]"
    >
      {/* ── DARK half · STATUS ── */}
      <div className="px-3.5 pb-3.5 pt-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[var(--nc-signal-dim,#9ec01a)]">
            Dagens mål
          </span>
          <span className="rounded-[4px] border border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-[var(--nc-signal)]">
            {view.level}
          </span>
        </div>

        <h2 className="mt-1.5 text-balance text-[1rem] font-extrabold leading-tight tracking-[-0.03em] text-[var(--nc-text)]">
          {view.objectiveTitle}
        </h2>

        <div className="mt-3 flex items-end justify-between gap-3">
          {/* Anchor 1 — the production count */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[2.6rem] font-extrabold leading-[0.78] tracking-[-0.04em] tabular-nums text-[var(--nc-signal)]">
              {view.heroCount}
            </span>
            <span className="text-[10px] font-bold leading-[1.15] text-[var(--nc-text-muted)]">
              {view.heroUnit}
            </span>
          </div>

          {/* Week-drill glance — ambient proof, today lit */}
          <div className="flex items-center gap-1.5 pb-0.5" aria-hidden="true">
            <div className="flex h-[26px] items-end gap-[3px]">
              {view.weekBars.map((bar, i) => (
                <span
                  key={i}
                  className="block w-[6px] rounded-[2px]"
                  style={{
                    height: `${Math.max(3, Math.round((bar.value / sparkMax) * 22))}px`,
                    background: bar.live ? 'var(--nc-signal)' : 'rgba(200,255,32,0.20)',
                  }}
                />
              ))}
            </div>
            <span className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">uka</span>
          </div>
        </div>
      </div>

      {/* ── LIME half · ACT (the whole zone is the start CTA) ── */}
      <Link
        href={startHref}
        aria-label={`Start dagens økt — ${sessionMeta}`}
        className="block bg-[linear-gradient(135deg,#C8FF20_0%,#B8EF10_100%)] px-3.5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nc-text)] focus-visible:ring-inset"
      >
        {/* Whisper — justifies the button right before you press it */}
        <p className="mb-2.5 text-[9.5px] leading-[1.42] text-[rgba(10,18,6,0.56)]">«{coachReason}»</p>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {/* Anchor 2 — the start action */}
            <div className="text-[1.1rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--nc-signal-fg)]">
              Start dagens økt
            </div>
            <div className="mt-1 text-[9.5px] font-bold text-[rgba(10,18,6,0.6)]">{sessionMeta}</div>
          </div>
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[rgba(10,18,6,0.92)] text-white"
          >
            <ArrowRight size={15} />
          </span>
        </div>
      </Link>

      {/* ── Optional detail drawer · the full production meter ── */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="production-wall-detail"
        className="flex w-full items-center justify-between gap-2 border-t border-[var(--nc-border)] px-3.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--nc-signal)]"
      >
        <span className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-[var(--nc-text-dim)]">
          Produksjonsmur
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: 'easeOut' }}
          className="text-[var(--nc-text-dim)]"
        >
          <ChevronDown size={16} />
        </motion.span>
      </button>

      <motion.div
        id="production-wall-detail"
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 0.3, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
        aria-hidden={!open}
      >
        <div className="px-3.5 pb-3.5">
          {/* Secondary numbers the summary doesn't carry */}
          <div className="mb-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[var(--nc-text-dim)]">
            <span>
              <b className="font-bold text-[var(--nc-text)]">{view.speakingMinutes}</b> min snakket
            </span>
            {view.lexical && view.lexical.missed > 0 ? (
              <span>
                av <b className="font-bold text-[var(--nc-text)]">{view.lexical.missed}</b> ord du har bommet på
              </span>
            ) : !view.lexical && view.gapConceptCount > 0 ? (
              <span>
                produksjonsgap · <b className="font-bold text-[var(--nc-text)]">{view.gapConceptCount}</b>{' '}
                begrep{view.gapConceptCount === 1 ? '' : 'er'}
              </span>
            ) : null}
          </div>

          {/* Brick wall */}
          <div className="rounded-lg bg-[rgba(0,0,0,0.18)] p-2.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.13em] text-[var(--nc-text-dim)]">
                {view.wallCaption}
              </span>
              <span className="text-[10px] text-[var(--nc-text-muted)]">{view.wallNote}</span>
            </div>
            <div className="grid grid-cols-6 gap-[5px]">
              {view.bricks.map((cell, i) =>
                cell.landed && !reduce && open ? (
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

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[var(--nc-border)] pt-2.5">
              {LEGEND.filter((l) => l.weight !== 'guided' || view.legendShowsGuided).map((l) => (
                <span key={l.weight} className="flex items-center gap-1.5 text-[9.5px] text-[var(--nc-text-muted)]">
                  <span aria-hidden="true" className="size-[12px] shrink-0 rounded-[3px]" style={BRICK_STYLE[l.weight]} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* B2 honest interim */}
          {view.interim ? (
            <p className="mt-2.5 rounded-lg border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-2 text-[10px] leading-[1.45] text-[var(--nc-text-dim)]">
              {view.interim}
            </p>
          ) : null}

          {/* Labelled weekly sprint + rollup sentence */}
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
        </div>
      </motion.div>
    </section>
  )
}
