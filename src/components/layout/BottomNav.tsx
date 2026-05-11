'use client'

import Link from 'next/link'
import type { ElementType } from 'react'
import { BookOpen, BarChart2, Home, MessageCircle, User } from 'lucide-react'

export type NavTab =
  | 'home'
  | 'session'
  | 'conversation'
  | 'progress'
  | 'profile'

const TABS: {
  id: NavTab
  label: string
  href: string
  Icon: ElementType
}[] = [
  { id: 'home', label: 'Home', href: '/dashboard', Icon: Home },
  { id: 'session', label: 'Learn', href: '/session', Icon: BookOpen },
  { id: 'conversation', label: 'Practice', href: '/conversation', Icon: MessageCircle },
  { id: 'progress', label: 'Progress', href: '/progress', Icon: BarChart2 },
  { id: 'profile', label: 'Profile', href: '/profile', Icon: User },
]

export function BottomNav({ active }: { active: NavTab }) {
  return (
    <nav
      className="border-t border-nc-border"
      style={{ background: 'rgba(251,247,241,0.96)' }}
    >
      <div className="mx-auto flex max-w-lg justify-around px-2 py-2.5">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active

          return (
            <Link
              key={id}
              href={href}
              aria-label={label}
              className="flex min-w-[56px] flex-col items-center gap-1 px-1 py-1"
            >
              <Icon
                size={18}
                className={isActive ? 'text-nc-text' : 'text-nc-text-dim'}
                strokeWidth={isActive ? 2.15 : 1.7}
              />
              <span
                className={`text-[9px] font-medium tracking-[0.01em] ${
                  isActive ? 'text-nc-text' : 'text-nc-text-dim'
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
