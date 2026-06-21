'use client'

// The read → recite → write ("skriv") flow — Direction 2 "Tre takter".
// One surface, three morphing modes; the passage is the persistent spine
// (full slab → docked strip). Three honest bricks from one passage:
//   READ   → recordExposure (no mastery; reading ≠ producing)
//   RECITE → speakingMinutesTotal + one self-reported recognition brick (no %)
//   WRITE  → deterministic production brick (recordProductionFromSurface) +,
//            when AI is up, per-error repair bricks; structure-miss → repair brick.
// Standalone /skriv lane. B1+B2 content (honest level gate for A1/A2; a B2
// learner draws B2 passages, a B1 learner B1, via the at-or-below level filter).

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronDown, BookOpen } from 'lucide-react'
import { BottomNav } from '@/components/layout/BottomNav'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { saveFingerprint } from '@/storage/indexeddb'
import { markLaneDone } from '@/lib/lane-completion'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { confirmedRepair } from '@/lib/gender-correction-gate'
import {
  recordProductionFromSurface,
  repairFromSurface,
  repairBatchFromSurface,
  type RepairInput,
} from '@/engine/repair-from-surface'
import { logExerciseResult } from '@/lib/logEvents'
import { createClient } from '@/lib/supabase/client'
import type { CEFRLevel } from '@/types/fingerprint'
import type { ReadingPassage } from '@/types/content'
import type { ExerciseResult } from '@/types/session'
import type { ReadRespondGrade } from '@/lib/grade-read-respond'
import type { WritingFeedback } from '@/ai/types'
import { ReciteStep, type ReciteSelfReport } from './ReciteStep'
import { WriteStep } from './WriteStep'

const LEVEL_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2']
const RECITE_SECONDS_PER_SENTENCE = 4

type Phase = 'read' | 'recite' | 'write' | 'done'
const PHASE_INDEX: Record<Phase, number> = { read: 0, recite: 1, write: 2, done: 3 }

interface ReadReciteWriteScreenProps {
  passages: ReadingPassage[]
}

