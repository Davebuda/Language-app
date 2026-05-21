import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Tøm data — NorskCoach',
  description: 'Fix for the mobile reload loop: clear site data for pandoai.no once and the app will run again.',
}

export default function MobileResetPage() {
  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="relative z-10 mx-auto w-full max-w-2xl px-5 py-8">
        <div className="nc-glass-elevated p-6">
          <div className="nc-label">Mobilfeilretting</div>
          <h1 className="mt-2 font-display text-[1.8rem] font-semibold text-balance text-[var(--nc-text)]">
            Tøm appdata én gang
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-pretty text-[var(--nc-text-muted)]">
            Hvis nettleseren laster pandoai.no på nytt flere ganger og krasjer, har telefonen
            lagret en stor AI-modell som ikke passer for mobilen din. Vi har slått av nedlastingen
            av modellen på telefoner — men du må fjerne den gamle filen én gang. Etter det vil
            appen kjøre normalt med maler i stedet for AI.
          </p>

          <section className="mt-6">
            <h2 className="font-display text-[1.15rem] font-semibold text-balance text-[var(--nc-text)]">
              Chrome (Android)
            </h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] text-[var(--nc-text-muted)]">
              <li>Åpne Chrome og gå til pandoai.no.</li>
              <li>Trykk på låsikonet (eller info-ikonet) ved siden av nettadressen.</li>
              <li>Velg <span className="font-semibold text-[var(--nc-text)]">Innstillinger for nettsted</span>.</li>
              <li>Trykk <span className="font-semibold text-[var(--nc-text)]">Tøm og tilbakestill</span>.</li>
              <li>Last inn pandoai.no på nytt.</li>
            </ol>
          </section>

          <section className="mt-5">
            <h2 className="font-display text-[1.15rem] font-semibold text-balance text-[var(--nc-text)]">
              Safari (iPhone / iPad)
            </h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] text-[var(--nc-text-muted)]">
              <li>Åpne <span className="font-semibold text-[var(--nc-text)]">Innstillinger</span> → <span className="font-semibold text-[var(--nc-text)]">Safari</span>.</li>
              <li>Bla ned og trykk <span className="font-semibold text-[var(--nc-text)]">Avansert</span> → <span className="font-semibold text-[var(--nc-text)]">Nettsteddata</span>.</li>
              <li>Søk etter <span className="font-semibold text-[var(--nc-text)]">pandoai.no</span> og sveip for å slette den oppføringen.</li>
              <li>Last inn pandoai.no på nytt i Safari.</li>
            </ol>
          </section>

          <section className="mt-5">
            <h2 className="font-display text-[1.15rem] font-semibold text-balance text-[var(--nc-text)]">
              Andre nettlesere
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-pretty text-[var(--nc-text-muted)]">
              Generelt: åpne nettleserens innstillinger, finn lagrede data per nettsted, søk opp
              pandoai.no og slett oppføringen. Last deretter inn siden på nytt.
            </p>
          </section>

          <section className="mt-6 rounded-[0.75rem] border border-[var(--nc-border)] bg-white/[0.04] p-4">
            <p className="text-[13px] leading-relaxed text-pretty text-[var(--nc-text-muted)]">
              <span className="font-semibold text-[var(--nc-text)]">Hva skjer etterpå?</span> Telefonen
              kjører NorskCoach med mal-baserte svar i stedet for AI. Diagnosen, øvelsene og repair-
              loopen fungerer som før — de er ikke avhengige av AI. Datamaskiner med nok minne får
              fortsatt den lokale AI-modellen.
            </p>
          </section>

          <div className="mt-6">
            <Link
              href="/dashboard"
              className="text-[13px] font-semibold text-[var(--nc-red)] hover:underline"
            >
              Tilbake til dashbordet →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
