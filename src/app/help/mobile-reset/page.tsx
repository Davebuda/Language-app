import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tøm data — NorskCoach',
  description: 'Fix for the mobile reload loop: clear site data for pandoai.no once and the app will run again.',
}

export default function MobileResetPage() {
  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell relative z-10 flex w-full flex-1 flex-col gap-[6px] px-1.5 pb-10 pt-3">

        {/* Lime focal heading */}
        <div className="nc-signal-panel p-4">
          <div className="nc-label">Mobilfeilretting</div>
          <h1 className="mt-2 font-display text-[1.9rem] font-extrabold leading-[0.94] tracking-[-0.03em] text-balance text-[var(--nc-signal-fg)]">
            Tøm appdata én gang
          </h1>
          <p className="mt-2 text-pretty text-[0.82rem] leading-[1.55] text-[rgba(10,18,6,0.52)]">
            Nettleseren har lagret en stor AI-modell som ikke passer for mobilen din. Fjern den én
            gang — deretter kjører appen normalt med maler i stedet for AI.
          </p>
        </div>

        {/* Chrome — cream panel */}
        <div className="nc-glass-cream px-4 py-4">
          <div className="nc-label mb-2">Chrome (Android)</div>
          <ol className="list-decimal space-y-1.5 pl-5 text-[0.82rem] text-[var(--nc-cream-muted)]">
            <li>Åpne Chrome og gå til pandoai.no.</li>
            <li>Trykk på lås- eller info-ikonet ved siden av nettadressen.</li>
            <li>Velg <span className="font-semibold text-[var(--nc-cream-text)]">Innstillinger for nettsted</span>.</li>
            <li>Trykk <span className="font-semibold text-[var(--nc-cream-text)]">Tøm og tilbakestill</span>.</li>
            <li>Last inn pandoai.no på nytt.</li>
          </ol>
        </div>

        {/* Safari — dark panel */}
        <div className="nc-glass px-4 py-4">
          <div className="nc-label mb-2">Safari (iPhone / iPad)</div>
          <ol className="list-decimal space-y-1.5 pl-5 text-[0.82rem] text-[var(--nc-text-muted)]">
            <li>Åpne <span className="font-semibold text-[var(--nc-text)]">Innstillinger</span> → <span className="font-semibold text-[var(--nc-text)]">Safari</span>.</li>
            <li>Bla ned og trykk <span className="font-semibold text-[var(--nc-text)]">Avansert</span> → <span className="font-semibold text-[var(--nc-text)]">Nettsteddata</span>.</li>
            <li>Søk etter <span className="font-semibold text-[var(--nc-text)]">pandoai.no</span> og sveip for å slette oppføringen.</li>
            <li>Last inn pandoai.no på nytt i Safari.</li>
          </ol>
        </div>

        {/* Other browsers — cream panel */}
        <div className="nc-glass-cream px-4 py-4">
          <div className="nc-label mb-2">Andre nettlesere</div>
          <p className="text-[0.82rem] leading-[1.55] text-[var(--nc-cream-muted)]">
            Åpne nettleserens innstillinger, finn lagrede data per nettsted, søk opp pandoai.no og
            slett oppføringen. Last deretter inn siden på nytt.
          </p>
        </div>

        {/* What happens next — dark note */}
        <div className="nc-glass px-4 py-4">
          <div className="nc-label mb-2">Hva skjer etterpå</div>
          <p className="text-[0.82rem] leading-[1.55] text-[var(--nc-text-muted)]">
            Telefonen kjører NorskCoach med mal-baserte svar. Diagnosen, øvelsene og repair-loopen
            fungerer som normalt — de er ikke avhengige av AI. Datamaskiner med nok minne beholder
            den lokale AI-modellen.
          </p>
        </div>

        {/* Back link */}
        <div className="px-1 pt-1">
          <Link
            href="/dashboard"
            className="text-[0.82rem] font-semibold text-[var(--nc-signal)] hover:underline"
          >
            Tilbake til dashbordet →
          </Link>
        </div>
      </main>
    </div>
  )
}
