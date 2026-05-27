import Link from 'next/link'
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  CalendarCheck2,
  MessageSquareText,
  NotebookPen,
  Sparkles,
  Theater,
  WandSparkles,
  Zap,
} from 'lucide-react'

const LIVE_SURFACES = [
  { title: 'Adaptive økter', meta: 'AI valgt', Icon: Zap, accent: 'signal' },
  { title: 'Samtale med Kari', meta: 'Voice', Icon: MessageSquareText, accent: 'teal' },
  { title: 'Skrivejournal', meta: 'Coach', Icon: NotebookPen, accent: 'teal' },
  { title: 'Rollespill', meta: 'Scene', Icon: Theater, accent: 'teal' },
  { title: 'Lesestudio', meta: 'Input', Icon: BookOpenText, accent: 'teal' },
  { title: 'Ukens sjekk', meta: 'Sprint', Icon: CalendarCheck2, accent: 'signal' },
] as const

const SYSTEM_STEPS = [
  {
    number: '01',
    title: 'Kartlegg mønsteret',
    body: 'Diagnose, feil og ukesjekk blir til én levende læringsprofil.',
  },
  {
    number: '02',
    title: 'Velg neste beste handling',
    body: 'Dashbordet peker på én klar handling i stedet for å bli et modularkiv.',
  },
  {
    number: '03',
    title: 'Press det inn i ekte bruk',
    body: 'Økt, snakk, skriv, les og rollespill drar i samme retning.',
  },
] as const

