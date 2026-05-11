'use client'

import Link from 'next/link'
import { Home, BookOpen, MessageCircle, BarChart2, User } from 'lucide-react'

export type NavTab = 'home' | 'session' | 'conversation' | 'progress' | 'profile'

const TABS: { id: NavTab; label: string; href: string; Icon: React.ElementType }[] = [
  { id: 'home',         label: 'Hjem',     href: '/dashboard',    Icon: Home },
  { id: 'session',      label: 'Økt',      href: '/session',      Icon: BookOpen },
  { id: 'conversation', label: 'Samtale',  href: '/conversation', Icon: MessageCircle },
  { id: 'progress',     label: 'Fremgang', href: '/progress',     Icon: BarChart2 },
  { id: 'profile',      label: 'Profil',   href: '/profile',      Icon: User },
]

export function BottomNav({ active }: { active: NavTab }) {
  return (
    <nav
      className="border-t border-nc-border"
      style={{ background: 'rgba(245,246,250,0.94)', backdropFilter: 'blur(16px)' }}
    >
      <div className="mx-auto flex max-w-lg justify-around px-1 py-2">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active
          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              className="flex flex-col items-center gap-1 px-2 py-1"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  isActive ? 'bg-nc-dark' : ''
                }`}
              >
                <Icon
                  size={18}
                  className={isActive ? 'text-nc-green' : 'text-nc-text-muted'}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span
                className={`text-[9px] font-bold uppercase tracking-[0.07em] leading-none ${
                  isActive ? 'text-nc-dark' : 'text-nc-text-dim'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
