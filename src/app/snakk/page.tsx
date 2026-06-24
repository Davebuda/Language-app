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
} from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'

export const metadata = {
  title: 'Snakk — NorskCoach',
  description:
    'Snakk-huben i NorskCoach: produser norsk. Start en samtale med Kari, øv på rollespill, lytting, skygging og uttale — eller skriv.',
}

// Secondary speaking modes — still production, weighted under the speaking hero.
// Honest static labels only (no fabricated counts).
const SPEAK_MODES: { href: string; Icon: ElementType; name: string; sub: string }[] = [
  { href: '/roleplay', Icon: MessageSquare, name: 'Rollespill', sub: 'På kafé, på legevakt — snakk gjennom scenarier' },
  { href: '/listen', Icon: Ear, name: 'Lytt og svar', sub: 'Hør norsk og svar med egne ord' },
  { href: '/shadow', Icon: Music, name: 'Skygging', sub: 'Hør, gjenta, match rytmen' },
  { href: '/drills', Icon: AudioLines, name: 'Uttale', sub: 'Fire lydgrupper · kj, skj, rs' },
]

// Writing modes — production by writing, weighted last.
const WRITE_MODES: { href: string; Icon: ElementType; name: string; sub: string }[] = [
  { href: '/journal', Icon: Pencil, name: 'Skriv', sub: 'Dagens skriveoppgave · få retting' },
  { href: '/skriv', Icon: BookOpenText, name: 'Les & skriv', sub: 'B1+ · les, gjenfortell, skriv' },
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
              Samtale
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
            aria-label="Start samtalen med Kari"
            className="flex items-center justify-between gap-3 bg-[var(--nc-signal)] px-3.5 py-3.5 transition-colors hover:bg-[var(--nc-signal-bright)]"
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[0.95rem] font-extrabold tracking-[-0.015em] text-[var(--nc-signal-fg)]">
                Start samtalen
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

        {/* ── Secondary speaking modes (Dark tiles) ── */}
        <div className="px-1 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">
          Flere måter å snakke på
        </div>
        <div className="grid grid-cols-2 gap-[6px]">
          {SPEAK_MODES.map(({ href, Icon, name, sub }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-[var(--nc-border)] bg-[var(--nc-card)] p-3 transition-colors hover:bg-[var(--nc-card-soft)]"
            >
              <span className="mb-2.5 flex size-8 items-center justify-center rounded-[0.5rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] text-[var(--nc-cyan-on-dark)]">
                <Icon size={16} aria-hidden="true" />
              </span>
              <div className="text-[0.88rem] font-bold tracking-[-0.015em] text-[var(--nc-text)]">{name}</div>
              <div className="mt-0.5 text-[0.7rem] leading-snug text-[var(--nc-text-dim)]">{sub}</div>
            </Link>
          ))}
        </div>

        {/* ── Writing modes (Dark tiles) — production by writing, weighted last ── */}
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

      </main>

      <BottomNav active="snakk" />
    </div>
  )
}