export default function HomePage() {
  return (
    <main className="nc-gradient-page min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 grid-cols-2 gap-1.5 rounded-[1rem] bg-[rgba(255,255,255,0.5)] p-1.5 shadow-[0_14px_30px_rgba(16,22,29,0.08)]">
            <span className="rounded-full bg-[var(--nc-cream-text)]" />
            <span className="rounded-full bg-[var(--nc-cream-text)]" />
            <span className="rounded-full bg-[var(--nc-cream-text)]" />
            <span className="rounded-full bg-[var(--nc-signal)]" />
          </div>
          <div>
            <div className="text-[0.72rem] font-bold tracking-[0.18em] text-[var(--nc-cream-text)]">
              NORSKCOACH
            </div>
            <div className="text-[0.68rem] uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
              AI learning system
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="text-[var(--nc-cream-muted)] transition-colors hover:text-[var(--nc-cream-text)]"
          >
            Dashbord
          </Link>
          <Link
            href="/onboarding"
            className="rounded-full bg-[rgba(17,24,32,0.94)] px-4 py-2.5 font-semibold text-white"
          >
            Start
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-20 pt-4 md:pt-10">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(215,255,92,0.18)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-signal-fg)]">
                <Sparkles size={12} />
                Mobile-first AI tutor
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(17,24,32,0.08)] bg-[rgba(255,255,255,0.52)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-muted)]">
                5 live flater + ukesjekk
              </span>
            </div>

            <h1 className="mt-6 max-w-[14ch] text-balance font-display text-[3.3rem] font-bold leading-[0.9] text-[var(--nc-cream-text)] md:text-[5rem]">
              En norskapp som faktisk oppfører seg intelligent.
            </h1>

            <p className="mt-5 max-w-xl text-[1rem] leading-8 text-[var(--nc-cream-muted)]">
              NorskCoach ser hva som glipper, bygger neste økt, og lar samtale, skriving,
              lesing og rollespill bruke samme læringsminne. Mer trener, mindre kurskatalog.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/onboarding"
                className="nc-button-primary inline-flex min-h-[54px] items-center gap-2 px-6 py-3 text-sm"
              >
                Start kartlegging
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-[54px] items-center gap-2 rounded-[1rem] bg-[rgba(17,24,32,0.94)] px-6 py-3 text-sm font-semibold text-white"
              >
                Se appen
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-[rgba(17,24,32,0.08)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_14px_28px_rgba(16,22,29,0.08)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                  Fokus
                </div>
                <div className="mt-2 text-[1.35rem] font-semibold text-[var(--nc-cream-text)]">
                  Ett klart neste steg
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(17,24,32,0.08)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_14px_28px_rgba(16,22,29,0.08)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                  Reparasjon
                </div>
                <div className="mt-2 text-[1.35rem] font-semibold text-[var(--nc-cream-text)]">
                  Feil blir arbeid
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-[rgba(17,24,32,0.08)] bg-[rgba(255,255,255,0.55)] p-4 shadow-[0_14px_28px_rgba(16,22,29,0.08)]">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                  Sammenheng
                </div>
                <div className="mt-2 text-[1.35rem] font-semibold text-[var(--nc-cream-text)]">
                  Én profil overalt
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="mx-auto flex max-w-[23rem] flex-col gap-4">
              <div className="rounded-[2rem] bg-[linear-gradient(135deg,var(--nc-signal)_0%,#c7f45d_100%)] p-6 text-[var(--nc-signal-fg)] shadow-[0_28px_70px_rgba(183,243,0,0.20)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-65">
                    Explore your next skill
                  </span>
                  <WandSparkles size={16} />
                </div>
                <h2 className="mt-6 max-w-[11ch] text-[2.25rem] font-bold leading-[0.92]">
                  Start med riktig kurslinje.
                </h2>
                <p className="mt-4 max-w-[20ch] text-[0.95rem] leading-7 opacity-72">
                  AI-guidet oppstart, tilpasset nivå og roligere læringsflyt fra første skjerm.
                </p>
                <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[rgba(8,17,13,0.14)] px-4 py-2 text-sm font-semibold">
                  Get started
                  <ArrowRight size={14} />
                </div>
              </div>

              <div className="nc-glass-cream p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="nc-label text-[var(--nc-cream-dim)]">Dashboard</div>
                    <div className="mt-2 text-[1.8rem] font-bold leading-tight text-[var(--nc-cream-text)]">
                      Hello. Find your best next session.
                    </div>
                  </div>
                  <span className="rounded-full bg-[rgba(17,24,32,0.08)] px-3 py-1.5 text-[11px] font-semibold text-[var(--nc-cream-muted)]">
                    A1
                  </span>
                </div>

                <div className="mt-5 rounded-[1.4rem] bg-[rgba(17,24,32,0.94)] p-4 text-white">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    In progress
                  </div>
                  <div className="mt-2 text-[1.25rem] font-semibold">
                    Personlige pronomen
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-full w-[63%] rounded-full bg-[var(--nc-signal)]" />
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {['Økt · 26 oppgaver', 'Snakk · familie', 'Rollespill · café', 'Les · 2 tekster'].map((item, index) => (
                    <div
                      key={item}
                      className="flex items-center justify-between rounded-[1rem] border border-[rgba(17,24,32,0.08)] bg-white/58 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-[var(--nc-cream-text)]">{item}</span>
                      <span className={`h-2.5 w-2.5 rounded-full ${index === 0 ? 'bg-[var(--nc-signal)]' : 'bg-[rgba(17,24,32,0.12)]'}`} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="nc-glass p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">
                      Speaking mode
                    </div>
                    <div className="mt-2 text-[1.4rem] font-semibold text-[var(--nc-text)]">
                      Samtale med Kari
                    </div>
                  </div>
                  <MessageSquareText size={18} className="text-[var(--nc-teal)]" />
                </div>
                <div className="mt-4 rounded-[1rem] bg-[rgba(255,255,255,0.04)] p-4">
                  <div className="text-[0.92rem] text-[var(--nc-text-muted)]">
                    “Fortell om morgenrutinen din.”
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-white/10">
                      <div className="h-full w-[48%] rounded-full bg-[var(--nc-signal)]" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--nc-text-dim)]">
                      Live correction
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="nc-label">Shipped surfaces</div>
            <h2 className="mt-2 text-[2rem] font-bold text-[var(--nc-cream-text)] md:text-[2.8rem]">
              Hele fronten peker mot det som er ekte.
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {LIVE_SURFACES.map(({ title, meta, Icon, accent }) => (
            <div key={title} className="nc-glass-cream p-5">
              <div className="flex items-start justify-between gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] ${
                  accent === 'signal'
                    ? 'bg-[rgba(215,255,92,0.18)] text-[var(--nc-signal-fg)]'
                    : 'bg-[rgba(109,229,255,0.14)] text-[var(--nc-teal-fg)]'
                }`}>
                  <Icon size={18} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                  {meta}
                </span>
              </div>
              <h3 className="mt-5 text-[1.2rem] font-bold text-[var(--nc-cream-text)]">{title}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="mb-8">
          <div className="nc-label">System loop</div>
          <h2 className="mt-2 text-[2rem] font-bold text-[var(--nc-cream-text)] md:text-[2.8rem]">
            Fronten er bygget for å gjøre neste steg opplagt.
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {SYSTEM_STEPS.map((step) => (
            <div key={step.number} className="nc-glass p-5">
              <div className="text-[0.72rem] font-bold tracking-[0.18em] text-[var(--nc-signal)]">
                {step.number}
              </div>
              <h3 className="mt-4 text-[1.25rem] font-bold text-[var(--nc-text)]">
                {step.title}
              </h3>
              <p className="mt-2 text-[0.92rem] leading-7 text-[var(--nc-text-dim)]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="nc-glass-elevated p-6 text-center md:p-10">
          <div className="nc-chip-signal gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
            <BrainCircuit size={12} />
            Start med en ekte flyt
          </div>
          <h2 className="mt-5 text-balance text-[2rem] font-bold text-[var(--nc-text)] md:text-[3rem]">
            Klar for en norskapp som faktisk husker hva du trenger?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[0.98rem] leading-7 text-[var(--nc-text-muted)]">
            Begynn med kartleggingen. Derfra bygger systemet dagens plan og holder alle live flater samlet.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="nc-button-primary inline-flex min-h-[52px] items-center gap-2 px-6 py-3 text-sm"
            >
              Start gratis nå
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[52px] items-center gap-2 rounded-[1rem] bg-white/10 px-6 py-3 text-sm font-semibold text-[var(--nc-text)]"
            >
              Gå til dashbord
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
