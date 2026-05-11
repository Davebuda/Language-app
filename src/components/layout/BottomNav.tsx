'use client'

import Link from 'next/link'
import { Home, BookOpen, MessageCircle, BarChart2, User } from 'lucide-react'

export type NavTab = 'home' | 'session' | 'conversation' | 'progress' | 'profile'

const TABS: { id: NavTab; label: string; href: string; Icon: React.ElementType }[] = [
  { id: 'home', label: 'Hjem', href: '/dashboard', Icon: Home },
  { id: 'session', label: 'Økt', href: '/session', Icon: BookOpen },
  { id: 'conversation', label: 'Samtale', href: '/conversation', Icon: MessageCircle },
  { id: 'progress', label: 'Fremgang', href: '/progress', Icon: BarChart2 },
  { id: 'profile', label: 'Profil', href: '/profile', Icon: User },
]

export function BottomNav({ active }: { active: NavTab }) {
  return (
    <nav className="border-t border-nc-border bg-nc-bg">
      <div className="mx-auto flex max-w-lg justify-around px-1 py-2">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = id === active
          return (
            <Link
              key={id}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              <Icon
                size={20}
                className={isActive ? 'text-nc-green' : 'text-[rgba(255,255,255,0.25)]'}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-semibold leading-none ${
                  isActive ? 'text-nc-green' : 'text-[rgba(255,255,255,0.25)]'
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
