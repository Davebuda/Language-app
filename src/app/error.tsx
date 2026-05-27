'use client'

import Link from 'next/link'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div
        className="w-full max-w-sm rounded-2xl border p-10 text-center"
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderColor: 'rgba(255,255,255,0.08)',
          fontFamily: "'Schibsted Grotesk', sans-serif",
        }}
      >
        <div
          className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
          style={{
            backgroundColor: 'rgba(255, 106, 85, 0.12)',
            border: '1px solid rgba(255, 106, 85, 0.28)',
            color: 'var(--nc-red)',
          }}
        >
          !
        </div>
        <h1
          className="mb-3 text-xl font-bold"
          style={{ color: 'var(--nc-text)' }}
        >
          Noe gikk galt
        </h1>
        <p
          className="mb-8 text-sm leading-relaxed"
          style={{ color: 'var(--nc-text-muted)' }}
        >
          En feil oppstod. Prøv å laste siden på nytt.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={reset}
            className="min-h-[44px] w-full rounded-[var(--radius)] px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: 'var(--nc-red)' }}
          >
            Prøv igjen
          </button>
          <Link
            href="/dashboard"
            className="text-sm transition-opacity hover:opacity-80"
            style={{ color: 'var(--nc-text-muted)' }}
          >
            Tilbake til dashbordet
          </Link>
        </div>
      </div>
    </div>
  )
}
