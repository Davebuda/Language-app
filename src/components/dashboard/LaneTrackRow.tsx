'use client'

import Link from 'next/link'
import type { ElementType } from 'react'
import {
  ArrowRight,
  BookOpenText,
  Check,
  Languages,
  MessageSquareText,
  NotebookPen,
  Sparkles,
  Theater,
  Zap,
} from 'lucide-react'
import type { LaneId } from '@/lib/lane-completion'

const LANE_CONFIG: Record<LaneId, { Icon: ElementType; name: string; href: string }> = {
  session: { Icon: Zap, name: 'Økt', href: '/session' },
  journal: { Icon: NotebookPen, name: 'Journal', href: '/journal' },
  conversation: { Icon: MessageSquareText, name: 'Snakk', href: '/conversation' },
  roleplay: { Icon: Theater, name: 'Rollespill', href: '/roleplay' },
  reading: { Icon: BookOpenText, name: 'Les', href: '/reading' },
  listen: { Icon: MessageSquareText, name: 'Lytt', href: '/listen' },
  drills: { Icon: MessageSquareText, name: 'Uttale', href: '/drills' },
  shadow: { Icon: MessageSquareText, name: 'Skygging', href: '/shadow' },
  uke: { Icon: Sparkles, name: 'Ukens sjekk', href: '/uke' },
  ord: { Icon: Languages, name: 'Bøyningsdrill', href: '/ord' },
}

interface LaneTrackRowProps {
  laneId: LaneId
  hint: string
  done: boolean
  focusBadge?: boolean
  isLast?: boolean
  /** Overrides the lane's default href (e.g. reading → /skriv at B1+). */
  href?: string
  /** Overrides the lane's default display name (e.g. reading → "Les og skriv" at B1+). */
  label?: string
}

export function LaneTrackRow({ laneId, hint, done, focusBadge, isLast, href, label }: LaneTrackRowProps) {
  const config = LANE_CONFIG[laneId]
  const Icon = config.Icon
  const destination = href ?? config.href
  const name = label ?? config.name

  if (done) {
    return (
      <div className={`flex items-center gap-2 px-1 py-[7px]${isLast ? '' : ' border-b border-[rgba(17,21,24,0.06)]'}`}>
        <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[0.35rem] bg-[rgba(60,180,100,0.12)] text-[#3CB464]">
          <Check size={12} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.82rem] font-semibold text-[var(--nc-cream-dim)] line-through">{name}</div>
          <div className="mt-px text-[0.68rem] text-[var(--nc-cream-dim)] truncate">{hint}</div>
        </div>
        <div className="text-[12px] text-[var(--nc-cream-dim)]">
          <Check size={12} />
        </div>
      </div>
    )
  }

  return (
    <Link
      href={destination}
      className={`flex items-center gap-2 rounded-[0.25rem] px-1 py-[7px] transition-colors hover:bg-[rgba(17,21,24,0.03)]${isLast ? '' : ' border-b border-[rgba(17,21,24,0.06)]'}`}
      aria-label={`Åpne ${name}`}
    >
      <div className="flex size-[30px] shrink-0 items-center justify-center rounded-[0.35rem] bg-[var(--nc-cream-text)] text-white">
        <Icon size={12} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[0.82rem] font-semibold text-[var(--nc-cream-text)]">{name}</span>
          {focusBadge ? <span className="size-1 rounded-full bg-[#7ABF00]" /> : null}
        </div>
        <div className="mt-px text-[0.68rem] text-[var(--nc-cream-muted)] truncate">{hint}</div>
      </div>
      <div className="shrink-0 text-[12px] text-[var(--nc-cream-dim)]">
        <ArrowRight size={14} />
      </div>
    </Link>
  )
}
