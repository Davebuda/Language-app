'use client'

import { useRouter } from 'next/navigation'

export function GuestBanner() {
  const router = useRouter()

  return (
    <div className="nc-glass-cream flex items-center justify-between gap-3 px-3 py-2.5">
      <div>
        <p className="nc-label">Gjestemodus</p>
        <p className="mt-0.5 text-[0.78rem] text-[var(--nc-cream-muted)]">
          Fremgangen din lagres lokalt. Logg inn for å synkronisere.
        </p>
      </div>
      <button
        className="nc-button-dark whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold"
        onClick={() => router.push('/login')}
        aria-label="Logg inn for å synkronisere profil"
      >
        Logg inn
      </button>
    </div>
  )
}
