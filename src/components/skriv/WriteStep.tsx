'use client'

// WRITE step of the read→recite→write flow.
//
// Honesty rails (CLAUDE.md Rule 6/8 + grade-read-respond.ts):
//   - NO numeric score, ever. Progress is the deterministic checklist (count, not %).
//   - Unmet criterion = neutral "ikke ennå", never red-before-submit.
//   - Four outcomes → three registers: pass (green "teller") /
//     structure-missing (amber nudge + micro-drill) / too-short|off-topic
//     (neutral "ikke ferdig", no credit, no penalty).
//   - AI-up adds a badged correction layer; AI-down (source:'template') is an
//     honest "Grunnsjekk" subset, never an error state.
//   - Guided (writeFrame present) is tagged "Med støtte" and earns reduced credit.

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react'
import type { CEFRLevel } from '@/types/fingerprint'
import type { ReadingPassage } from '@/types/content'
import type { WritingFeedback } from '@/ai/types'
import { gradeReadRespond, type ReadRespondGrade } from '@/lib/grade-read-respond'
import { aiService } from '@/ai'

const AMBER = '#f5b942'
const AMBER_TINT = 'rgba(245,185,66,0.12)'
const AMBER_BORDER = 'rgba(245,185,66,0.34)'

interface WriteStepProps {
  passage: ReadingPassage
  level: CEFRLevel
  /** Fired once per COUNTED attempt (pass | structure-missing) so the screen
   *  writes the production/repair brick. too-short/off-topic do NOT call this. */
  onResolved: (grade: ReadRespondGrade, feedback: WritingFeedback | null, text: string) => void
  /** Fired when the learner finishes the passage. */
  onFinish: () => void
}

type View = 'editing' | 'result'

