import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { WaitlistForm } from '@/components/landing/waitlist-form'
import { DailyLearningCard } from '@/components/DailyLearningCard'

// ── How It Works steps ──────────────────────────────────────────────────────
const STEPS = [
  {
    number: '1',
    title: 'We diagnose',
    body: 'A short placement session maps your exact gaps — not a level, a fingerprint.',
  },
  {
    number: '2',
    title: 'You practice',
    body: 'Every session is built from your mistake history. Wrong answers trigger a repair loop on the spot.',
  },
  {
    number: '3',
    title: 'You master',
    body: 'Concepts are unlocked in dependency order. Progress is real — earned by demonstrated mastery.',
  },
] as const

// ── Feature highlights ───────────────────────────────────────────────────────
const FEATURES = [
  {
    title: 'Personalized by design',
    body: 'Lessons adapt to your gaps instead of forcing a fixed curriculum.',
  },
  {
    title: 'Real conversations',
    body: 'Speaking, reading, writing, and repair loops share the same memory.',
  },
  {
    title: 'Track every concept',
    body: 'Mastery stays visible. The system feels intelligent before your second session.',
  },
] as const

export default function HomePage() {
  return (
    <main className="nc-gradient-page min-h-dvh">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
        {/* Logo cluster + wordmark */}
        <div className="flex items-center gap-3">
          <div className="relative h-8 w-8 shrink-0">
            <span className="absolute left-0   top-0    h-2.5 w-2.5 rounded-full bg-[var(--nc-text)]" />
            <span className="absolute right-0  top-0    h-2.5 w-2.5 rounded-full bg-[var(--nc-text)]" />
            <span className="absolute left-0   bottom-0 h-2.5 w-2.5 rounded-full bg-[var(--nc-text)]" />
            <span className="absolute right-0  bottom-0 h-2.5 w-2.5 rounded-full bg-[var(--nc-red)]"  />
          </div>
          <span className="text-[0.72rem] font-bold tracking-[0.18em] text-[var(--nc-text)]">
            NORSKCOACH
          </span>
        </div>

        {/* Tagline + nav */}
        <div className="flex items-center gap-6">
          <span className="hidden text-sm text-[var(--nc-text-muted)] md:block">
            Your AI coach for real Norwegian fluency
          </span>
          <Link
            href="/dashboard"
            className="hidden text-sm font-semibold text-[var(--nc-text)] underline-offset-4 hover:underline sm:block"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-10 md:pt-16">
        <div className="max-w-2xl">
          {/* Eyebrow */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--nc-red)]" />
            <span className="text-[11px] font-bold tracking-[0.06em] text-[var(--nc-red)]">
              EARLY ACCESS OPEN
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-balance font-display text-[3rem] font-bold leading-[1.0] text-[var(--nc-text)] md:text-[4rem]">
            Your Norwegian.
            <br />
            Personalized.
            <br />
            <span className="text-[var(--nc-red)]">Every day.</span>
          </h1>

          {/* Subtext */}
          <p className="mt-6 max-w-lg text-pretty text-[1.0625rem] leading-7 text-[var(--nc-text-muted)]">
            A coach that maps your exact gaps, teaches grammar in the right order,
            and repairs every mistake with targeted practice — not another lesson.
          </p>

          {/* CTA row */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/onboarding"
              className="nc-button-primary inline-flex min-h-[48px] items-center gap-2 px-6 py-3 text-sm font-bold"
            >
              Start gratis <ArrowRight size={15} />
            </Link>
            <Link
              href="/dashboard"
              className="nc-button-dark inline-flex min-h-[48px] items-center gap-2 px-6 py-3 text-sm font-bold"
            >
              Åpne dashboard <ArrowRight size={15} />
            </Link>
          </div>

          {/* Social proof micro-text */}
          <div className="mt-6 flex items-center gap-2 text-[12px] text-[var(--nc-text-dim)]">
            <CheckCircle2 size={13} className="text-[var(--nc-green)]" />
            <span>No fixed curriculum &mdash; your syllabus is built daily, just for you.</span>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-8">
          <div className="nc-label mb-2">How it works</div>
          <h2 className="text-balance font-display text-[1.75rem] font-bold leading-tight text-[var(--nc-text)] md:text-[2.25rem]">
            Three steps to fluency.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="nc-glass p-5">
              {/* Step number badge */}
              <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--nc-red)] text-[13px] font-bold text-white">
                {step.number}
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

      {/* ── Feature cards / preview grid ────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-8">
          <div className="nc-label mb-2">What you get</div>
          <h2 className="text-balance font-display text-[1.75rem] font-bold leading-tight text-[var(--nc-text)] md:text-[2.25rem]">
            The coaching layer, not the content.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          {/* Dashboard preview card — glass-elevated container, nc-surface inner panel */}
          <div className="nc-glass-elevated overflow-hidden">
            <div className="border-b border-[var(--nc-border)] px-5 py-4">
              <div className="nc-label mb-1">Dashboard</div>
              <div className="font-display text-[1.5rem] font-bold text-[var(--nc-text)]">
                God kveld, Astrid!
              </div>
              <p className="mt-1 text-[13px] text-[var(--nc-text-muted)]">Klar for å lære i dag?</p>
            </div>

            {/* Session card preview */}
            <div className="p-5">
              <div className="nc-surface p-4">
                <div className="nc-label mb-2" style={{ color: 'rgba(17,17,16,0.42)' }}>{"Dagens økt · A1"}</div>
                <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[var(--nc-red)] px-3 py-1 text-xs font-bold text-white">
                  V2 Word Order
                </div>
                <p className="mt-2 text-[12px]" style={{ color: 'rgba(17,17,16,0.52)' }}>Estimert: 18 min</p>
                <div className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-[var(--radius)] bg-[var(--nc-red)] px-4 py-2 text-sm font-bold text-white">
                  Start økt <ArrowRight size={14} />
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  { value: '12', label: 'dager i strekk' },
                  { value: '87%', label: 'nøyaktighet' },
                  { value: '8', label: 'konsepter' },
                ].map(({ value, label }) => (
                  <div
                    key={label}
                    className="nc-glass rounded-[0.6rem] px-2.5 py-2 text-center"
                  >
                    <div className="font-display text-[1.25rem] font-bold leading-none text-[var(--nc-text)]">
                      {value}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-[var(--nc-text-dim)]">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: exercise preview + explanation card */}
          <div className="flex flex-col gap-5">
            {/* Exercise card */}
            <div className="nc-glass p-5">
              <div className="flex items-center justify-between text-[var(--nc-text-muted)]">
                <span className="text-[12px] font-semibold">3 / 12</span>
                <span className="nc-label">Session</span>
              </div>
              <div className="mt-4 nc-label">Oversett til norsk</div>
              <div className="mt-2 font-display text-[1.75rem] font-bold leading-tight text-[var(--nc-text)]">
                I want to learn Norwegian.
              </div>
              <div className="mt-4 rounded-[var(--radius)] border border-[var(--nc-border)] bg-[var(--nc-card-soft)] px-4 py-3 text-[var(--nc-text-muted)]">
                Jeg vil lærer norsk.
              </div>
              <div className="mt-4 nc-button-primary inline-flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-sm font-bold">
                Sjekk svar <ArrowRight size={15} />
              </div>
            </div>

            {/* Explanation / repair card */}
            <div className="nc-glass p-5">
              <div className="font-display text-[1.35rem] font-bold text-[var(--nc-text)]">
                Nesten riktig!
              </div>
              <p className="mt-1.5 text-[13px] leading-6 text-[var(--nc-text-muted)]">
                {'På norsk kommer infinitiven etter «vil» — ikke den bøyde formen.'}
              </p>
              <div className="mt-4 rounded-[var(--radius)] border border-[var(--nc-green-border)] bg-[var(--nc-green-tint)] px-4 py-3 text-[13px] font-semibold text-[var(--nc-text)]">
                Jeg vil <span className="text-[var(--nc-green)]">lære</span> norsk.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Jeg', 'vil', 'lære', 'norsk'].map((word) => (
                  <span
                    key={word}
                    className="rounded-[0.65rem] border border-[var(--nc-border)] bg-[var(--nc-card-soft)] px-3 py-1.5 text-[11px] text-[var(--nc-text-muted)]"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature highlight list ───────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3 nc-glass p-5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--nc-red-tint)] border border-[var(--nc-red-border)]">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--nc-red)]" />
              </div>
              <div>
                <div className="text-[14px] font-bold text-[var(--nc-text)]">{f.title}</div>
                <div className="mt-1 text-[12px] leading-5 text-[var(--nc-text-dim)]">{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Daily Learning Card ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-16">
        <div className="mb-4">
          <div className="nc-label mb-1">Lær hver dag</div>
          <h2 className="font-display text-[1.5rem] font-bold text-[var(--nc-text)]">
            Dagens grammatikk
          </h2>
        </div>
        <div className="max-w-md">
          <DailyLearningCard alwaysVisible />
        </div>
      </section>

      {/* ── Waitlist CTA ─────────────────────────────────────────────────── */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-20">
        <div className="nc-surface p-6 md:p-8">
          <div className="max-w-xl">
            <div className="mb-2 text-[0.6875rem] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(17,17,16,0.42)' }}>
              Get early access
            </div>
            <h2 className="font-display text-[1.75rem] font-extrabold leading-tight md:text-[2rem]" style={{ color: '#111110' }}>
              Join the waitlist.
            </h2>
            <p className="mt-2 text-[14px]" style={{ color: 'rgba(17,17,16,0.52)' }}>
              Early access. No spam. Unsubscribe any time.
            </p>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ── Footer strip ─────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-[var(--nc-border)] px-5 py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 text-[11px] text-[var(--nc-text-dim)]">
          <div className="flex items-center gap-2 font-bold tracking-[0.12em]">
            <span className="h-2 w-2 rounded-full bg-[var(--nc-red)]" />
            NORSKCOACH
          </div>
          <nav aria-label="Footer" className="flex items-center gap-5">
            <a href="/privacy" className="hover:text-[var(--nc-text)] transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-[var(--nc-text)] transition-colors">Terms</a>
            <a href="/help/mobile-reset" className="hover:text-[var(--nc-text)] transition-colors">Mobilfeilretting</a>
            <a href="mailto:hei@pandoai.no" className="hover:text-[var(--nc-text)] transition-colors">Contact</a>
          </nav>
          <span>Lær. Forstå. Mestre.</span>
        </div>
      </footer>
    </main>
  )
}
