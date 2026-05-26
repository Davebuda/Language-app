import Link from 'next/link'
import { ArrowRight, CheckCircle2, Target, Brain, Repeat } from 'lucide-react'

const STEPS = [
  {
    number: '1',
    icon: Target,
    title: 'Vi finner hullene',
    body: 'En kort diagnostisk test kartlegger nøyaktig hva du sliter med — ikke bare et nivå, men et fingeravtrykk over feilene dine.',
  },
  {
    number: '2',
    icon: Brain,
    title: 'Du øver målrettet',
    body: 'Hver økt bygges fra feilhistorikken din. Feil svar utløser en reparasjonssløyfe — forklaring, øving, nytt forsøk.',
  },
  {
    number: '3',
    icon: Repeat,
    title: 'Du mestrer konseptene',
    body: 'Konsepter låses opp i riktig rekkefølge. Fremgang er ekte — bevist gjennom gjentatt mestring, ikke gjetning.',
  },
] as const

const DIFFERENTIATORS = [
  {
    title: 'Personlig fra første økt',
    body: 'Ingen fast læreplan. Økten din bygges hver dag basert på hva du faktisk trenger å øve på.',
  },
  {
    title: 'Reparasjon, ikke repetisjon',
    body: 'Feil svar får en forklaring og målrettet øving — ikke bare "prøv igjen". Systemet forstår hvorfor du feiler.',
  },
  {
    title: 'Alt henger sammen',
    body: 'Samtale, skriving, lesing og øvinger deler samme hukommelse. Fremgangen din er synlig overalt.',
  },
  {
    title: 'Ukentlig fokus',
    body: 'Hver uke velger systemet 5 konsepter å jobbe med. Lørdag tester det hva du har lært.',
  },
] as const

const LANES = [
  { emoji: '⚡', label: 'Økt', desc: 'Daglig tilpasset trening' },
  { emoji: '🗣️', label: 'Samtale', desc: 'Snakk med AI-tutoren Kari' },
  { emoji: '✏️', label: 'Journal', desc: 'Skriv fritt på norsk' },
  { emoji: '🎭', label: 'Rollespill', desc: 'Øv i realistiske scenarier' },
  { emoji: '📖', label: 'Lesing', desc: 'Les tekster på ditt nivå' },
] as const

