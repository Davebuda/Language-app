'use client'

import Link from 'next/link'
import type { ElementType } from 'react'
import { BookOpen, BarChart2, Home, MessageCircle, User } from 'lucide-react'

export type NavTab = 'home' | 'session' | 'conversation' | 'progress' | 'profile'

const TABS: { id: NavTab; label: string; href: string; Icon: ElementType }[] = [
  { id: 'home',         label: 'Hjem',      href: '/dashboard',    Icon: Home },
  { id: 'session',      label: 'Lær',       href: '/session',      Icon: BookOpen },
  { id: 'conversation', label: 'Øv',        href: '/conversation', Icon: MessageCircle },
  { id: 'progress',     label: 'Fremgang',  href: '/progress',     Icon: BarChart2 },
  { id: 'profile',      label: 'Profil',    href: '/profile',      Icon: User },
]

export function BottomNav({ active }: { active: NavTab }) {
  return (
    <nav
      aria-label="Hovednavigasjon"
      className="fixed inset-x-0 bottom-0 z-40 px-1.5 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-1"
    >
      <div className="mx-auto flex w-full max-w-[23rem] items-center justify-around rounded-[0.65rem] border border-[var(--nc-border)] bg-[rgba(21,23,24,0.94)] p-1">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active
          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-[0.35rem] px-1 py-2 transition-colors ${
                isActive
                  ? 'bg-[var(--nc-signal-tint)] text-[var(--nc-signal)]'
                  : 'text-[var(--nc-text-dim)] hover:text-[var(--nc-text)]'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2.25 : 1.8} />
              <span className="text-[7px] font-bold uppercase tracking-[0.08em]">{label}</span>
              <span
                aria-hidden="true"
                className={`size-1 rounded-full ${isActive ? 'bg-[var(--nc-signal)]' : 'bg-transparent'}`}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
