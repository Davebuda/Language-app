import Link from 'next/link'
import { ArrowRight, Menu, Sparkles } from 'lucide-react'
import { StartButton } from '@/components/landing/StartButton'

const FEATURES = [
  {
    title: 'Personalized by AI',
    body: 'Lessons that adapt to your gaps instead of forcing a fixed curriculum.',
  },
  {
    title: 'Real conversations',
    body: 'Speaking practice, reading, writing, and repair loops share the same memory.',
  },
  {
    title: 'Track and master',
    body: 'Concept progress stays visible so the system feels intelligent before you even start.',
  },
] as const

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl px-5 pb-16 pt-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center">
            <div className="absolute left-1 top-3 h-2.5 w-2.5 rounded-full bg-nc-dark" />
            <div className="absolute left-4 top-1.5 h-2.5 w-2.5 rounded-full bg-nc-dark" />
            <div className="absolute right-1.5 top-3 h-2.5 w-2.5 rounded-full bg-nc-dark" />
            <div className="absolute left-3.5 bottom-2 h-3.5 w-3.5 rounded-full bg-nc-dark" />
          </div>
          <div>
            <div className="text-[0.72rem] font-medium tracking-[0.18em] text-nc-text-dim">
              NORSKCOACH
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-nc-text-muted md:inline-block">
            Your AI coach for real Norwegian fluency
          </span>
          <Sparkles size={16} className="text-nc-apricot" />
        </div>
      </header>

      <section className="mt-10 grid gap-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start">
        <div className="nc-panel-dark min-h-[720px] p-6">
          <div className="relative z-[1] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-nc-violet" />
              <span className="text-sm font-medium text-white/88">NorskCoach</span>
            </div>
            <Menu size={18} className="text-white/78" />
          </div>

          <div className="relative z-[1] mt-12">
            <h1 className="text-[3.45rem] leading-[0.95] text-white">
              Fluent
              <br />
              Norwegian,
              <br />
              <span className="text-nc-violet">guided by AI.</span>
            </h1>
            <p className="mt-6 max-w-[14rem] text-[15px] leading-7 text-white/72">
              Your personalized path to speak, understand, and think in Norwegian.
            </p>
          </div>

          <div className="relative z-[1] mt-10 rounded-[1rem] border border-[rgba(255,255,255,0.10)] bg-white px-4 py-4 text-nc-text">
            <div className="text-[14px] font-medium">Join the waitlist</div>
            <div className="mt-3 flex items-center gap-2 rounded-[0.85rem] border border-nc-border bg-[#fffdf9] px-3 py-3">
              <span className="text-sm text-nc-text-dim">Enter your email</span>
              <div className="ml-auto flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-nc-violet text-nc-dark">
                <ArrowRight size={15} />
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3">
                  <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-[0.75rem] border border-nc-border bg-white">
                    <div className="h-1.5 w-1.5 rounded-full bg-nc-text-dim" />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-nc-text">
                      {feature.title}
                    </div>
                    <div className="mt-1 text-[12px] leading-6 text-nc-text-dim">
                      {feature.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-[1] mt-4 rounded-[0.95rem] border border-[rgba(214,255,90,0.22)] bg-[linear-gradient(135deg,rgba(214,255,90,0.72),rgba(214,255,90,0.62))] px-4 py-4 text-nc-dark">
            <div className="text-[12px] font-medium">Trusted by early learners</div>
            <div className="mt-2 text-sm">4.9 + from 1,200+ learners</div>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-[11px] font-medium tracking-[0.12em] text-nc-text-dim">
              LANDING / DASHBOARD / SESSION / COMPLETE
            </div>
            <h2 className="mt-3 max-w-2xl text-[3rem] leading-[0.98] text-nc-text">
              A brighter, sharper product language for AI-guided language learning.
            </h2>
            <p className="mt-4 max-w-2xl text-[16px] leading-8 text-nc-text-muted">
              The interface is built around a calm stone canvas, one dark anchor card,
              precise lilac actions, and small patterned details that make the system
              feel designed before the user touches any AI feature.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <StartButton />
              <Link
                href="/dashboard"
                className="nc-button-dark inline-flex items-center gap-2 px-5 py-3 text-sm font-medium"
              >
                Open dashboard
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="nc-panel p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="nc-label">Dashboard</div>
                  <h3 className="mt-2 text-[2rem] leading-[1] text-nc-text">
                    God kveld, Astrid! 👋
                  </h3>
                  <p className="mt-2 text-sm text-nc-text-muted">
                    Klar for å lære i dag?
                  </p>
                </div>
              </div>

              <div className="nc-panel-dark mt-5 p-4">
                <div className="relative z-[1]">
                  <div className="nc-label-light">{"Today's session"}</div>
                  <div className="mt-2 text-[1.65rem] font-display font-semibold text-white">
                    V2 Word Order
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-[0.85rem] bg-nc-violet px-4 py-3 text-sm font-medium text-nc-dark">
                    Start session
                    <ArrowRight size={15} />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ['12', 'day streak'],
                  ['87%', 'accuracy'],
                  ['8', 'concepts'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-[0.9rem] border border-nc-border bg-white px-3 py-3">
                    <div className="text-[22px] font-display font-semibold text-nc-text">
                      {value}
                    </div>
                    <div className="mt-1 text-[10px] font-medium text-nc-text-dim">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="nc-panel-dark p-5">
                <div className="relative z-[1]">
                  <div className="flex items-center justify-between text-white/72">
                    <span className="text-sm">3 / 12</span>
                    <span className="text-sm">Session</span>
                  </div>
                  <div className="mt-5 text-[11px] font-medium tracking-[0.12em] text-white/48">
                    TRANSLATE TO NORWEGIAN
                  </div>
                  <div className="mt-2 text-[2rem] leading-[1.05] text-white">
                    I want to learn Norwegian.
                  </div>
                  <div className="mt-4 rounded-[0.95rem] border border-white/10 bg-white/6 px-4 py-4 text-white/88">
                    Jeg vil lærer norsk.
                  </div>
                  <div className="nc-button-primary mt-4 inline-flex w-full items-center justify-between px-4 py-3 text-sm font-medium">
                    Check answer
                    <ArrowRight size={15} />
                  </div>
                </div>
              </div>

              <div className="nc-panel-soft p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[1.7rem] leading-[1] text-nc-text">Almost there!</div>
                    <p className="mt-2 text-sm text-nc-text-muted">
                      {'In Norwegian, the infinitive comes after "vil".'}
                    </p>
                  </div>
                  <Sparkles size={16} className="text-nc-apricot" />
                </div>
                <div className="mt-4 rounded-[0.85rem] border border-[#d7e8bd] bg-[linear-gradient(180deg,#eef7d2_0%,#f8fbef_100%)] px-4 py-3 text-sm text-nc-text">
                  Jeg vil lære norsk.
                </div>
                <div className="mt-4 flex gap-2">
                  {['Jeg', 'vil', 'lære', 'norsk'].map((item) => (
                    <span key={item} className="rounded-[0.75rem] bg-[#fff0e6] px-3 py-2 text-[11px] text-nc-text-muted">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="nc-panel p-5">
            <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="nc-label">Design system</div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    ['Ink', '#171717', 'bg-nc-dark'],
                    ['Stone', '#F4F2EF', 'bg-[#f4f2ef]'],
                    ['Lilac', '#BAB1FF', 'bg-nc-violet'],
                    ['Sage', '#CFE3CB', 'bg-nc-sage'],
                    ['Apricot', '#FFC8A5', 'bg-nc-apricot'],
                    ['Chartreuse', '#D6FF5A', 'bg-nc-green'],
                  ].map(([label, value, bg]) => (
                    <div key={label} className="w-[82px]">
                      <div className={`h-14 rounded-[0.85rem] border border-nc-border ${bg}`} />
                      <div className="mt-2 text-[11px] font-medium text-nc-text">{label}</div>
                      <div className="text-[10px] text-nc-text-dim">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="nc-label">Patterns & motifs</div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[0.95rem] border border-nc-border p-3">
                    <div className="nc-pattern-topography h-20 rounded-[0.75rem] bg-[#fbfaf7]" />
                  </div>
                  <div className="rounded-[0.95rem] border border-nc-border p-3">
                    <div className="nc-orbit-grid h-20 rounded-[0.75rem] bg-[#fbfaf7]" />
                  </div>
                  <div className="rounded-[0.95rem] border border-nc-border p-3">
                    <div className="nc-pattern-mesh h-20 rounded-[0.75rem]" />
                  </div>
                  <div className="rounded-[0.95rem] border border-nc-border p-3">
                    <div className="nc-dot-grid h-20 rounded-[0.75rem] bg-[#fbfaf7]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="nc-panel-dark flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="relative z-[1] flex flex-wrap items-center gap-6 text-sm text-white/72">
              <span>NorskCoach combines AI intelligence with proven language learning techniques.</span>
            </div>
            <div className="relative z-[1] inline-flex items-center gap-2 rounded-[0.9rem] bg-nc-green px-4 py-3 text-sm font-medium text-nc-dark">
              Laer. Forsta. Mestre.
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
