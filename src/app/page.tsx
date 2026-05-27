import Link from 'next/link'
import {
  ArrowRight,
  BookOpenText,
  BrainCircuit,
  CalendarCheck2,
  MessageSquareText,
  NotebookPen,
  ScanSearch,
  Theater,
  Zap,
} from 'lucide-react'

const EXPERIENCES = [
  { title: 'Daglig økt', meta: 'AI plan', Icon: Zap },
  { title: 'Samtale', meta: 'Kari', Icon: MessageSquareText },
  { title: 'Skrivejournal', meta: 'Tekst', Icon: NotebookPen },
  { title: 'Rollespill', meta: 'Scene', Icon: Theater },
  { title: 'Lesing', meta: 'Tekster', Icon: BookOpenText },
  { title: 'Ukesjekk', meta: 'Status', Icon: CalendarCheck2 },
] as const

const PRINCIPLES = [
  'Daglig økt',
  'Samtale',
  'Skrivejournal',
] as const

export default function HomePage() {
  return (
    <main className="nc-stage min-h-dvh px-2.5 pb-20 pt-2.5">
      <div className="nc-mobile-shell flex flex-col gap-2.5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 grid-cols-2 gap-1 rounded-[0.65rem] bg-[rgba(255,255,255,0.34)] p-1.5 shadow-[0_10px_24px_rgba(17,18,18,0.08)]">
              <span className="rounded-full bg-[rgba(17,24,32,0.92)]" />
              <span className="rounded-full bg-[rgba(17,24,32,0.92)]" />
              <span className="rounded-full bg-[rgba(17,24,32,0.92)]" />
              <span className="rounded-full bg-[var(--nc-signal)]" />
            </div>
            <div>
              <div className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[var(--nc-cream-text)]">
                NorskCoach
              </div>
              <div className="text-[0.68rem] uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                Personlig AI-veileder
              </div>
            </div>
          </div>

          <Link
            href="/onboarding"
            className="rounded-[0.65rem] bg-[rgba(17,24,32,0.94)] px-3.5 py-2 text-[0.82rem] font-semibold text-white"
          >
            Start
          </Link>
        </header>

        <section className="nc-phone-page p-2.5">
          <div className="flex flex-wrap gap-1.5">
            <span className="nc-chip-dark px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]">
              <BrainCircuit size={12} />
              AI plan
            </span>
            <span className="nc-chip-muted px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em]">
              5 spor
            </span>
          </div>

          <h1 className="mt-3 max-w-[8ch] text-balance font-display text-[1.9rem] font-bold leading-[0.9] text-[var(--nc-cream-text)] sm:text-[2.1rem]">
            Lær norsk smartere.
          </h1>

          <p className="mt-2 max-w-[25ch] text-[0.78rem] leading-5 text-[var(--nc-cream-muted)]">
            Økt, samtale, lesing og skriving deler samme læringsprofil.
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/onboarding"
              className="nc-button-primary inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[0.75rem] px-5 text-[0.82rem]"
            >
              Start kartlegging
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-[50px] items-center justify-center rounded-[0.75rem] bg-[rgba(17,24,32,0.94)] px-5 text-[0.82rem] font-semibold text-white"
            >
              Se appen
            </Link>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <div className="nc-card-lime p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-[0.12em] opacity-55">
                    Oppstart
                  </div>
                  <h2 className="mt-2 max-w-[8ch] text-[1.45rem] font-bold leading-[0.94]">
                    Finn nivået ditt.
                  </h2>
                  <p className="mt-2 max-w-[20ch] text-[0.75rem] leading-5 opacity-72">
                    Kort test først. Deretter får du første økt.
                  </p>
                </div>
                <div className="rounded-[0.7rem] bg-[rgba(13,18,15,0.10)] p-2.5">
                  <ScanSearch size={16} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1.08fr_0.92fr] gap-2">
              <div className="nc-card-dark-solid p-3">
                <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/38">
                  I dag
                </div>
                <div className="mt-1.5 text-[1.05rem] font-semibold text-white">
                  Personlige pronomen
                </div>
                <div className="mt-3 h-2 rounded-full bg-white/10">
                  <div className="h-full w-[62%] rounded-full bg-[var(--nc-signal)]" />
                </div>
                <div className="mt-3 grid gap-1.5">
                  {['Økt · 26 oppgaver', 'Snakk · familie', 'Les · 2 tekster'].map((item, index) => (
                    <div
                      key={item}
                        className="flex items-center justify-between rounded-[0.7rem] bg-white/5 px-3 py-2"
                      >
                      <span className="text-[0.76rem] font-medium text-white">
                        {item}
                      </span>
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          index === 0 ? 'bg-[var(--nc-signal)]' : 'bg-white/16'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="nc-card-soft p-3">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                    Neste
                  </div>
                  <div className="mt-1.5 text-[0.92rem] font-semibold leading-tight text-[var(--nc-cream-text)]">
                    Ett valg
                  </div>
                </div>
                <div className="nc-card-soft p-3">
                  <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                    Tilbakemelding
                  </div>
                  <div className="mt-1.5 text-[0.92rem] font-semibold leading-tight text-[var(--nc-cream-text)]">
                    Rett underveis
                  </div>
                </div>
              </div>
            </div>

            <div className="nc-card-soft p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                    Samtale
                  </div>
                  <div className="mt-1.5 text-[0.92rem] font-semibold text-[var(--nc-cream-text)]">
                    Snakk med Kari.
                  </div>
                </div>
                <div className="rounded-[0.7rem] bg-[rgba(17,24,32,0.94)] p-2.5 text-white">
                  <MessageSquareText size={16} />
                </div>
              </div>

                <div className="mt-3 rounded-[0.75rem] bg-[rgba(17,24,32,0.94)] px-3 py-2.5 text-white">
                  <div className="text-[0.82rem] leading-6 text-white/88">
                    &ldquo;Fortell om morgenrutinen din.&rdquo;
                  </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-white/10">
                    <div className="h-full w-[46%] rounded-full bg-[var(--nc-signal)]" />
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-white/42">
                    Live
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-2">
          {EXPERIENCES.map(({ title, meta, Icon }) => (
            <div key={title} className="nc-card-soft flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[0.7rem] bg-[rgba(17,24,32,0.94)] text-white">
                  <Icon size={16} />
                </div>
                <div>
                  <div className="text-[0.84rem] font-semibold text-[var(--nc-cream-text)]">
                    {title}
                  </div>
                  <div className="text-[0.64rem] uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
                    {meta}
                  </div>
                </div>
              </div>
              <ArrowRight size={15} className="text-[var(--nc-cream-dim)]" />
            </div>
          ))}
        </section>

        <section className="nc-card-dark-solid p-3.5">
          <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/34">
            I appen
          </div>
          <h2 className="mt-2 max-w-[10ch] text-[1.15rem] font-display font-bold leading-[1] text-white">
            Én profil. Flere måter å øve på.
          </h2>

          <div className="mt-3 space-y-2">
            {PRINCIPLES.map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-[0.7rem] bg-white/5 px-3 py-2.5">
                <span className="mt-0.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--nc-signal)]">
                  0{index + 1}
                </span>
                <p className="text-[0.76rem] leading-5 text-white/70">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
