import Link from 'next/link'
import type { ElementType } from 'react'
import {
  Mic,
  MessageSquare,
  Ear,
  Music,
  AudioLines,
  Pencil,
  BookOpenText,
  BookOpen,
  Languages,
  ArrowRight,
} from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'

export const metadata = {
  title: 'Snakk — NorskCoach',
  description:
    'Snakk-huben i NorskCoach: produser norsk. Snakk med Kari, bygg deg opp gjennom lytting, skygging, uttale og rollespill — eller skriv og les.',
}

// T1.5 — the speaking ladder. Ordered input → output: each rung builds toward the
// free conversation with Kari (the hero above). The "why" is a static pedagogical
// rationale about what the modality builds (Rule-6/8 safe — no fabricated diagnosis).
const SPEAK_LADDER: { href: string; Icon: ElementType; name: string; why: string }[] = [
  { href: '/listen', Icon: Ear, name: 'Lytt og svar', why: 'Tren øret — forstå norsk og svar med egne ord. Broen fra å forstå til å snakke.' },
  { href: '/shadow', Icon: Music, name: 'Skygging', why: 'Hør, gjenta, match rytmen. Bygg flyt og uttale uten å måtte finne på ordene selv.' },
  { href: '/drills', Icon: AudioLines, name: 'Uttale', why: 'Spiss de vanskelige lydene — kj, skj, rs. Presisjon der norsk er knotete.' },
  { href: '/roleplay', Icon: MessageSquare, name: 'Rollespill', why: 'Bruk alt i en scene — på kafé, på legevakt. Anvendt prat med trygge rammer.' },
]

// Writing modes — production by writing.
const WRITE_MODES: { href: string; Icon: ElementType; name: string; sub: string }[] = [
  { href: '/journal', Icon: Pencil, name: 'Skriv', sub: 'Dagens skriveoppgave · få retting' },
  { href: '/skriv', Icon: BookOpenText, name: 'Les & skriv', sub: 'B1+ · les, gjenfortell, skriv' },
]

// More practice — input and mechanics. Their one home, so removing them from the
// dashboard menu orphans nothing. /reading is level-aware (honest below-level
// banner at B1/B2); /ord is foundational at every level.
const MORE_MODES: { href: string; Icon: ElementType; name: string; sub: string }[] = [
  { href: '/reading', Icon: BookOpen, name: 'Les', sub: 'Norsk tekst — trykk på ord du vil lære' },
  { href: '/ord', Icon: Languages, name: 'Bøyningsdrill', sub: 'Øv riktige verbformer' },
]