// ── Passage spine (docked, collapsible on recite/write) ──────────────────────
function PassageDock({ passage }: { passage: ReadingPassage }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="overflow-hidden rounded-[0.65rem] border border-[rgba(17,21,24,0.06)] bg-[var(--nc-cream)]">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Vis eller skjul teksten"
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        <BookOpen size={14} className="shrink-0 text-[var(--nc-cream-dim)]" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Teksten</div>
          <div className="truncate text-[0.82rem] font-bold text-[var(--nc-cream-text)]">{passage.title ?? 'Passasje'}</div>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
          <ChevronDown size={16} className="text-[var(--nc-cream-muted)]" aria-hidden="true" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 border-t border-[rgba(17,21,24,0.06)] px-3.5 py-3">
              {passage.paragraphs.map((p, i) => (
                <p key={i} className="text-pretty text-[0.86rem] leading-[1.55] text-[var(--nc-cream-muted)]">{p}</p>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export function ReadReciteWriteScreen({ passages }: ReadReciteWriteScreenProps) {
  const router = useRouter()
  const { fingerprint, setFingerprint } = useFingerprintStore()
  // useFingerprint() also triggers IndexedDB→store hydration on a direct /skriv visit.
  const { recordResult, recordExposure } = useFingerprint()
  const { user } = useAuth()

  const [phase, setPhase] = useState<Phase>('read')
  const [showGloss, setShowGloss] = useState(false)
  const [bricks, setBricks] = useState({ read: false, recite: false, write: false })
  // A structure-missing revise loop must not stack repeated repair penalties on
  // one passage (Rule 8 — one honest write per real signal). Book the repair once.
  const repairBookedRef = useRef(false)

  const level = (fingerprint?.currentLevel ?? 'A1') as CEFRLevel
  const maxIdx = LEVEL_ORDER.indexOf(level)

  // Honest level gate: show a passage only at or below the learner's level.
  const passage = useMemo(() => {
    const eligible = passages.filter((p) => LEVEL_ORDER.indexOf(p.cefrLevel) <= maxIdx)
    if (eligible.length === 0) return null
    const focus = new Set(fingerprint?.weeklyFocus ?? [])
    return eligible.find((p) => focus.has(p.primaryConceptId)) ?? eligible[0]
  }, [passages, maxIdx, fingerprint?.weeklyFocus])

  const reciteSentences = useMemo(
    () => (passage ? passage.reciteTargetIndices.map((i) => passage.sentences[i]).filter(Boolean) : []),
    [passage],
  )

  // ── READ → exposure brick ──────────────────────────────────────────────────
  function handleReadDone() {
    if (!passage) return
    recordExposure(passage.conceptIds)
    setBricks((b) => ({ ...b, read: true }))
    // Defensive: a passage with no valid recite targets skips straight to WRITE
    // rather than stranding the learner on an empty recite step.
    setPhase(reciteSentences.length > 0 ? 'recite' : 'write')
  }

  // ── RECITE → speaking minutes + one recognition brick ──────────────────────
  function handleReciteComplete(outcomes: ReciteSelfReport[], transcripts: string[]) {
    if (!passage) return
    const saidCount = outcomes.filter((o) => o === 'said').length
    const correct = saidCount >= Math.ceil(outcomes.length / 2)

    const result: ExerciseResult = {
      sessionId: 'skriv',
      itemId: `skriv-${passage.id}-recite`,
      correct,
      userAnswer: transcripts.filter(Boolean).join(' | '),
      correctAnswer: reciteSentences.join(' '),
      timeTakenSeconds: outcomes.length * RECITE_SECONDS_PER_SENTENCE,
      conceptId: passage.primaryConceptId,
      sentenceId: `${passage.id}:recite`,
      // errorTag deliberately undefined: a recite struggle is a recitation miss,
      // NOT a listening-recognition failure — tagging it would poison listening
      // diagnosis + productionGap (the documented ShadowingScreen.tsx:83 stance,
      // Rule 8). Mastery still moves from correct/incorrect.
      errorTag: undefined,
    }
    recordResult(result)
    if (user?.id) logExerciseResult(user.id, result)

    // speaking minutes — read freshest state (recordResult just wrote mastery)
    const fp = useFingerprintStore.getState().fingerprint
    if (fp) {
      const minutes = outcomes.length * (RECITE_SECONDS_PER_SENTENCE / 60)
      const updated = {
        ...fp,
        speakingMinutesTotal: (fp.speakingMinutesTotal ?? 0) + minutes,
        updatedAt: new Date().toISOString(),
      }
      setFingerprint(updated)
      saveFingerprint(updated).catch(console.warn)
    }

    // Light the "Sagt" brick only when recite was actually credited (a real
    // mastery brick lands only on `correct`). A self-reported struggle moves
    // mastery DOWN and lays no brick — claiming one would be a false production
    // signal (Rule 8). The brick visual must mirror the real write.
    setBricks((b) => ({ ...b, recite: correct }))
    setPhase('write')
  }

  // ── WRITE → production / repair brick ──────────────────────────────────────
  function handleWriteResolved(grade: ReadRespondGrade, feedback: WritingFeedback | null, writtenText: string) {
    const fp = useFingerprintStore.getState().fingerprint
    if (!fp || !passage) return
    const graph = getGraphForLevel(fp.currentLevel)

    let updated = fp
    if (grade.outcome === 'pass') {
      updated = recordProductionFromSurface(updated, { conceptId: passage.primaryConceptId, guided: !!passage.writeFrame }, graph)
      if (feedback && feedback.errors.length > 0) {
        // Hard rule: no unverified AI output moves mastery. Gate every AI-claimed
        // error through the shared deterministic verifier (gender/conjugation/
        // adjective/compound), exactly as journal + conversation do — the written
        // text is the context the tense/determiner checks need. Errors the
        // verifier can't confirm are SHOWN (WriteStep) but never written.
        const inputs = feedback.errors
          .map((err) => confirmedRepair({ original: err.wrong, corrected: err.correct, context: writtenText }, 'reading'))
          .filter((r): r is RepairInput => r !== null)
        if (inputs.length > 0) updated = repairBatchFromSurface(updated, inputs, graph)
      }
    } else if (grade.outcome === 'structure-missing' && grade.missingStructureTag) {
      // Only book the repair brick on the FIRST structure-missing; a revise loop
      // must not stack identical penalties + duplicate error-log rows.
      if (repairBookedRef.current) return
      repairBookedRef.current = true
      updated = repairFromSurface(
        updated,
        { surfaceKind: 'reading', errorTag: grade.missingStructureTag, conceptId: passage.primaryConceptId },
        graph,
      )
    }

    setFingerprint(updated)
    saveFingerprint(updated).catch(console.warn)
    // Light the "Skrevet" brick only on a real production pass. A
    // structure-missing outcome books a repair (mastery DOWN, no production
    // brick) — it must not render as a brick laid.
    setBricks((b) => ({ ...b, write: grade.outcome === 'pass' }))
    void persistWriting(grade, feedback, writtenText)
  }

  async function persistWriting(grade: ReadRespondGrade, feedback: WritingFeedback | null, writtenText: string) {
    if (!user || !passage) return
    try {
      const supabase = createClient()
      await supabase.from('writing_submissions').insert({
        user_id: user.id,
        content: writtenText,
        prompt_text: passage.writePrompt,
        feedback: (feedback ?? { outcome: grade.outcome }) as unknown as Record<string, unknown>,
        error_tags: feedback?.errors.map((e) => e.tag) ?? [],
        error_count: feedback?.errors.length ?? 0,
        word_count: grade.wordCount,
        cefr_level: level,
      })
    } catch (err) {
      // Non-fatal: the IndexedDB fingerprint write is the source of truth (Rule 8).
      // Warn (don't swallow) so a writing_submissions schema drift stays observable.
      console.warn('[skriv] writing_submissions insert failed', err)
    }
  }

  function handleFinish() {
    markLaneDone('reading')
    setPhase('done')
  }

  // ── Honest empty / gated states ────────────────────────────────────────────
  if (!passage) {
    return (
      <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
        <main className="nc-mobile-shell nc-flow-shell flex flex-1 flex-col justify-center gap-3">
          <div className="nc-glass rounded-[0.65rem] p-5 text-center">
            <h1 className="text-balance text-[1.1rem] font-bold text-[var(--nc-text)]">Skriv-modulen er på B1-nivå</h1>
            <p className="mt-2 text-pretty text-[0.86rem] leading-relaxed text-[var(--nc-text-muted)]">
              Les → si → skriv kommer for ditt nivå senere. Fortsett med dagens økt for nå.
            </p>
            <button onClick={() => router.push('/dashboard')} className="nc-button-primary mt-4 w-full py-3 text-[0.875rem] font-bold">
              Tilbake til dashboard
            </button>
          </div>
        </main>
        <BottomNav active="home" />
      </div>
    )
  }

  const phaseIdx = PHASE_INDEX[phase]

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell flex flex-col gap-3">

        {/* ── Continuity chrome: 3-segment stepper + brick trio ── */}
        {phase !== 'done' ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              {(['read', 'recite', 'write'] as const).map((p, i) => (
                <div key={p} className="h-[4px] flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.10)]">
                  <motion.div
                    className="h-full origin-left rounded-full bg-[var(--nc-signal)]"
                    initial={false}
                    animate={{ scaleX: i < phaseIdx ? 1 : i === phaseIdx ? 0.55 : 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--nc-text-dim)]">Les · Si · Skriv</span>
              <span className="flex items-center gap-1" aria-hidden="true">
                <span className="h-[9px] w-[13px] rounded-[2px] border" style={bricks.read ? { background: 'var(--nc-teal)', borderColor: 'var(--nc-teal)' } : { borderColor: 'var(--nc-border)' }} />
                <span className="h-[9px] w-[13px] rounded-[2px] border" style={bricks.recite ? { background: 'var(--nc-teal)', borderColor: 'var(--nc-teal)' } : { borderColor: 'var(--nc-border)' }} />
                <span className="h-[9px] w-[13px] rounded-[2px] border" style={bricks.write ? { background: 'var(--nc-signal)', borderColor: 'var(--nc-signal)' } : { borderColor: 'var(--nc-border)' }} />
              </span>
            </div>
          </div>
        ) : null}

        <AnimatePresence mode="wait">

          {/* ── READ ── */}
          {phase === 'read' ? (
            <motion.div
              key="read"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col gap-3"
            >
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-[var(--nc-text-dim)]">Tekst · {level}</span>
                {passage.englishGloss ? (
                  <button
                    onClick={() => setShowGloss((v) => !v)}
                    aria-pressed={showGloss}
                    className="rounded-[0.5rem] border border-[var(--nc-border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--nc-text-muted)]"
                  >
                    {showGloss ? 'Skjul engelsk' : 'Vis engelsk'}
                  </button>
                ) : null}
              </div>

              <div className="nc-glass-cream flex flex-col gap-3 rounded-[0.85rem] p-5">
                {passage.title ? (
                  <h1 className="text-balance text-[1.5rem] font-extrabold leading-[1.05] text-[var(--nc-cream-text)]">{passage.title}</h1>
                ) : null}
                {passage.paragraphs.map((p, i) => (
                  <p key={i} className="text-pretty text-[1.02rem] leading-[1.62] text-[var(--nc-cream-text)]">{p}</p>
                ))}
                {showGloss && passage.englishGloss ? (
                  <p className="mt-1 border-t border-[rgba(17,21,24,0.08)] pt-3 text-pretty text-[0.84rem] italic leading-[1.5] text-[var(--nc-cream-muted)]">
                    {passage.englishGloss}
                  </p>
                ) : null}
              </div>

              <button
                onClick={handleReadDone}
                aria-label="Les ferdig — gå videre til å si setningene"
                className="nc-button-primary flex w-full items-center justify-center gap-2 py-3.5 text-[0.9rem] font-bold"
              >
                Les ferdig
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            </motion.div>
          ) : null}

          {/* ── RECITE ── */}
          {phase === 'recite' ? (
            <motion.div
              key="recite"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col gap-3"
            >
              <PassageDock passage={passage} />
              <ReciteStep sentences={reciteSentences} onAllComplete={handleReciteComplete} />
            </motion.div>
          ) : null}

          {/* ── WRITE ── */}
          {phase === 'write' ? (
            <motion.div
              key="write"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28 }}
              className="flex flex-col gap-3"
            >
              <PassageDock passage={passage} />
              <WriteStep passage={passage} level={level} onResolved={handleWriteResolved} onFinish={handleFinish} />
            </motion.div>
          ) : null}

          {/* ── DONE ── */}
          {phase === 'done' ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-1 flex-col justify-center gap-3"
            >
              <div className="nc-signal-panel p-4 text-center">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Passasje fullført</div>
                <h2 className="mt-2 text-balance text-[1.6rem] font-extrabold leading-[0.98] text-[var(--nc-signal-fg)]">{[bricks.read, bricks.recite, bricks.write].filter(Boolean).length} murstein lagt</h2>
                <div className="mt-4 grid grid-cols-3 gap-1.5">
                  {[
                    { k: 'Lest', on: bricks.read },
                    { k: 'Sagt', on: bricks.recite },
                    { k: 'Skrevet', on: bricks.write },
                  ].map((t) => (
                    <div key={t.k} className="rounded-[0.5rem] bg-[rgba(6,16,23,0.90)] px-2 py-3">
                      <div className="mx-auto h-[10px] w-4 rounded-[2px]" style={{ background: t.on ? 'var(--nc-signal)' : 'rgba(255,255,255,0.14)' }} />
                      <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-[rgba(255,255,255,0.6)]">{t.k}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[0.8125rem] text-[rgba(10,18,6,0.62)]">Fremgangen er registrert i fingeravtrykket ditt.</p>
              </div>
              <button onClick={() => router.push('/dashboard')} className="nc-button-primary w-full py-3.5 text-[0.875rem] font-bold">
                Tilbake til dashboard
              </button>
            </motion.div>
          ) : null}

        </AnimatePresence>
      </main>
      <BottomNav active="home" />
    </div>
  )
}
