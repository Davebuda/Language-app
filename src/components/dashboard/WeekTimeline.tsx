'use client'

import type { MistakeFingerprint } from '@/types/fingerprint'

type DotState = 'filled' | 'today' | 'pending' | 'check'

const DAY_LABELS = ['man', 'tir', 'ons', 'tor', 'fre', 'lør', 'søn'] as const

function computeDots(fp: MistakeFingerprint): DotState[] {
  if (!fp.weekStartedAt) {
    return Array(7).fill('pending') as DotState[]
  }
  const weekStart = new Date(fp.weekStartedAt)
  const today = new Date()
  const daysSince = Math.floor((today.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
  const lastSessionDay = fp.lastSessionAt
    ? Math.floor((new Date(fp.lastSessionAt).getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000))
    : -1

  return Array.from({ length: 7 }, (_, idx): DotState => {
    if (idx === 5) return idx === daysSince ? 'check' : (idx < daysSince ? 'filled' : 'check')
    if (idx === daysSince) return 'today'
    if (idx === lastSessionDay && lastSessionDay >= 0 && lastSessionDay < daysSince) return 'filled'
    if (idx < daysSince && idx === lastSessionDay) return 'filled'
    return 'pending'
  })
}

interface WeekTimelineProps {
  fingerprint: MistakeFingerprint
}

export function WeekTimeline({ fingerprint }: WeekTimelineProps) {
  if (!fingerprint.weekStartedAt) return null

  const dots = computeDots(fingerprint)
  const weekStart = new Date(fingerprint.weekStartedAt)
  const daysSince = Math.floor((Date.now() - weekStart.getTime()) / (24 * 60 * 60 * 1000))

  return (
    <div className="flex items-center gap-1" aria-label="Aktivitet denne uka">
      {dots.map((state, idx) => (
        <div key={idx} className="flex flex-col items-center gap-1">
          <span
            className={[
              'size-2 rounded-full transition-colors',
              state === 'filled' ? 'bg-[var(--nc-teal)]' : '',
              state === 'today' ? 'bg-[var(--nc-red)] ring-2 ring-[rgba(255,51,51,0.3)]' : '',
              state === 'check' ? 'bg-[var(--nc-teal)] opacity-40' : '',
              state === 'pending' ? 'bg-[rgba(255,255,255,0.08)]' : '',
            ].join(' ')}
            aria-label={`${DAY_LABELS[idx]}${state === 'today' ? ' (i dag)' : state === 'filled' ? ' (øvd)' : ''}`}
          />
          {idx === daysSince && (
            <span className="text-[7px] font-bold text-[var(--nc-red)]">
              {DAY_LABELS[idx]}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
