'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BottomNav } from '@/components/layout/BottomNav'
import { useFingerprint } from '@/hooks/useFingerprint'
import { buildConjugationDrill, type DrillItem } from '@/lib/conjugation-drill'
import { gradeConjugation, TENSE_LABELS } from '@/lib/grade-conjugation'
import { clusterTotalWords, carrierFor } from '@/lib/vocab-loader'
import { markLaneDone } from '@/lib/lane-completion'

type Phase = 'intro' | 'drilling' | 'complete'
const DRILL_SIZE = 10

export function ConjugationDrillScreen() {
  const router = useRouter()
  const { recordVocabAnswer } = useFingerprint()

  // Seed varies per visit AND advances on "Ny drill" so a replay isn't identical.
  const [seedOffset, setSeedOffset] = useState(() => new Date().getDate() + new Date().getHours())
  const drill = useMemo<DrillItem[]>(() => buildConjugationDrill(DRILL_SIZE, seedOffset), [seedOffset])

  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [grade, setGrade] = useState<{ correct: boolean; expected: string } | null>(null)
  const [correctCount, setCorrectCount] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const item = drill[index]

  function check() {
    if (!item || grade || !answer.trim()) return
    const g = gradeConjugation(item.word, item.tense, answer)
    setGrade({ correct: g.correct, expected: g.expected })
    if (g.correct) setCorrectCount((n) => n + 1)
    recordVocabAnswer({
      clusterId: item.clusterId,
      wordId: item.wordId,
      correct: g.correct,
      isProduction: true, // type-the-form is production
      totalWordCount: clusterTotalWords(item.clusterId),
    })
  }

  function next() {
    const ni = index + 1
    setAnswer('')
    setGrade(null)
    if (ni >= drill.length) {
      markLaneDone('ord') // drill finished → counts toward today's B2 lane completion
      setPhase('complete')
    } else {
      setIndex(ni)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  const carrier = item ? carrierFor(item.wordId) : undefined

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">
        <AnimatePresence mode="wait">
          {/* ── Intro ── */}
          {phase === 'intro' ? (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              <div className="nc-signal-panel p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">B2 · ordforråd</div>
                <h1 className="mt-1 text-balance text-[1.35rem] font-extrabold leading-none text-[var(--nc-signal-fg)]">Bøyningsdrill</h1>
                <p className="mt-1 text-[0.78rem] leading-[1.5] text-[rgba(10,18,6,0.62)]">
                  Skriv riktig verbform — presens, preteritum eller presens perfektum. Hverdagsverb du har savnet, med vekt på de uregelrette.
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {['Produksjon', 'Uregelrette først', 'Fingeravtrykk'].map((c) => (
                    <span key={c} className="rounded-full bg-[rgba(6,16,23,0.12)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[rgba(6,16,23,0.62)]">{c}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setPhase('drilling'); requestAnimationFrame(() => inputRef.current?.focus()) }}
                className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold"
                aria-label="Start bøyningsdrill"
              >
                Start · {drill.length} verb
              </button>
            </motion.div>
          ) : null}

          {/* ── Drilling ── */}
          {phase === 'drilling' && item ? (
            <motion.div key="drilling" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              <div className="nc-signal-panel p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Bøyningsdrill</span>
                  <span className="rounded-full bg-[rgba(6,16,23,0.90)] px-2.5 py-0.5 text-[10px] font-bold tabular-nums text-white">{index + 1} / {drill.length}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(6,16,23,0.14)]">
                  <motion.div className="h-full origin-left rounded-full bg-[rgba(6,16,23,0.82)]" initial={false} animate={{ scaleX: index / drill.length }} transition={{ duration: 0.4, ease: 'easeOut' }} />
                </div>
              </div>

              {/* Cue */}
              <div className="rounded-[0.65rem] bg-[var(--nc-card)] border border-[var(--nc-border)] p-4">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Bøy verbet i {TENSE_LABELS[item.tense]}</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[1.6rem] font-extrabold tracking-[-0.02em] text-[var(--nc-text)]">{item.word.infinitive}</span>
                  {item.word.irregular ? (
                    <span className="rounded-full border border-[rgba(255,106,85,0.4)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-red,#ff6a55)]">uregelrett</span>
                  ) : null}
                </div>

                <input
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') (grade ? next() : check()) }}
                  disabled={!!grade}
                  aria-label={`Skriv ${TENSE_LABELS[item.tense]} av ${item.word.infinitive}`}
                  placeholder={item.tense === 'perfektum' ? 'har …' : '…'}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="mt-3 w-full rounded-lg border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-[1.05rem] text-[var(--nc-text)] placeholder:text-[var(--nc-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--nc-signal)]"
                  style={grade ? { borderColor: grade.correct ? 'var(--nc-signal)' : 'rgba(255,106,85,0.6)' } : undefined}
                />

                <AnimatePresence>
                  {grade ? (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-col gap-1.5">
                      <div className="text-[0.82rem] font-bold" style={{ color: grade.correct ? 'var(--nc-signal)' : 'var(--nc-red,#ff6a55)' }}>
                        {grade.correct ? 'Riktig.' : `Nesten — riktig form: ${grade.expected}`}
                      </div>
                      {carrier ? (
                        <p className="rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)] px-3 py-2 text-[0.82rem] leading-[1.5] text-[var(--nc-cream-text)]">{carrier.no}</p>
                      ) : null}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>

              <button
                onClick={() => (grade ? next() : check())}
                disabled={!grade && !answer.trim()}
                className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold disabled:opacity-50"
                aria-label={grade ? 'Neste verb' : 'Sjekk svar'}
              >
                {grade ? (index + 1 >= drill.length ? 'Fullfør' : 'Neste') : 'Sjekk'}
              </button>
            </motion.div>
          ) : null}

          {/* ── Complete ── */}
          {phase === 'complete' ? (
            <motion.div key="complete" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col justify-center gap-3">
              <div className="nc-signal-panel p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Drill fullført</div>
                <h2 className="mt-2 text-balance text-[1.75rem] font-extrabold leading-[0.96] text-[var(--nc-signal-fg)]">
                  {correctCount === drill.length ? 'Perfekt!' : 'Bra jobbet!'}
                </h2>
                <div className="mt-4 rounded-[0.5rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div className="text-[2.75rem] font-extrabold tabular-nums leading-none" style={{ color: correctCount >= Math.ceil(drill.length / 2) ? 'var(--nc-signal)' : 'var(--nc-red,#ff6a55)' }}>
                    {correctCount}/{drill.length}
                  </div>
                  <p className="mt-1.5 text-[0.78rem] text-[rgba(255,255,255,0.55)]">riktige former</p>
                </div>
                <p className="mt-3 text-pretty text-[0.8125rem] text-[rgba(10,18,6,0.62)]">
                  Riktige produksjoner teller mot ordforrådet ditt — verb du bommet på og nå mestrer.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <button onClick={() => { setSeedOffset((s) => s + DRILL_SIZE); setPhase('intro'); setIndex(0); setCorrectCount(0); setAnswer(''); setGrade(null) }} className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold" aria-label="Ny drill">Ny drill</button>
                <button onClick={() => router.push('/dashboard')} className="nc-button-dark w-full rounded-[var(--radius)] py-3 text-[0.875rem] font-semibold" aria-label="Tilbake til dashboard">Tilbake til dashboard</button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
      <BottomNav active="home" />
    </div>
  )
}
