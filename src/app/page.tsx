import { DiagnosticHero } from '@/components/landing/diagnostic-hero'
import { ValueProps } from '@/components/landing/value-props'
import { WaitlistForm } from '@/components/landing/waitlist-form'

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden" style={{ backgroundColor: '#09090e' }}>
      {/* Ambient glow — top center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(59,130,246,0.13) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-5 pb-24 pt-20 sm:px-8 sm:pt-28 lg:pt-36">
        {/* Wordmark */}
        <div className="mb-10 flex items-center gap-2.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500"
            style={{ boxShadow: '0 0 12px rgba(59,130,246,0.8)' }}
          />
          <span className="text-sm font-semibold tracking-widest text-foreground-muted uppercase">
            NorskCoach
          </span>
        </div>

        <DiagnosticHero />

        <WaitlistForm />

        <ValueProps />
      </div>

      {/* Bottom fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
        style={{
          background: 'linear-gradient(to top, #09090e 0%, transparent 100%)',
        }}
      />
    </main>
  )
}
