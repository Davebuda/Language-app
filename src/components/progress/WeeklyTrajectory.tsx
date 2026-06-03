'use client'

import { motion } from 'framer-motion'
import type { WeeklySprintRecord } from '@/types/fingerprint'

interface WeeklyTrajectoryProps {
  history: WeeklySprintRecord[]
}

interface WeekSlice {
  label: string
  avgEndScore: number
  checkScore: number | null
  graduatedCount: number
  weekIndex: number
}

function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate)
  const day = d.getDate()
  const month = d.getMonth() + 1
  return `${day}.${month}`
}

function computeAvgEndScore(record: WeeklySprintRecord): number {
  // focusOutcomes is nested inside a weeklySprintHistory record; a record
  // persisted under an older schema may lack it, which normalizeFingerprint
  // (shallow, top-level only) does not repair. Guard so a returning user with
  // a legacy closed week doesn't crash the progress page.
  const outcomes = Object.values(record.focusOutcomes ?? {})
  if (outcomes.length === 0) return 0
  const sum = outcomes.reduce((acc, o) => acc + (o.endScore ?? 0), 0)
  return Math.round(sum / outcomes.length)
}

export function WeeklyTrajectory({ history }: WeeklyTrajectoryProps) {
  // Newest-first in the array; we want oldest-to-newest left-to-right, max 8
  const slices: WeekSlice[] = history
    .slice(0, 8)
    .reverse()
    .map((record, i) => ({
      label: formatWeekLabel(record.weekStartedAt),
      avgEndScore: computeAvgEndScore(record),
      checkScore: record.checkResult ? Math.round(record.checkResult.score) : null,
      graduatedCount: Object.values(record.focusOutcomes ?? {}).filter((o) => o.graduated).length,
      weekIndex: i,
    }))

  if (slices.length === 0) {
    return (
      <div className="nc-glass-elevated p-4">
        <p className="text-[0.8125rem] text-[var(--nc-text-dim)] text-center py-2">
          Fullført din første uke for å se fremgangen din her.
        </p>
      </div>
    )
  }

  // Column width adapts: on 375px with 8 columns each column is ~36px
  const columnWidthClass = 'flex-1 min-w-0'

  return (
    <div className="nc-glass-elevated p-4">
      {/* Section label */}
      <div className="nc-label mb-3">
        Ukentlig fremgang
      </div>

      {/* Bar chart */}
      <div
        className="flex items-end gap-1.5"
        role="list"
        aria-label="Ukentlig fremgang per uke"
      >
        {slices.map((slice) => {
          // Bar height: scale avgEndScore (0–100) to max 80px visual height
          const barHeightPx = Math.max(4, Math.round((slice.avgEndScore / 100) * 80))

          return (
            <div
              key={slice.weekIndex}
              className={`${columnWidthClass} flex flex-col items-center gap-1`}
              role="listitem"
            >
              {/* Graduated badge — above everything */}
              <div className="h-4 flex items-center justify-center">
                {slice.graduatedCount > 0 && (
                  <span
                    className="rounded-full px-1.5 py-px text-[0.5625rem] font-semibold leading-none"
                    style={{
                      backgroundColor: 'var(--nc-green-tint)',
                      color: 'var(--nc-green)',
                      border: '1px solid var(--nc-green-border)',
                    }}
                    aria-label={`${slice.graduatedCount} konsept${slice.graduatedCount !== 1 ? 'er' : ''} fullført`}
                  >
                    +{slice.graduatedCount}
                  </span>
                )}
              </div>

              {/* Bar track + animated fill + check dot */}
              <div
                className="relative w-full rounded-sm overflow-visible"
                style={{
                  height: '80px',
                  backgroundColor: 'var(--nc-signal-tint)',
                  borderRadius: '3px',
                }}
                aria-label={`Uke ${slice.label}: gjennomsnittlig score ${slice.avgEndScore}%${slice.checkScore !== null ? `, ukesjekk ${slice.checkScore}%` : ''}`}
              >
                {/* Animated bar fill — grows from bottom */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 rounded-sm"
                  style={{ backgroundColor: 'var(--nc-signal)', borderRadius: '3px' }}
                  initial={{ height: 0 }}
                  animate={{ height: `${barHeightPx}px` }}
                  transition={{
                    duration: 0.55,
                    ease: 'easeOut',
                    delay: slice.weekIndex * 0.06,
                  }}
                />

                {/* Check result dot — teal, sits at the top edge of the bar */}
                {slice.checkScore !== null && (
                  <motion.div
                    className="absolute left-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      width: '7px',
                      height: '7px',
                      backgroundColor: 'var(--nc-teal)',
                      boxShadow: '0 0 6px var(--nc-teal)',
                      bottom: `${barHeightPx - 3}px`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: slice.weekIndex * 0.06 + 0.4,
                      ease: 'easeOut',
                    }}
                    aria-label={`Ukesjekk: ${slice.checkScore}%`}
                  />
                )}
              </div>

              {/* Score label */}
              <span
                className="tabular-nums text-center leading-none"
                style={{
                  fontSize: '0.5625rem',
                  color: 'var(--nc-text-muted)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {slice.avgEndScore > 0 ? `${slice.avgEndScore}` : '—'}
              </span>

              {/* Week date label */}
              <span
                className="text-center leading-none truncate w-full"
                style={{
                  fontSize: '0.5625rem',
                  color: 'var(--nc-text-dim)',
                }}
              >
                {slice.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: 'var(--nc-signal)' }}
          />
          <span style={{ fontSize: '0.625rem', color: 'var(--nc-text-dim)' }}>
            Gjennomsnittlig score
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--nc-teal)' }}
          />
          <span style={{ fontSize: '0.625rem', color: 'var(--nc-text-dim)' }}>
            Ukesjekk
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="rounded-full px-1.5 py-px"
            style={{
              fontSize: '0.5625rem',
              backgroundColor: 'var(--nc-green-tint)',
              color: 'var(--nc-green)',
              border: '1px solid var(--nc-green-border)',
            }}
          >
            +1
          </div>
          <span style={{ fontSize: '0.625rem', color: 'var(--nc-text-dim)' }}>
            Fullførte konsepter
          </span>
        </div>
      </div>
    </div>
  )
}
