'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '@/stores/session-store'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { saveFingerprint } from '@/storage/indexeddb'
import { ScoreCircle } from '@/components/session/ScoreCircle'
import { BottomNav } from '@/components/layout/BottomNav'
import { emitEvent } from '@/lib/events'
import type { ConceptGraph } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

const REFLECTION_PROMPTS = [
  'Hva føltes vanskeligst akkurat nå?',
  'Hvor nølte du mest?',
  'Hvilken øvelse overrasket deg?',
  'Hva vil du huske til neste økt?',
] as const

const conceptGraph = conceptGraphJson as ConceptGraph

function formatDuration(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime()
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function SessionCompletePage() {
  const router = useRouter()
  const { session, results, endSession } = useSessionStore()
  const { fingerprint, setFingerprint } = useFingerprintStore()

  useEffect(() => {
    if (!session && results.length === 0) {
      router.replace('/dashboard')
      return
    }
    if (session) {
      const correct = results.filter((r) => r.correct).length
      emitEvent({
        eventType: 'session_completed',
        mode: 'session',
        sessionId: session.id,
        conceptIds: [...new Set(results.map((r) => r.conceptId))],
        payload: {
          accuracy: results.length > 0 ? Math.round((correct / results.length) * 100) : 0,
          itemCount: results.length,
          level: session.level,
        },
      })

      // Write session counter and timestamp — these were never updated before this fix,
      // which caused the sessions stat to stay at 0 and the recalibration banner to never fire.
      const fp = useFingerprintStore.getState().fingerprint
      if (fp) {
        const now = new Date().toISOString()
        const updated = {
          ...fp,
          totalSessionsCompleted: (fp.totalSessionsCompleted ?? 0) + 1,
          lastSessionAt: now,
          updatedAt: now,
        }
        setFingerprint(updated)
        saveFingerprint(updated).catch(console.warn)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  const totalAnswered = results.length
  const correctCount = results.filter((result) => result.correct).length
  const accuracy =
    totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
  const duration = session ? formatDuration(session.startedAt) : '0:00'
  const practicedConceptIds = [...new Set(results.map((result) => result.conceptId))]
  const conceptsCount = practicedConceptIds.length

  const productionTypes = new Set([
    'translation-to-norwegian',
    'sentence-transformation',
    'word-order',
    'fill-in-blank',
  ])
  const productionCount = results.filter((r) =>
    session?.items.find((i) => i.id === r.itemId && productionTypes.has(i.exerciseType))
  ).length

  const primaryFocus = session?.primaryFocus ?? practicedConceptIds[0] ?? 'noun-gender'
  const primaryConceptNode = conceptGraph.concepts.find(
    (concept) => concept.id === primaryFocus,
  )
  const nextConceptNode = conceptGraph.concepts.find(
    (concept) =>
      concept.id !== primaryFocus &&
      concept.prerequisites.every(
        (prerequisite) => !!fingerprint?.conceptMastery[prerequisite],
      ),
  )

  const reflectionPrompt = REFLECTION_PROMPTS[
    (session?.id ?? '').charCodeAt(0) % REFLECTION_PROMPTS.length
  ] ?? REFLECTION_PROMPTS[0]

  const [reflectionText, setReflectionText] = useState('')
  const [reflectionSubmitted, setReflectionSubmitted] = useState(false)

  function submitReflection() {
    if (!reflectionText.trim()) {
      goToDashboard()
      return
    }
    setReflectionSubmitted(true)
    emitEvent({
      eventType: 'exercise_result',
      mode: 'reflection',
      sessionId: session?.id,
      payload: { prompt: reflectionPrompt, response: reflectionText.trim() },
    })
    setTimeout(goToDashboard, 600)
  }

  function goToDashboard() {
    endSession()
    router.push('/dashboard')
  }

  return (
    <div className="nc-gradient-page flex flex-col">
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        {/* Top nav */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToDashboard}
            className="nc-glass flex size-10 items-center justify-center text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
            aria-label="Til dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className="nc-glass flex size-10 items-center justify-center text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
            aria-label="Del"
          >
            <Share2 size={17} />
          </button>
        </div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="text-center"
        >
          <h1 className="text-balance font-display text-[2.5rem] font-bold text-[var(--nc-text)]">
            Flott jobb!
          </h1>
          <p className="mt-2 text-sm text-[var(--nc-text-muted)]">
            {productionCount > 0
              ? `${productionCount} produksjonsøvelser fullført — det teller.`
              : 'Bra innsats i dag.'}
          </p>
        </motion.div>

        {/* Score circle + stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="nc-glass-elevated p-5"
        >
          <div className="relative z-[1] flex flex-col items-center gap-4">
            <ScoreCircle accuracy={accuracy} size={172} />

            <div className="grid w-full grid-cols-3 gap-3">
              {[
                { label: 'Produksjon', value: String(productionCount) },
                { label: 'Tid brukt', value: duration },
                { label: 'Konsepter', value: String(conceptsCount) },
              ].map((stat) => (
                <div key={stat.label} className="nc-glass px-3 py-4 text-center">
                  <div className="font-display text-[1.75rem] font-bold text-[var(--nc-text)]">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-[var(--nc-text-muted)]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* What you mastered */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="nc-glass p-5"
        >
          <div className="relative z-[1]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[15px] font-medium text-[var(--nc-text)]">What you mastered</div>
                <div className="mt-3 space-y-3 text-sm text-[var(--nc-text-muted)]">
                  {practicedConceptIds.slice(0, 3).map((id) => {
                    const node = conceptGraph.concepts.find((concept) => concept.id === id)
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <span className="text-[var(--nc-text-dim)]">◌</span>
                        <span>{node?.label ?? id}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <span className="rounded-[0.8rem] border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.12)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--nc-green)]">
                New
              </span>
            </div>
          </div>
        </motion.div>

        {/* Reflection — nc-surface (white writing surface) */}
        <AnimatePresence>
          {!reflectionSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: 0.24 }}
              className="nc-surface p-4"
            >
              <div className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-[#111110]/50">
                Reflekter ett øyeblikk
              </div>
              <p className="mt-2 text-[14px] font-medium text-[#111110]">{reflectionPrompt}</p>
              <textarea
                className="mt-3 w-full resize-none rounded-[0.9rem] border border-black/10 bg-white px-4 py-3 text-sm text-[#111110] placeholder-[#111110]/36 focus:border-[#DC2626]/40 focus:outline-none transition-colors"
                rows={2}
                placeholder="Skriv kort her..."
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={submitReflection}
                  className="flex-1 rounded-[0.85rem] bg-[#111110] py-2.5 text-sm font-medium text-white transition-transform hover:-translate-y-0.5"
                >
                  {reflectionText.trim() ? 'Del og fortsett' : 'Hopp over'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next session — red gradient */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="nc-gradient-red p-5"
        >
          <div className="relative z-[1]">
            <div className="text-[15px] font-medium text-white">Fortsett å lære!</div>
            <p className="mt-1 text-sm text-white/70">
              Neste økt er klar.
            </p>
            <div className="mt-3 text-[14px] font-medium text-white">
              {nextConceptNode?.label ?? primaryConceptNode?.label ?? 'Fortsett med A1'}
            </div>
            <button
              onClick={goToDashboard}
              className="mt-4 rounded-[var(--radius)] border border-white/20 bg-white/14 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              Til dashboard
            </button>
          </div>
        </motion.div>
      </main>

      <BottomNav active="session" />
    </div>
  )
}
