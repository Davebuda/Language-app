import Link from 'next/link'
import { StartButton } from '@/components/landing/StartButton'

export default function HomePage() {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0d0d14] text-white">
      {/* Green ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[500px]"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(168,239,106,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Top nav */}
      <nav className="relative flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="text-[13px] font-bold uppercase tracking-[0.15em] text-white/30">
          NorskCoach
        </span>
        <Link
          href="/dashboard"
          className="text-[13px] font-semibold text-white/40 transition-colors hover:text-white/70"
        >
          Logg inn
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-20 pt-8 text-center">
        <h1 className="mb-4 text-balance text-[36px] font-black leading-[1.1] tracking-tight sm:text-[44px]">
          Fluent Norwegian,{' '}
          <span className="text-nc-green">guided by AI.</span>
        </h1>
        <p className="mb-8 max-w-sm text-[15px] leading-relaxed text-white/45">
          En personlig coach som finner svakhetene dine, forklarer dem, og fikser dem med
          målrettet øvelse.
        </p>
        <StartButton />
      </div>

      {/* Feature cards */}
      <div className="relative mx-auto w-full max-w-lg px-6 pb-16">
        <div className="flex flex-col gap-3">
          {[
            {
              icon: '🧠',
              title: 'Diagnostiserer deg daglig',
              desc: 'Finner nøyaktig hva du sliter med og bygger en personlig plan.',
            },
            {
              icon: '🔁',
              title: 'Reparasjonsløkke',
              desc: 'Hvert feil svar forklares og drilles inn — aldri hoppet over.',
            },
            {
              icon: '📈',
              title: 'Konseptgraf',
              desc: 'Grammatikk i avhengighetsrekkefølge. Du bygger på solid grunn.',
            },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 rounded-2xl border border-white/6 bg-white/4 px-5 py-4"
            >
              <span className="mt-0.5 text-[20px]">{icon}</span>
              <div>
                <div className="mb-0.5 text-[13px] font-bold text-white/90">{title}</div>
                <div className="text-[12px] leading-relaxed text-white/40">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="relative pb-6 text-center text-[11px] text-white/15">
        © NorskCoach 2026
      </div>
    </main>
  )
}
