'use client'

import { useRouter } from 'next/navigation'

export function GuestBanner() {
  const router = useRouter()
  return (
    <div className="flex items-center justify-between rounded-[14px] bg-nc-repair-bg border border-nc-repair-border px-3 py-2 text-[11px]">
      <span className="text-nc-text-muted">
        👤 Fremgangen din lagres lokalt.
      </span>
      <button
        className="font-bold text-nc-coral hover:opacity-70 transition-opacity"
        onClick={() => router.push('/login')}
        aria-label="Logg inn for å lagre fremgang"
      >
        Logg inn →
      </button>
    </div>
  )
}
