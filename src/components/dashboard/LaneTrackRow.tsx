'use client'

import Link from 'next/link'
import type { ElementType } from 'react'
import {
  ArrowUpRight,
  BookOpenText,
  Check,
  MessageSquareText,
  NotebookPen,
  Sparkles,
  Theater,
  Zap,
} from 'lucide-react'
import type { LaneId } from '@/lib/lane-completion'

const LANE_CONFIG: Record<LaneId, { Icon: ElementType; name: string; href: string; accent: string }> = {
  session: {
    Icon: Zap,
    name: 'Økt',
    href: '/session',
    accent: 'var(--nc-signal)',
  },
  journal: {
    Icon: NotebookPen,
    name: 'Skriv',
    href: '/journal',
    accent: 'var(--nc-teal)',
  },
  conversation: {
    Icon: MessageSquareText,
    name: 'Snakk',
    href: '/conversation',
    accent: 'var(--nc-teal)',
  },
  roleplay: {
    Icon: Theater,
    name: 'Rollespill',
    href: '/roleplay',
    accent: 'var(--nc-teal)',
  },
  reading: {
    Icon: BookOpenText,
    name: 'Les',
    href: '/reading',
    accent: 'var(--nc-teal)',
  },
  listen: {
    Icon: MessageSquareText,
    name: 'Lytt',
    href: '/listen',
    accent: 'var(--nc-text-dim)',
  },
  drills: {
    Icon: MessageSquareText,
    name: 'Uttale',
    href: '/drills',
    accent: 'var(--nc-text-dim)',
  },
  shadow: {
    Icon: MessageSquareText,
    name: 'Skygging',
    href: '/shadow',
    accent: 'var(--nc-text-dim)',
  },
  uke: {
    Icon: Sparkles,
    name: 'Ukens sjekk',
    href: '/uke',
    accent: 'var(--nc-signal)',
  },
}

interface LaneTrackRowProps {
  laneId: LaneId
  hint: string
  done: boolean
  focusBadge?: boolean
}

export function LaneTrackRow({ laneId, hint, done, focusBadge }: LaneTrackRowProps) {
  const config = LANE_CONFIG[laneId]
  const Icon = config.Icon

  if (done) {
    return (
      <div className="rounded-[1.2rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(17,24,31,0.72)] p-4 text-[var(--nc-text)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--nc-text-dim)]">
            <Icon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[0.98rem] font-semibold text-[var(--nc-text)]">
                {config.name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--nc-green-border)] bg-[var(--nc-green-tint)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--nc-green)]">
                <Check size={10} />
                Fullført
              </span>
            </div>
            <p className="mt-1.5 text-[0.88rem] leading-6 text-[var(--nc-text-dim)]">
              {hint}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--nc-green-border)] bg-[var(--nc-green-tint)] text-[var(--nc-green)]">
            <Check size={16} aria-label="Fullført" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nc-glass-cream rounded-[1.25rem] p-4 transition-transform hover:-translate-y-[1px]">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[rgba(17,24,32,0.94)] text-white"
          style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 24px color-mix(in srgb, ${config.accent} 16%, transparent)` }}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[1rem] font-semibold text-[var(--nc-cream-text)]">
              {config.name}
            </span>
            {focusBadge ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(215,255,92,0.16)] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--nc-signal-fg)]">
                <Sparkles size={10} />
                Fokus
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 text-[0.88rem] leading-6 text-[var(--nc-cream-muted)]">
            {hint}
          </p>
        </div>

        <Link
          href={config.href}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--nc-signal)_0%,#c7f45d_100%)] text-[var(--nc-signal-fg)] shadow-[0_16px_28px_rgba(183,243,0,0.16)]"
          aria-label={`Åpne ${config.name}`}
        >
          <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  )
}
