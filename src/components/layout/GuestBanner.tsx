'use client'

import { useRouter } from 'next/navigation'

export function GuestBanner() {
  const router = useRouter()

  return (
    <div className="nc-panel-soft flex items-center justify-between gap-3 px-4 py-3">
      <div>
        <p className="nc-label">Guest mode</p>
        <p className="mt-1 text-sm text-nc-text-muted">
          Fremgangen din lagres lokalt. Logg inn for å synkronisere.
        </p>
      </div>
      <button
        className="rounded-[0.8rem] border border-nc-border bg-white px-3 py-2 text-xs font-medium text-nc-text transition-colors hover:border-nc-text/20"
        onClick={() => router.push('/login')}
      >
        Logg inn
      </button>
    </div>
  )
}
