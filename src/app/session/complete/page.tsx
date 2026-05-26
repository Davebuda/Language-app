'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSessionStore } from '@/stores/session-store'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { saveFingerprint } from '@/storage/indexeddb'
import { ScoreCircle } from '@/components/session/ScoreCircle'
import { BottomNav } from '@/components/layout/BottomNav'
import { emitEvent } from '@/lib/events'
import { logSessionResults } from '@/lib/logEvents'
import { createClient } from '@/lib/supabase/client'
import { getConceptPhase, isMastered } from '@/engine'
import { getGraphForLevel } from '@/lib/concept-graph-loader'

const ERROR_TAG_LABELS: Partial<Record<string, string>> = {
  'word-order': 'Ordstilling',
  'verb-tense': 'Verbtid',
  'verb-conjugation': 'Verbform',
  'noun-gender': 'Substantivkjønn',
  'article-use': 'Artikkelbruk',
  'adjective-agreement': 'Adjektivsamsvar',
  'pronoun-choice': 'Pronomen',
  'preposition': 'Preposisjon',
  'modal-verb': 'Modalverb',
  'negation-placement': 'Negasjon',
  'compound-word': 'Sammensatt ord',
  'spelling': 'Stavefeil',
  'wrong-word-same-category': 'Feil ord',
  'unspecified': 'Grammatikk',
}

const PHASE_STYLES: Record<string, string> = {
  locked:        'bg-[rgba(255,255,255,0.04)] text-[var(--nc-text-dim)] border border-[rgba(255,255,255,0.08)]',
  intro:         'bg-[rgba(255,255,255,0.06)] text-[var(--nc-text-muted)] border border-[rgba(255,255,255,0.10)]',
  practice:      'bg-[var(--nc-teal-tint)] text-[var(--nc-teal)] border border-[var(--nc-teal-border)]',
  consolidation: 'bg-[var(--nc-green-tint)] text-[var(--nc-green)] border border-[var(--nc-green-border)]',
  maintenance:   'bg-[var(--nc-green-tint)] text-[var(--nc-green)] border border-[var(--nc-green-border)]',
}
const PHASE_LABELS: Record<string, string> = {
  locked: 'Låst', intro: 'Intro', practice: 'Øving',
  consolidation: 'Konsolidering', maintenance: 'Vedlikehold',
}

type RepairEntry = { conceptId: string; label: string; tags: string[] }

function formatNextReview(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const days = Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86400000)
  if (days <= 0) return 'I dag'
  if (days === 1) return 'I morgen'
  return `Om ${days} dager`
}

const REFLECTION_PROMPTS = [
  'Hva føltes vanskeligst akkurat nå?',
  'Hvor nølte du mest?',
  'Hvilken øvelse overrasket deg?',
  'Hva vil du huske til neste økt?',
] as const

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
  const conceptGraph = getGraphForLevel(fingerprint?.currentLevel ?? 'A1')

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

      // Fire-and-forget: anonymized event log for aggregate analysis.
      // Auth users only — guests are skipped inside logSessionResults.
      void createClient().auth.getSession().then(({ data: { session: authSession } }) => {
        if (authSession?.user) {
          logSessionResults(authSession.user.id, results)
        }
      })

      // Write session counter and timestamp — these were never updated before this fix,
      // which caused the sessions stat to stay at 0 and the recalibration banner to never fire.
      const fp = useFingerprintStore.getState().fingerprint
      if (fp) {
        const now = new Date().toISOString()
        const updated = {
          ...fp,
          totalSessionsCompleted: (fp.totalSessionsCompleted ?? 0) + 1,
          calibrationSessionsRemaining: Math.max(0, (fp.calibrationSessionsRemaining ?? 0) - 1),
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

  // masteredIds — matches dashboard/page.tsx pattern using isMastered with node thresholds
  const masteredIds = new Set(
    conceptGraph.concepts
      .filter((c) => isMastered(
        fingerprint?.conceptMastery[c.id],
        c.masteryThreshold,
        c.minAttempts,
        c.minDays,
      ))
      .map((c) => c.id),
  )

  // Repair loop summary — group wrong results by conceptId, collect tags
  const wrongResults = results.filter((r) => !r.correct)
  const repairMap = new Map<string, Set<string>>()
  for (const r of wrongResults) {
    const set = repairMap.get(r.conceptId) ?? new Set<string>()
    if (r.errorTag) set.add(r.errorTag)
    repairMap.set(r.conceptId, set)
  }
  const repairEntries: RepairEntry[] = Array.from(repairMap.entries()).map(([conceptId, tagSet]) => ({
    conceptId,
    label: conceptGraph.concepts.find((c) => c.id === conceptId)?.label ?? conceptId,
    tags: Array.from(tagSet),
  }))

  // Earliest nextReviewAt across wrong-answer concepts
  const earliestNextReview: string | null = repairEntries.reduce<string | null>((earliest, entry) => {
    const nr = fingerprint?.conceptMastery[entry.conceptId]?.nextReviewAt ?? null
    if (!nr) return earliest
    if (!earliest) return nr
    return nr < earliest ? nr : earliest
  }, null)
  const nextReviewLabel = formatNextReview(earliestNextReview)

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

  // P0.5-08 (F023): pre-render guard. The useEffect above also redirects,
  // but renders this null FIRST so the celebration UI never flashes when the
  // user lands here without a real session (direct nav, refresh after exit).
  if (!session && results.length === 0) {
    return null
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
          <p className="mt-2 text-pretty text-sm text-[var(--nc-text-muted)]">
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
            <div className="text-[15px] font-medium text-[var(--nc-text)]">Hva du øvde på</div>
            <div className="mt-3 space-y-3 text-sm text-[var(--nc-text-muted)]">
              {practicedConceptIds.slice(0, 3).map((id) => {
                const node = conceptGraph.concepts.find((concept) => concept.id === id)
                const mastery = fingerprint?.conceptMastery[id]
                const phase = getConceptPhase(mastery, node?.prerequisites ?? [], masteredIds)
                const phaseStyle = PHASE_STYLES[phase] ?? PHASE_STYLES.intro
                const phaseLabel = PHASE_LABELS[phase] ?? phase
                return (
                  <div key={id} className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${phaseStyle}`}>
                      {phaseLabel}
                    </span>
                    <span>{node?.label ?? id}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Repair loop summary — only when there are wrong answers */}
        {wrongResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.20 }}
            className="nc-glass p-5"
          >
            <div className="relative z-[1]">
              <div className="nc-label-red mb-3">
                {wrongResults.length} mønstre reparert
              </div>
              <div className="space-y-3">
                {repairEntries.map((entry) => (
                  <div key={entry.conceptId} className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-medium text-[var(--nc-text)]">
                      {entry.label}
                    </span>
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--nc-teal-tint)] text-[var(--nc-teal)]"
                      >
                        {ERROR_TAG_LABELS[tag] ?? tag}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              {nextReviewLabel && (
                <div className="mt-4 flex items-center gap-2">
                  <span className="nc-label text-[var(--nc-text-dim)]">Første gjennomgang:</span>
                  <span className="nc-label text-[var(--nc-text-muted)]">{nextReviewLabel}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

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
              <p className="mt-2 text-pretty text-[14px] font-medium text-[#111110]">{reflectionPrompt}</p>
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
            <p className="mt-1 text-pretty text-sm text-white/70">
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