export default function HomePage() {
  return (
    <main className="nc-gradient-page min-h-dvh">

      {/* ── Header ── */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 shrink-0">
            <span className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-[var(--nc-text)]" />
            <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[var(--nc-text)]" />
            <span className="absolute left-0 bottom-0 h-2.5 w-2.5 rounded-full bg-[var(--nc-text)]" />
            <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full bg-[var(--nc-red)]" />
          </div>
          <span className="text-[0.72rem] font-bold tracking-[0.18em] text-[var(--nc-text)]">
            NORSKCOACH
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/onboarding"
            className="text-sm font-semibold text-[var(--nc-text)] underline-offset-4 hover:underline"
          >
            Kom i gang
          </Link>
          <Link
            href="/dashboard"
            className="hidden text-sm text-[var(--nc-text-muted)] hover:text-[var(--nc-text)] sm:block"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-10 md:pt-16">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--nc-teal-border)] bg-[var(--nc-teal-tint)] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--nc-teal)]" />
            <span className="text-[11px] font-bold tracking-[0.06em] text-[var(--nc-teal)]">
              GRATIS · ÅPEN TILGANG
            </span>
          </div>

          <h1 className="text-balance font-display text-[3rem] font-bold leading-[1.0] text-[var(--nc-text)] md:text-[4rem]">
            Din personlige
            <br />
            norsktrener.
            <br />
            <span className="text-[var(--nc-red)]">Hver dag.</span>
          </h1>

          <p className="mt-6 max-w-lg text-pretty text-[1.0625rem] leading-7 text-[var(--nc-text-muted)]">
            En coach som finner nøyaktig hva du sliter med, forklarer hvorfor det skjer,
            og fikser det med målrettet øving — ikke enda en leksjon.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/onboarding"
              className="nc-button-primary inline-flex min-h-[48px] items-center gap-2 px-6 py-3 text-sm font-bold"
            >
              Start gratis <ArrowRight size={15} />
            </Link>
            <Link
              href="/login"
              className="nc-button-dark inline-flex min-h-[48px] items-center gap-2 px-6 py-3 text-sm font-bold"
            >
              Logg inn
            </Link>
          </div>

          <div className="mt-6 flex items-center gap-2 text-[12px] text-[var(--nc-text-dim)]">
            <CheckCircle2 size={13} className="text-[var(--nc-green)]" />
            <span>Ingen fast læreplan — din pensum bygges daglig, bare for deg.</span>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-8">
          <div className="nc-label mb-2">Slik fungerer det</div>
          <h2 className="text-balance font-display text-[1.75rem] font-bold leading-tight text-[var(--nc-text)] md:text-[2.25rem]">
            Tre steg til mestring.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="nc-glass p-5">
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nc-red)] text-white">
                <step.icon size={16} />
              </div>
              <h3 className="text-balance font-display text-[1.15rem] font-bold text-[var(--nc-text)]">
                {step.title}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-[var(--nc-text-muted)]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Product preview — lanes ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-8">
          <div className="nc-label mb-2">Fem baner, én uke</div>
          <h2 className="text-balance font-display text-[1.75rem] font-bold leading-tight text-[var(--nc-text)] md:text-[2.25rem]">
            Alt du trenger — ingenting du ikke trenger.
          </h2>
          <p className="mt-3 max-w-lg text-[14px] text-[var(--nc-text-muted)]">
            Hver uke velger systemet 5 konsepter å fokusere på. Disse banene hjelper deg å øve fra alle vinkler.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LANES.map((lane) => (
            <div key={lane.label} className="nc-glass p-4 text-center">
              <div className="mb-2 text-2xl">{lane.emoji}</div>
              <div className="text-[14px] font-bold text-[var(--nc-text)]">{lane.label}</div>
              <div className="mt-1 text-[11px] text-[var(--nc-text-dim)]">{lane.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Dashboard preview ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="mx-auto max-w-md">
          <div className="nc-glass-elevated overflow-hidden">
            <div className="border-b border-[var(--nc-border)] px-5 py-4">
              <div className="nc-label mb-1">Dashboard</div>
              <div className="font-display text-[1.5rem] font-bold text-[var(--nc-text)]">
                God kveld, Astrid!
              </div>
              <p className="mt-1 text-[13px] text-[var(--nc-text-muted)]">Din trener anbefaler:</p>
            </div>

            <div className="p-5">
              <div className="nc-surface p-4">
                <div className="nc-label mb-2" style={{ color: 'rgba(17,17,16,0.42)' }}>ØKT · A1 · 18 MIN</div>
                <div className="mt-1 font-display text-[1.15rem] font-bold" style={{ color: '#040E08' }}>
                  Adjektivbøyning
                </div>
                <p className="mt-1 text-[12px]" style={{ color: 'rgba(17,17,16,0.52)' }}>
                  Fordi: Du feiler konsekvent på ubøyd form.
                </p>
                <div className="mt-3 flex gap-2">
                  <span className="rounded-full bg-[var(--nc-red-tint)] border border-[var(--nc-red-border)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--nc-red)]">
                    4 reparasjon
                  </span>
                  <span className="rounded-full bg-[var(--nc-teal-tint)] border border-[var(--nc-teal-border)] px-2.5 py-0.5 text-[10px] font-bold text-[var(--nc-teal)]">
                    2 nytt
                  </span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {['🗣️ Snakk · daglig rutine', '✏️ Skriv · journalprompt', '📖 Les · tekst på A1-nivå'].map((lane) => (
                  <div key={lane} className="flex items-center justify-between rounded-[0.5rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-[12px]">
                    <span className="text-[var(--nc-text-muted)]">{lane}</span>
                    <span className="text-[10px] text-[var(--nc-text-dim)]">Åpne</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What makes it different ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-8">
          <div className="nc-label mb-2">Hvorfor NorskCoach</div>
          <h2 className="text-balance font-display text-[1.75rem] font-bold leading-tight text-[var(--nc-text)] md:text-[2.25rem]">
            Ikke enda en app med faste leksjoner.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="flex items-start gap-3 nc-glass p-5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--nc-red-tint)] border border-[var(--nc-red-border)]">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--nc-red)]" />
              </div>
              <div>
                <div className="text-[14px] font-bold text-[var(--nc-text)]">{d.title}</div>
                <div className="mt-1 text-[12px] leading-5 text-[var(--nc-text-dim)]">{d.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20">
        <div className="nc-glass-elevated p-6 text-center md:p-10">
          <h2 className="font-display text-[1.75rem] font-extrabold leading-tight text-[var(--nc-text)] md:text-[2.25rem]">
            Klar til å lære norsk?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] text-[var(--nc-text-muted)]">
            Start med en kort diagnostisk test. Ingen registrering nødvendig — systemet tilpasser seg fra første økt.
          </p>
          <Link
            href="/onboarding"
            className="nc-button-primary mt-6 inline-flex min-h-[48px] items-center gap-2 px-8 py-3 text-sm font-bold"
          >
            Start gratis nå <ArrowRight size={15} />
          </Link>
          <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-[var(--nc-text-dim)]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-[var(--nc-green)]" />
              Helt gratis
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-[var(--nc-green)]" />
              Ingen registrering kreves
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-[var(--nc-green)]" />
              A1–B2 nivå
            </span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[var(--nc-border)] px-5 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-[11px] text-[var(--nc-text-dim)]">
          <div className="flex items-center gap-2 font-bold tracking-[0.12em]">
            <span className="h-2 w-2 rounded-full bg-[var(--nc-red)]" />
            NORSKCOACH
          </div>
          <nav aria-label="Bunntekst" className="flex items-center gap-5">
            <a href="/privacy" className="hover:text-[var(--nc-text)] transition-colors">Personvern</a>
            <a href="/terms" className="hover:text-[var(--nc-text)] transition-colors">Vilkår</a>
            <a href="/help/mobile-reset" className="hover:text-[var(--nc-text)] transition-colors">Hjelp</a>
            <a href="mailto:hei@pandoai.no" className="hover:text-[var(--nc-text)] transition-colors">Kontakt</a>
          </nav>
          <span>Lær. Forstå. Mestre.</span>
        </div>
      </footer>
    </main>
  )
}
