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
import { markLaneDone } from '@/lib/lane-completion'
import { incrementStreak } from '@/lib/streak'
import { createClient } from '@/lib/supabase/client'
import { getConceptPhase, isMastered } from '@/engine'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { formatNextReview } from '@/lib/srs-format'
import { ERROR_TAG_LABELS } from '@/lib/error-tag-labels'

const PHASE_STYLES: Record<string, string> = {
  locked: 'bg-[rgba(255,255,255,0.04)] text-[var(--nc-text-dim)] border border-[rgba(255,255,255,0.06)]',
  intro: 'bg-[rgba(255,255,255,0.06)] text-[var(--nc-text-muted)] border border-[rgba(255,255,255,0.08)]',
  practice: 'bg-[var(--nc-signal-tint)] text-[var(--nc-signal)] border border-[var(--nc-signal-border)]',
  consolidation: 'bg-[var(--nc-green-tint)] text-[var(--nc-green)] border border-[var(--nc-green-border)]',
  maintenance: 'bg-[var(--nc-green-tint)] text-[var(--nc-green)] border border-[var(--nc-green-border)]',
}
const PHASE_LABELS: Record<string, string> = {
  locked: 'Låst',
  intro: 'Intro',
  practice: 'Øving',
  consolidation: 'Konsolidering',
  maintenance: 'Vedlikehold',
}

type RepairEntry = { conceptId: string; label: string; tags: string[] }

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

      void createClient().auth.getSession().then(({ data: { session: authSession } }) => {
        if (authSession?.user) {
          logSessionResults(authSession.user.id, results)
        }
      })

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
        markLaneDone('session')
        // Count today toward the day-streak. incrementStreak is idempotent per
        // day; without this call the "Rekke" tile was permanently 0 (it had no
        // writer anywhere in the app).
        incrementStreak()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  const totalAnswered = results.length
  const correctCount = results.filter((result) => result.correct).length
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
  const duration = session ? formatDuration(session.startedAt) : '0:00'
  const practicedConceptIds = [...new Set(results.map((result) => result.conceptId))]
  const conceptsCount = practicedConceptIds.length

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
  const primaryConceptNode = conceptGraph.concepts.find((concept) => concept.id === primaryFocus)
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

  if (!session && results.length === 0) {
    return null
  }

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell nc-flow-shell">

        {/* Back button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToDashboard}
            className="nc-glass flex size-11 items-center justify-center text-[var(--nc-text)] transition-transform hover:-translate-y-0.5"
            aria-label="Til dashboard"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* ── Hero: lime celebration panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="nc-signal-panel p-3.5"
        >
          <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Økt fullført</div>
          <h1 className="mt-1.5 text-balance font-display text-[2rem] font-extrabold leading-[0.94] tracking-[-0.03em] text-[var(--nc-signal-fg)]">
            Ferdig.
          </h1>
          <p className="mt-2 text-[0.82rem] text-[rgba(10,18,6,0.60)]">
            {productionCount > 0 ? `${productionCount} produksjonsøvelser.` : `${totalAnswered} oppgaver.`}
          </p>

          <div className="mt-4 flex justify-center">
            <ScoreCircle accuracy={accuracy} size={160} tone="light" />
          </div>

          {/* Stat strip inside lime panel — dark surface for contrast */}
          <div className="mt-4 grid grid-cols-3 gap-[6px]">
            {[
              { label: 'Produksjon', value: String(productionCount) },
              { label: 'Tid brukt', value: duration },
              { label: 'Konsepter', value: String(conceptsCount) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[0.45rem] bg-[rgba(10,18,6,0.88)] px-2 py-2.5 text-center">
                <div className="font-display text-[1.55rem] font-extrabold tabular-nums leading-none text-white">
                  {stat.value}
                </div>
                <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.10em] text-white/40">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Worked concepts (dark) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="nc-glass p-3"
        >
          <div className="nc-label mb-2.5">Arbeidet</div>
          <div className="flex flex-col gap-2">
            {practicedConceptIds.slice(0, 3).map((id) => {
              const node = conceptGraph.concepts.find((concept) => concept.id === id)
              const mastery = fingerprint?.conceptMastery[id]
              const phase = getConceptPhase(mastery, node?.prerequisites ?? [], masteredIds)
              const phaseStyle = PHASE_STYLES[phase] ?? PHASE_STYLES.intro
              const phaseLabel = PHASE_LABELS[phase] ?? phase
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-[0.5rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5"
                >
                  <span className="text-[0.84rem] font-semibold text-[var(--nc-text)]">
                    {node?.label ?? id}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${phaseStyle}`}>
                    {phaseLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* ── Repair entries (dark) ── */}
        {wrongResults.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="nc-glass p-3"
          >
            <div className="mb-2.5 flex items-center justify-between gap-3">
              <div className="nc-label-red">{wrongResults.length} mønstre reparert</div>
              {nextReviewLabel ? (
                <div className="nc-chip-signal rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]">
                  {nextReviewLabel}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              {repairEntries.map((entry) => (
                <div
                  key={entry.conceptId}
                  className="rounded-[0.5rem] border border-[var(--nc-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2.5"
                >
                  <div className="text-[0.84rem] font-semibold text-[var(--nc-text)]">
                    {entry.label}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--nc-signal-border)] bg-[var(--nc-signal-tint)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-[var(--nc-signal)]"
                      >
                        {ERROR_TAG_LABELS[tag] ?? tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}

        {/* ── Reflection (cream) ── */}
        <AnimatePresence>
          {!reflectionSubmitted ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ delay: 0.24 }}
              className="nc-glass-cream p-3"
            >
              <div className="nc-label text-[var(--nc-cream-dim)]">Reflekter et øyeblikk</div>
              <p className="mt-2 text-pretty text-[0.88rem] font-semibold leading-[1.5] text-[var(--nc-cream-text)]">
                {reflectionPrompt}
              </p>
              <textarea
                className="mt-3 w-full resize-none rounded-[0.65rem] border border-[rgba(17,21,24,0.12)] bg-[rgba(255,255,255,0.55)] px-3.5 py-3 text-[0.88rem] text-[var(--nc-cream-text)] placeholder:text-[var(--nc-cream-dim)] focus:border-[rgba(200,255,32,0.55)] focus:outline-none transition-colors"
                rows={2}
                placeholder="Skriv kort her..."
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
              />
              <button
                onClick={submitReflection}
                className="nc-button-dark mt-3 w-full py-3 text-[0.88rem] font-bold"
              >
                {reflectionText.trim() ? 'Del og fortsett' : 'Hopp over'}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Next step (dark) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
          className="nc-glass p-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="nc-label mb-1.5">Neste</div>
              <div className="text-[0.92rem] font-bold text-[var(--nc-text)]">
                {nextConceptNode?.label ?? primaryConceptNode?.label ?? 'Fortsett med A1'}
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--nc-signal)] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[var(--nc-signal-fg)]">
              Klar
            </span>
          </div>
          <button
            onClick={goToDashboard}
            className="nc-button-primary mt-3.5 w-full py-3 text-[0.9rem] font-bold"
          >
            Til dashboard
          </button>
        </motion.div>

      </main>

      <BottomNav active="session" />
    </div>
  )
}