export function WriteStep({ passage, level, onResolved, onFinish }: WriteStepProps) {
  const guided = !!passage.writeFrame
  const [text, setText] = useState(passage.writeFrame ?? '')
  const [view, setView] = useState<View>('editing')
  const [grade, setGrade] = useState<ReadRespondGrade | null>(null)
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [nonAttemptNote, setNonAttemptNote] = useState<string | null>(null)

  // Live checklist: gradeReadRespond is pure + cheap, recompute on each keystroke.
  const liveGrade = useMemo(
    () =>
      gradeReadRespond({
        text,
        level,
        passageContentWords: passage.passageContentWords,
        targetConnectors: passage.targetConnectors,
        targetStructureTag: passage.targetStructureTag,
      }),
    [text, level, passage],
  )
  const metCount = liveGrade.checklist.filter((c) => c.ok).length
  const totalCount = liveGrade.checklist.length

  async function handleCheck() {
    const g = gradeReadRespond({
      text,
      level,
      passageContentWords: passage.passageContentWords,
      targetConnectors: passage.targetConnectors,
      targetStructureTag: passage.targetStructureTag,
    })

    // too-short / off-topic = not a real attempt → no brick, no penalty, keep editing.
    if (g.outcome === 'too-short') {
      setNonAttemptNote('Skriv litt mer for å få en vurdering.')
      return
    }
    if (g.outcome === 'off-topic') {
      setNonAttemptNote('Hold deg til teksten — bruk noen ord fra passasjen.')
      return
    }

    setNonAttemptNote(null)
    setGrade(g)

    if (g.outcome === 'structure-missing') {
      onResolved(g, null, text)
      setView('result')
      return
    }

    // pass → ask the AI (Tier-2) for rich corrections; AI-down returns a template.
    setAnalyzing(true)
    let fb: WritingFeedback | null = null
    try {
      fb = await aiService.reviewWriting({ userText: text, prompt: passage.writePrompt, level })
    } catch {
      fb = null
    }
    setFeedback(fb)
    setAnalyzing(false)
    onResolved(g, fb, text)
    setView('result')
  }

  function reviseAgain() {
    setView('editing')
    setGrade(null)
    setFeedback(null)
  }

  // ── EDITING ──────────────────────────────────────────────────────────────
  if (view === 'editing') {
    return (
      <motion.div
        key="write-editing"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.26 }}
        className="flex flex-col gap-3"
      >
        {/* prompt */}
        <div className="rounded-[0.65rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Skriv</span>
            {guided ? (
              <span
                className="rounded-full border border-dashed px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-cream-dim)]"
                style={{ borderColor: 'rgba(17,21,24,0.2)' }}
              >
                Med støtte
              </span>
            ) : (
              <span className="rounded-full bg-[var(--nc-signal-tint)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5A8A00]">
                Fritt
              </span>
            )}
          </div>
          <p className="mt-1.5 text-[0.95rem] font-bold leading-snug text-[var(--nc-cream-text)]">
            {passage.writePrompt}
          </p>
        </div>

        {/* textarea — cream writing surface */}
        <div className="overflow-hidden rounded-[0.65rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)]">
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              if (nonAttemptNote) setNonAttemptNote(null)
            }}
            placeholder="Skriv din mening på norsk her…"
            aria-label="Skriv din mening på norsk"
            className="min-h-[150px] w-full resize-none bg-transparent px-3.5 py-3 text-[0.95rem] leading-relaxed text-[var(--nc-cream-text)] placeholder:text-[var(--nc-cream-dim)] focus:outline-none"
          />
          <div className="flex items-center justify-end border-t border-[rgba(17,21,24,0.06)] px-3.5 py-1.5">
            <span className="text-[10px] tabular-nums text-[var(--nc-cream-dim)]">{liveGrade.wordCount} ord</span>
          </div>
        </div>

        {/* LIVE CHECKLIST — count, never a percentage */}
        <div className="overflow-hidden rounded-[0.65rem] border border-[var(--nc-border)] bg-[var(--nc-card)]">
          <div className="flex items-center justify-between border-b border-[var(--nc-border)] px-3.5 py-2.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Sjekkliste</span>
            <span className="text-[0.75rem] font-bold tabular-nums text-[var(--nc-text-muted)]">
              <span className="text-[var(--nc-signal)]">{metCount}</span> av {totalCount}
            </span>
          </div>
          {liveGrade.checklist.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-3.5 py-2.5${i < liveGrade.checklist.length - 1 ? ' border-b border-[var(--nc-border)]' : ''}`}
            >
              <span
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full border"
                style={
                  item.ok
                    ? { background: 'var(--nc-signal)', borderColor: 'var(--nc-signal)' }
                    : { borderStyle: 'dashed', borderColor: 'var(--nc-border-strong, rgba(255,255,255,0.18))' }
                }
              >
                {item.ok ? <Check size={11} strokeWidth={3} style={{ color: 'var(--nc-signal-fg)' }} aria-hidden="true" /> : null}
              </span>
              <span className={`text-[0.8125rem] ${item.ok ? 'font-medium text-[var(--nc-text)]' : 'text-[var(--nc-text-dim)]'}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {nonAttemptNote ? (
          <p className="rounded-[0.5rem] border border-[var(--nc-border)] bg-[var(--nc-card)] px-3.5 py-2.5 text-[0.8125rem] text-[var(--nc-text-muted)]" role="status">
            {nonAttemptNote}
          </p>
        ) : null}

        <button
          onClick={handleCheck}
          disabled={analyzing || text.trim().length === 0}
          aria-label="Sjekk svar"
          className="nc-button-primary flex w-full items-center justify-center gap-2 py-3.5 text-[0.9rem] font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          {analyzing ? 'Sjekker…' : 'Sjekk svar'}
          {analyzing ? null : <Check size={15} aria-hidden="true" />}
        </button>
      </motion.div>
    )
  }

  // ── RESULT ───────────────────────────────────────────────────────────────
  const isPass = grade?.outcome === 'pass'
  const aiUp = feedback?.source === 'ai'

  return (
    <motion.div
      key="write-result"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.26 }}
      className="flex flex-col gap-3"
    >
      <div
        className="rounded-[0.85rem] p-4"
        style={
          isPass
            ? { background: 'var(--nc-green-tint, rgba(60,180,100,0.12))', border: '1px solid var(--nc-green-border, rgba(60,180,100,0.30))' }
            : { background: AMBER_TINT, border: `1px solid ${AMBER_BORDER}` }
        }
      >
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-[0.5rem]"
            style={isPass ? { background: 'var(--nc-green, #7bd88f)', color: '#06210f' } : { background: AMBER, color: '#2a1c00' }}
          >
            {isPass ? <Check size={16} strokeWidth={2.6} aria-hidden="true" /> : <ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />}
          </span>
          <div>
            <div className="text-[0.95rem] font-extrabold" style={{ color: isPass ? 'var(--nc-green, #7bd88f)' : AMBER }}>
              {isPass ? 'Godkjent — dette teller' : 'Nesten der'}
            </div>
            <div className="text-[0.78rem] text-[var(--nc-text-muted)]">
              {isPass
                ? `Produksjon registrert på «${passage.primaryConceptId}»`
                : 'Du skrev nok og holdt deg til teksten — men uten en bindestruktur.'}
            </div>
          </div>
        </div>

        {/* credit tag — free vs guided, visibly different weight */}
        {isPass ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {guided ? (
              <span
                className="rounded-[0.4rem] border border-dashed px-2.5 py-1 text-[10px] font-bold"
                style={{ borderColor: 'rgba(255,255,255,0.18)', color: 'var(--nc-text-dim)' }}
              >
                Med støtte · redusert kreditt
              </span>
            ) : (
              <span className="rounded-[0.4rem] bg-[var(--nc-signal)] px-2.5 py-1 text-[10px] font-bold text-[var(--nc-signal-fg)]">
                Fritt · full kreditt
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-[0.4rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[10px] font-bold text-[var(--nc-text-muted)]">
              <span className="inline-block h-2 w-[11px] rounded-[2px] bg-[var(--nc-teal)]" aria-hidden="true" />
              Murstein lagt
            </span>
          </div>
        ) : null}

        {/* structure-missing → micro-drill nudge */}
        {!isPass ? (
          <div className="mt-3 rounded-[0.6rem] border bg-[var(--nc-card)] p-3" style={{ borderColor: AMBER_BORDER }}>
            <div className="text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: AMBER }}>Mikroøvelse</div>
            <p className="mt-1.5 text-[0.84rem] leading-snug text-[var(--nc-text)]">
              Bind sammen to setninger med <span className="font-bold text-[var(--nc-signal)]">«{passage.targetConnectors[0] ?? 'fordi'}»</span> i svaret ditt.
            </p>
          </div>
        ) : null}

        {/* AI-up vs AI-down feedback layer (pass only) */}
        {isPass ? (
          <div className="mt-3.5 border-t border-[var(--nc-border)] pt-3">
            {aiUp ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-[0.4rem] border border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#5A8A00]">
                  <Sparkles size={11} aria-hidden="true" />
                  AI-tilbakemelding
                </span>
                {feedback?.praise ? (
                  <p className="mt-2.5 text-[0.82rem] leading-relaxed text-[var(--nc-text-muted)]">{feedback.praise}</p>
                ) : null}
                {feedback && feedback.errors.length > 0 ? (
                  <div className="mt-2.5 flex flex-col gap-1.5">
                    {feedback.errors.slice(0, 4).map((err, i) => (
                      <p key={i} className="text-[0.82rem] leading-snug">
                        <span className="text-[var(--nc-text-dim)] line-through">{err.wrong}</span>
                        {' → '}
                        <span className="font-semibold text-[var(--nc-text)]">{err.correct}</span>
                        {err.briefWhy ? <span className="text-[var(--nc-text-muted)]"> — {err.briefWhy}</span> : null}
                      </p>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <span
                  className="inline-flex items-center gap-1.5 rounded-[0.4rem] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]"
                  style={{ background: AMBER_TINT, border: `1px solid ${AMBER_BORDER}`, color: AMBER }}
                >
                  <ShieldCheck size={11} aria-hidden="true" />
                  Grunnsjekk
                </span>
                <p className="mt-2.5 text-[0.82rem] leading-relaxed text-[var(--nc-text-muted)]">
                  Grunnsjekk i dag — rettelsene dine er registrert og produksjonen teller. Detaljert
                  tilbakemelding kommer når AI-en er tilgjengelig igjen.
                </p>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onFinish}
          aria-label="Fullfør passasjen"
          className="nc-button-primary flex w-full items-center justify-center gap-2 py-3.5 text-[0.9rem] font-bold"
        >
          {isPass ? 'Fullfør' : 'Fullfør likevel'}
          <ArrowRight size={15} aria-hidden="true" />
        </button>
        {!isPass ? (
          <button
            onClick={reviseAgain}
            aria-label="Skriv om svaret"
            className="nc-button-dark w-full rounded-[var(--radius)] py-3 text-[0.875rem] font-semibold"
          >
            Skriv om svaret
          </button>
        ) : null}
      </div>
    </motion.div>
  )
}
