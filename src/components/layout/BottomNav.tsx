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
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3"
    >
      <div className="mx-auto flex w-full max-w-[23rem] items-center justify-around gap-1 rounded-[1.8rem] border border-[rgba(255,255,255,0.16)] bg-[rgba(13,18,24,0.78)] p-2.5 shadow-[0_30px_80px_rgba(16,22,29,0.24)] backdrop-blur-[26px]">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active
          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 rounded-[1.2rem] px-2 py-2 transition-colors ${
                isActive
                  ? 'bg-[rgba(215,255,92,0.24)] text-[var(--nc-signal-fg)]'
                  : 'text-white/44 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.25 : 1.8} />
              <span className="text-[9px] font-semibold uppercase tracking-[0.1em]">{label}</span>
              <span
                aria-hidden="true"
                className={`h-[4px] w-[4px] rounded-full transition-opacity ${
                  isActive ? 'bg-[var(--nc-signal-fg)] opacity-100' : 'opacity-0'
                }`}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
