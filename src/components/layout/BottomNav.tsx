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
      className="border-t border-[rgba(255,255,255,0.08)] bg-[rgba(18,14,14,0.88)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active
          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center gap-0.5 px-1 ${
                isActive ? 'text-[var(--nc-red)]' : 'text-[var(--nc-text-muted)]'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.6} />
              <span className="text-[9px] font-semibold">{label}</span>
              <span
                aria-hidden="true"
                className={`h-[3px] w-[3px] rounded-full transition-opacity ${
                  isActive ? 'bg-[var(--nc-red)] opacity-100' : 'opacity-0'
                }`}
              />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
