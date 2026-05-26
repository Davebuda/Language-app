'use client'

import Link from 'next/link'
import type { LaneId } from '@/lib/lane-completion'

const LANE_CONFIG: Record<LaneId, { icon: string; name: string; href: string }> = {
  session:      { icon: '⚡', name: 'Økt',        href: '/session' },
  journal:      { icon: '✏️', name: 'Skriv',      href: '/journal' },
  conversation: { icon: '🗣️', name: 'Snakk',     href: '/conversation' },
  roleplay:     { icon: '🎭', name: 'Rollespill', href: '/roleplay' },
  reading:      { icon: '📖', name: 'Les',        href: '/reading' },
}

interface LaneTrackRowProps {
  laneId: LaneId
  hint: string
  done: boolean
  focusBadge?: boolean
}

export function LaneTrackRow({ laneId, hint, done, focusBadge }: LaneTrackRowProps) {
  const config = LANE_CONFIG[laneId]

  return (
    <div
      className={[
        'flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3',
        done
          ? 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] opacity-50'
          : 'border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]',
      ].join(' ')}
    >
      <span className="text-lg" aria-hidden="true">{config.icon}</span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[var(--nc-text)]">{config.name}</span>
          {focusBadge && !done && (
            <span className="rounded-full border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-2 py-0.5 text-[8px] font-bold text-[var(--nc-red)]">
              fokus
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--nc-text-dim)] line-clamp-1">{hint}</p>
      </div>

      {done ? (
        <span className="text-[13px] font-bold text-[var(--nc-green)]" aria-label="Fullført">✓</span>
      ) : (
        <Link
          href={config.href}
          className="shrink-0 rounded-[0.5rem] border border-[rgba(255,255,255,0.16)] px-3 py-1.5 text-[12px] font-semibold text-[var(--nc-text)] hover:bg-[rgba(255,255,255,0.06)]"
          aria-label={`Åpne ${config.name}`}
        >
          Åpne
        </Link>
      )}
    </div>
  )
}