export default function SnakkPage() {
  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">

        {/* ── Header ── */}
        <header>
          <h1 className="text-[1.5rem] font-display font-extrabold leading-tight tracking-[-0.03em] text-[var(--nc-text)]">
            Snakk <em className="font-medium not-italic text-[var(--nc-cyan-on-dark)]">norsk</em>
          </h1>
          <p className="mt-1 text-[0.82rem] leading-relaxed text-[var(--nc-text-muted)]">
            Her øver du på å produsere. Vi starter med å snakke — det er hele poenget.
          </p>
        </header>

        {/* ── Speaking hero (Cream focal + Lime CTA) — the one primary action.
            Mic-forward; links to the AI tutor at /conversation. ── */}
        <section className="overflow-hidden rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
          <div className="p-3.5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cyan-ink)]">
              <span className="size-1.5 rounded-full bg-[var(--nc-cyan)]" aria-hidden="true" />
              AI-tutor
            </div>
            <h2 className="mt-2 text-[1.35rem] font-display font-extrabold leading-none tracking-[-0.03em] text-[var(--nc-cream-text)]">
              Snakk med <em className="font-medium not-italic">Kari</em>
            </h2>
            <p className="mt-2 text-[0.82rem] leading-relaxed text-[var(--nc-cream-muted)]">
              Din AI-tutor venter. En lavterskel prat der du øver på å sette sammen setninger —
              snakk eller skriv, du velger.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-[rgba(17,21,24,0.08)] bg-[rgba(255,255,255,0.5)] px-2.5 py-1 text-[10px] font-semibold text-[var(--nc-cream-muted)]">
                Tilpasset nivået ditt
              </span>
              <span className="rounded-full border border-[rgba(17,21,24,0.08)] bg-[rgba(255,255,255,0.5)] px-2.5 py-1 text-[10px] font-semibold text-[var(--nc-cream-muted)]">
                Snakk eller skriv
              </span>
            </div>
          </div>
          <Link
            href="/conversation"
            aria-label="Snakk med Kari"
            className="flex items-center justify-between gap-3 bg-[var(--nc-signal)] px-3.5 py-3.5 transition-colors hover:bg-[var(--nc-signal-bright)]"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[0.95rem] font-extrabold tracking-[-0.015em] text-[var(--nc-signal-fg)]">
                Snakk med Kari
              </span>
              <span className="text-[0.72rem] font-semibold text-[rgba(10,18,6,0.6)]">
                Trykk og snakk · «din tur»
              </span>
            </span>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--nc-signal-fg)]">
              <Mic size={20} className="text-[var(--nc-signal)]" aria-hidden="true" />
            </span>
          </Link>
        </section>

        {/* ── The speaking ladder (T1.5) — four rungs that build toward free prat.
            Numbered, ordered input→output, each with its "why this". Replaces the
            old flat 2×2 grid. ── */}
        <div className="mt-1 px-1">
          <div className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">
            Veien til fri prat
          </div>
          <p className="mt-0.5 text-[0.72rem] leading-snug text-[var(--nc-text-dim)]">
            Fire steg som bygger opp til samtalen med Kari.
          </p>
        </div>
        <ol className="flex flex-col gap-1.5">
          {SPEAK_LADDER.map(({ href, Icon, name, why }, i) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-3 rounded-lg border border-[var(--nc-border)] bg-[var(--nc-card)] p-3 transition-colors hover:bg-[var(--nc-card-soft)]"
              >
                <span className="relative flex size-9 shrink-0 items-center justify-center rounded-[0.5rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] text-[var(--nc-cyan-on-dark)]">
                  <Icon size={16} aria-hidden="true" />
                  <span className="absolute -left-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[var(--nc-signal)] text-[8px] font-extrabold tabular-nums text-[var(--nc-signal-fg)]">
                    {i + 1}
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.88rem] font-bold tracking-[-0.015em] text-[var(--nc-text)]">{name}</span>
                  <span className="mt-0.5 block text-[0.7rem] leading-snug text-[var(--nc-text-dim)]">{why}</span>
                </span>
                <ArrowRight size={15} aria-hidden="true" className="shrink-0 text-[var(--nc-text-dim)]" />
              </Link>
            </li>
          ))}
        </ol>

        {/* ── Writing modes (Dark tiles) — production by writing ── */}
        <div className="mt-1 px-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">
          Skriv
        </div>
        <div className="flex gap-[6px]">
          {WRITE_MODES.map(({ href, Icon, name, sub }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 rounded-lg border border-[var(--nc-border)] bg-[rgba(255,255,255,0.02)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.05)]"
            >
              <div className="flex items-center gap-1.5 text-[0.82rem] font-bold tracking-[-0.015em] text-[var(--nc-text)]">
                <Icon size={14} className="text-[var(--nc-text-muted)]" aria-hidden="true" />
                {name}
              </div>
              <div className="mt-1 text-[0.7rem] leading-snug text-[var(--nc-text-dim)]">{sub}</div>
            </Link>
          ))}
        </div>

        {/* ── More practice (Dark tiles) — input + mechanics; their one home ── */}
        <div className="mt-1 px-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">
          Mer øving
        </div>
        <div className="flex gap-[6px]">
          {MORE_MODES.map(({ href, Icon, name, sub }) => (
            <Link
              key={href}
              href={href}
              className="flex-1 rounded-lg border border-[var(--nc-border)] bg-[rgba(255,255,255,0.02)] p-3 transition-colors hover:bg-[rgba(255,255,255,0.05)]"
            >
              <div className="flex items-center gap-1.5 text-[0.82rem] font-bold tracking-[-0.015em] text-[var(--nc-text)]">
                <Icon size={14} className="text-[var(--nc-text-muted)]" aria-hidden="true" />
                {name}
              </div>
              <div className="mt-1 text-[0.7rem] leading-snug text-[var(--nc-text-dim)]">{sub}</div>
            </Link>
          ))}
        </div>

      </main>

      <BottomNav active="snakk" />
    </div>
  )
}
