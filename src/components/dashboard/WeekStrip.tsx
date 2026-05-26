'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { MistakeFingerprint } from '@/types/fingerprint'
import { summarizeWeeklyProgress, type WeeklyProgressEntry } from '@/lib/weekly-progress'
import { getGraphForLevel } from '@/lib/concept-graph-loader'

// ── Day-dots helpers ────────────────────────────────────────────────────────

type DotState = 'filled' | 'today' | 'pending'

function computeDayDots(fp: MistakeFingerprint): DotState[] {
  if (!fp.weekStartedAt) {
    return ['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending']
  }
  const weekStart = new Date(fp.weekStartedAt)
  const today = new Date()
  const daysSince = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
  const lastSessionDay = fp.lastSessionAt
    ? Math.floor(
        (new Date(fp.lastSessionAt).getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000),
      )
    : -1

  return Array.from({ length: 7 }, (_, idx): DotState => {
    if (idx === daysSince) return 'today'
    if (idx === lastSessionDay && lastSessionDay >= 0 && lastSessionDay < daysSince) return 'filled'
    return 'pending'
  })
}

const DAY_LABELS = ['mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag', 'søndag'] as const

function DayDots({ fingerprint }: { fingerprint: MistakeFingerprint }) {
  const dotStates = computeDayDots(fingerprint)
  return (
    <div className="flex items-center gap-1.5" aria-label="Aktivitet denne uka">
      {dotStates.map((s, idx) => (
        <span
          key={idx}
          className={
            `size-1.5 rounded-full ` +
            (s === 'filled'
              ? 'bg-[var(--nc-teal)]'
              : s === 'today'
                ? 'ring-2 ring-[var(--nc-teal)] bg-transparent opacity-60'
                : 'bg-[var(--nc-border)]')
          }
          aria-label={DAY_LABELS[idx]}
        />
      ))}
    </div>
  )
}

// ── Days-active label ────────────────────────────────────────────────────────

function getDaysActiveLabel(fp: MistakeFingerprint): string {
  if (!fp.weekStartedAt) return ''
  const weekStart = new Date(fp.weekStartedAt)
  const elapsed = Math.floor((Date.now() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
  if (elapsed === 0) return 'Uka startet i dag'
  if (elapsed === 1) return '1 dag inn i uka'
  return `${elapsed} dager inn i uka`
}

// ── WeekStrip ────────────────────────────────────────────────────────────────

interface WeekStripProps {
  fingerprint: MistakeFingerprint
}

export function WeekStrip({ fingerprint }: WeekStripProps) {
  // Inactive: no weekly sprint has started yet — return null, no nag
  if (fingerprint.weekStartedAt === null) return null

  const graph = getGraphForLevel(fingerprint.currentLevel)

  const progressEntries = summarizeWeeklyProgress(fingerprint, graph)

  // Empty: sprint opened but no focus concepts found
  if (progressEntries.length === 0) {
    return (
      <section className="nc-glass px-4 py-3 mb-4" aria-label="Ukens fokus">
        <p className="text-[13px] text-[var(--nc-text-dim)]">Ukens fokus åpnes snart.</p>
      </section>
    )
  }

  // Active: full strip
  const daysActiveLabel = getDaysActiveLabel(fingerprint)

  return (
    <section className="nc-glass p-5 mb-4" aria-label="Ukens fokus">
      <header className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-display text-xl font-bold text-[var(--nc-text)] text-balance">
            Denne ukens fokus
          </h2>
          {daysActiveLabel && (
            <p className="text-[12px] text-[var(--nc-text-dim)] mt-0.5">{daysActiveLabel}</p>
          )}
        </div>
        <DayDots fingerprint={fingerprint} />
      </header>

      <ul className="flex flex-wrap gap-2 mb-4 list-none">
        {progressEntries.map((entry) => (
          <FocusChip key={entry.conceptId} entry={entry} />
        ))}
      </ul>

      <Link
        href="/uke"
        className="inline-flex items-center gap-2 rounded-[0.9rem] bg-[var(--nc-teal)] px-4 py-2.5 text-[13px] font-semibold text-[var(--nc-bg)]"
        aria-label="Ta ukens repetisjon"
      >
        Ta ukens repetisjon
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </section>
  )
}

// ── FocusChip ────────────────────────────────────────────────────────────────

function FocusChip({ entry }: { entry: WeeklyProgressEntry }) {
  const { label, deltaDecayed, attemptsThisWeek } = entry
  // Use a real minus sign for negatives; never punitive — the value itself is the signal.
  const deltaLabel =
    deltaDecayed > 0 ? `+${deltaDecayed}` : deltaDecayed < 0 ? `−${Math.abs(deltaDecayed)}` : '±0'
  const deltaColor =
    deltaDecayed > 0 ? 'var(--nc-teal)' : 'var(--nc-text-dim)'
  const attemptsLabel = attemptsThisWeek === 1 ? '1 forsøk' : `${attemptsThisWeek} forsøk`
  return (
    <li
      className="rounded-[0.75rem] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[13px] flex items-baseline gap-2 flex-wrap"
      aria-label={`${label}: ${deltaLabel} poeng, ${attemptsLabel} denne uka`}
    >
      <span className="font-medium text-[var(--nc-text)]">{label}</span>
      <span
        className="text-[11px] tabular-nums font-semibold"
        style={{ color: deltaColor }}
        aria-hidden="true"
      >
        {deltaLabel}
      </span>
      <span
        className="text-[11px] tabular-nums text-[var(--nc-text-dim)]"
        aria-hidden="true"
      >
        · {attemptsLabel}
      </span>
    </li>
  )
}
