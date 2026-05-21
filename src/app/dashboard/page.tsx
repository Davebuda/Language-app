'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play, Mic, ArrowRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useFingerprint } from '@/hooks/useFingerprint'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useAuth } from '@/hooks/useAuth'
import { generateSession, type SchedulerOutput } from '@/engine/scheduler'
import { getConceptPhase, isMastered } from '@/engine'
import type { ConceptPhase } from '@/engine'
import { BottomNav } from '@/components/layout/BottomNav'
import { DailyWordPack } from '@/components/DailyWordPack'
import { ProgressReassuranceStrip } from '@/components/ProgressReassuranceStrip'
import { LevelBadge } from '@/components/dashboard/LevelSelector'
import { getDailyRule } from '@/lib/dailyContent'
import { getStreak } from '@/lib/streak'
import { MOCK_SENTENCES, MOCK_SENTENCE_IDS } from '@/lib/mock-sentences'
import { getConceptColor } from '@/lib/concept-colors'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph


// Maps concept IDs to suggested conversation topics (Norwegian display labels)
const CONCEPT_TO_TOPIC: Record<string, string> = {
  'v2-word-order':        'daglig rutine',
  'present-tense-verbs':  'daglig rutine',
  'negation-placement':   'daglig rutine',
  'days-of-week':         'daglig rutine',
  'common-questions':     'daglig rutine',
  'noun-gender':          'mat og drikke',
  'indefinite-articles':  'mat og drikke',
  'basic-numbers':        'mat og drikke',
  'personal-pronouns':    'familie',
  'adjective-agreement':  'Norge',
  'prepositions-place':   'Norge',
  'past-tense-regular':   'Norge',
  'modal-verbs':          'jobb',
}

// Texts available per CEFR level (from SEED_TEXTS in reading/page.tsx)
const READING_TEXT_COUNTS: Record<string, number> = {
  A1: 2,
  A2: 2,
  B1: 0,
  B2: 0,
}

// Journal prompts (mirrors PROMPTS in WritingEditor — must stay in sync)
const DASHBOARD_PROMPTS = [
  'Beskriv din ideelle norske helg',
  'Hva liker du best med vinteren?',
  'Skriv om et sted du vil besøke i Norge',
  'Beskriv deg selv på norsk',
  'Hva er din favorittmat, og hvorfor?',
]

function todayFormatted(): string {
  return new Date().toLocaleDateString('nb-NO', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function DashboardPage() {
  useFingerprint()
  const router = useRouter()
  const { fingerprint, status } = useFingerprintStore()
  const { user } = useAuth()
  const [plan, setPlan] = useState<SchedulerOutput | null>(null)
  const [showLevelUp, setShowLevelUp] = useState(false)
  const streak = getStreak()

  // Level-up celebration when A1→A2 transition fires
  useEffect(() => {
    try {
      if (localStorage.getItem('norskcoach_levelup_pending') === '1') {
        localStorage.removeItem('norskcoach_levelup_pending')
        setShowLevelUp(true)
        setTimeout(() => setShowLevelUp(false), 4000)
      }
    } catch { /* ignore */ }
  }, [fingerprint?.currentLevel])

  useEffect(() => {
    if (!localStorage.getItem('norskcoach_onboarded')) {
      localStorage.setItem('norskcoach_onboarded', 'true')
    }
  }, [])

  const activeGraph =
    fingerprint?.currentLevel === 'A2' ||
    fingerprint?.currentLevel === 'B1' ||
    fingerprint?.currentLevel === 'B2'
      ? a2Graph : a1Graph

  useEffect(() => {
    if (status === 'loading' || !fingerprint) return
    const output = generateSession({
      fingerprint,
      graph: activeGraph,
      availableSentenceIds: MOCK_SENTENCE_IDS,
      sentences: MOCK_SENTENCES,
    })
    setPlan(output)
  }, [fingerprint, status, activeGraph])

  // Recalibration: only show if user has an actual session history (avoids the "always show" bug)
  const showRecalibrationSuggestion = (() => {
    if (!fingerprint) return false
    const lastSession = fingerprint.lastSessionAt
    if (!lastSession) return false // never shown to brand-new users
    const daysSince = (Date.now() - new Date(lastSession).getTime()) / 86_400_000
    return daysSince > 7
  })()

  const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Gjest'
  const levelLabel = fingerprint?.currentLevel ?? 'A1'

  const primaryConcept = activeGraph.concepts.find(
    (c) => c.id === (plan?.primaryFocus ?? 'noun-gender'),
  )
  const sessionTitle = primaryConcept?.label ?? 'Norwegian Foundations'
  const estimatedMin = plan
    ? Math.max(1, Math.ceil((plan.session.items.length * 45) / 60))
    : 18
  const remediation = plan?.session.items.filter((i) => i.purpose === 'remediation').length ?? 0
  const review      = plan?.session.items.filter((i) => i.purpose === 'review').length ?? 0
  const newMaterial = plan?.session.items.filter((i) => i.purpose === 'new-material').length ?? 0

  // Compact stats
  const attemptedMastery = Object.values(fingerprint?.conceptMastery ?? {}).filter(
    (m) => m.attemptCount > 0,
  )
  const accuracy = attemptedMastery.length > 0
    ? Math.round(attemptedMastery.reduce((s, m) => s + m.decayedScore, 0) / attemptedMastery.length)
    : 0
  const speakingMins = Math.round(fingerprint?.speakingMinutesTotal ?? 0)

  // "Currently learning" — named concepts, non-locked only, max 5
  const activeConcepts = useMemo(() => {
    const masteredIds = new Set(
      activeGraph.concepts
        .filter((c) => isMastered(
          fingerprint?.conceptMastery[c.id],
          c.masteryThreshold,
          c.minAttempts,
          c.minDays,
        ))
        .map((c) => c.id),
    )

    return activeGraph.concepts
      .map((c, i) => {
        const mastery = fingerprint?.conceptMastery[c.id]
        const phase = getConceptPhase(mastery, c.prerequisites, masteredIds)
        return {
          id: c.id,
          label: c.label,
          phase,
          score: mastery ? Math.round(mastery.decayedScore) : 0,
          color: getConceptColor(c.id, i),
        }
      })
      .filter((c) => c.phase !== 'locked')
      .sort((a, b) => {
        const order: Record<ConceptPhase, number> = {
          practice: 0, consolidation: 1, intro: 2, maintenance: 3, locked: 4,
        }
        return order[a.phase] - order[b.phase]
      })
      .slice(0, 5)
  }, [fingerprint, activeGraph])

  // Speak card — suggest a topic based on the learner's weakest active concept
  const suggestedTopic = useMemo(() => {
    const target = activeConcepts.find(
      (c) => c.phase === 'practice' || c.phase === 'consolidation',
    )
    return target ? (CONCEPT_TO_TOPIC[target.id] ?? 'daglig rutine') : 'daglig rutine'
  }, [activeConcepts])

  // Read card — texts at learner's level
  const textsAtLevel = READING_TEXT_COUNTS[levelLabel] ?? 0

  const dailyRule = getDailyRule()

  // Write card — today's prompt teaser (first 38 chars + ellipsis)
  const todayPrompt = DASHBOARD_PROMPTS[new Date().getDay() % DASHBOARD_PROMPTS.length]
  const promptTeaser = todayPrompt.length > 38 ? todayPrompt.slice(0, 38) + '…' : todayPrompt

  return (
    <div className="nc-gradient-page flex min-h-dvh flex-col">
      <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-text-dim)]">
              {todayFormatted()}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h1 className="text-balance font-display text-[2rem] font-bold leading-tight tracking-tight text-[var(--nc-text)]">
                God kveld, {displayName}!
              </h1>
              <LevelBadge />
            </div>
          </div>
        </div>

        {/* ── Level-up toast ── */}
        <AnimatePresence>
          {showLevelUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="nc-glass-elevated p-4 text-center"
            >
              <div className="mb-1 text-2xl">🎉</div>
              <div className="text-[17px] font-extrabold text-[var(--nc-green)]">
                Nivå opp! Du er nå A2
              </div>
              <div className="mt-1 text-[12px] text-[var(--nc-text-dim)]">
                Du har mestret alle A1-konsepter. Neste nivå er låst opp.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── B1/B2 graph notice ── */}
        <AnimatePresence>
          {(fingerprint?.currentLevel === 'B1' || fingerprint?.currentLevel === 'B2') && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="nc-glass px-4 py-3"
            >
              <p className="text-[12px] leading-6 text-[var(--nc-text-muted)]">
                <span className="font-semibold text-[var(--nc-text)]">
                  {fingerprint.currentLevel} content is in development.
                </span>{' '}
                You&apos;re practicing A2 material at higher intensity until it ships.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Guest banner — white surface ── */}
        {!user && (
          <div className="nc-surface flex items-center justify-between gap-3 px-4 py-2.5">
            <p className="text-[12px] text-[#111110]/60">
              Logg inn for å synkronisere fremgangen din
            </p>
            <Link
              href="/login"
              className="nc-button-primary shrink-0 px-3 py-1.5 text-[12px] font-bold"
            >
              Logg inn
            </Link>
          </div>
        )}

        {/* ── TODAY'S SESSION — primary action ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="nc-glass-cream p-5"
        >
          <div className="nc-label mb-2 text-[var(--nc-cream-dim)]">{"Today's session · "}{levelLabel}</div>
          <div className="font-display text-[1.5rem] font-bold text-[var(--nc-cream-text)] text-balance mt-1">
            {sessionTitle}
          </div>
          <p className="mt-2 text-[12px] text-[var(--nc-cream-muted)] text-pretty">
            Estimated: {estimatedMin} min
          </p>
          <motion.button
            onClick={() => router.push('/session')}
            whileTap={{ scale: 0.97 }}
            className="nc-button-primary mt-4 inline-flex min-h-[48px] items-center gap-2 px-5 py-3 text-sm"
            aria-label="Start today's session"
          >
            <Play size={14} aria-hidden="true" />
            Start session
          </motion.button>

          {/* Session composition badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {remediation > 0 && (
              <span className="rounded-[0.65rem] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-1.5 text-[10px] font-semibold text-[var(--nc-red)]">
                {remediation} repairs
              </span>
            )}
            {review > 0 && (
              <span className="rounded-[0.65rem] border border-[rgba(4,14,8,0.14)] bg-[rgba(4,14,8,0.04)] px-3 py-1.5 text-[10px] font-semibold text-[var(--nc-cream-muted)]">
                {review} review
              </span>
            )}
            {newMaterial > 0 && (
              <span className="rounded-[0.65rem] border border-[var(--nc-teal-border)] bg-[var(--nc-teal-tint)] px-3 py-1.5 text-[10px] font-semibold text-[var(--nc-teal)]">
                {newMaterial} new
              </span>
            )}
          </div>

          {/* ── Grammar moment ── */}
          <div className="mt-4 border-t border-[rgba(4,14,8,0.12)] pt-4">
            <p className="font-display text-[1.35rem] font-bold leading-tight text-[var(--nc-cream-text)] text-balance">
              {dailyRule.norwegianExample}
            </p>
            <p className="mt-1.5 text-[11px] text-[var(--nc-cream-muted)] leading-relaxed text-pretty">
              {dailyRule.ruleExplanation}
            </p>
          </div>
        </motion.div>

        {/* ── Speak — Muntlig ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="nc-glass-cream p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="nc-label mb-2 text-[var(--nc-cream-dim)]">MUNTLIG</div>
              <div className="font-display text-[1.2rem] font-bold leading-tight text-[var(--nc-cream-text)] text-balance">
                Snakk med Kari
              </div>
              <p className="mt-1 text-[14px] text-[var(--nc-cream-muted)] text-pretty">
                Foreslått tema:{' '}
                <span className="font-semibold text-[var(--nc-cream-text)]">{suggestedTopic}</span>
              </p>
              {speakingMins > 0 && (
                <p className="mt-1 text-[11px] text-[var(--nc-cream-dim)]">
                  {speakingMins} min snakket totalt
                </p>
              )}
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[rgba(4,14,8,0.14)] bg-[rgba(4,14,8,0.06)]">
              <Mic size={18} className="text-[var(--nc-cream-muted)]" aria-hidden="true" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/conversation"
              aria-label="Start norsk samtale"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-[rgba(4,14,8,0.20)] bg-[rgba(4,14,8,0.06)] px-4 py-2.5 text-[13px] font-bold text-[var(--nc-cream-text)] hover:bg-[rgba(4,14,8,0.10)]"
            >
              <Play size={13} aria-hidden="true" />
              Start samtale
            </Link>
            <Link
              href="/shadow"
              aria-label="Øv på skygging"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-[rgba(4,14,8,0.14)] bg-transparent px-4 py-2.5 text-[13px] font-semibold text-[var(--nc-cream-muted)] hover:bg-[rgba(4,14,8,0.06)] hover:text-[var(--nc-cream-text)]"
            >
              Skygging
            </Link>
            <Link
              href="/drills"
              aria-label="Øv på uttale"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-[rgba(4,14,8,0.14)] bg-transparent px-4 py-2.5 text-[13px] font-semibold text-[var(--nc-cream-muted)] hover:bg-[rgba(4,14,8,0.06)] hover:text-[var(--nc-cream-text)]"
            >
              Uttaleøvelser
            </Link>
            <Link
              href="/listen"
              aria-label="Øv på å lytte og svare"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-[rgba(4,14,8,0.14)] bg-transparent px-4 py-2.5 text-[13px] font-semibold text-[var(--nc-cream-muted)] hover:bg-[rgba(4,14,8,0.06)] hover:text-[var(--nc-cream-text)]"
            >
              Lytt og svar
            </Link>
            <Link
              href="/roleplay"
              aria-label="Øv på rollespill"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] border border-[rgba(4,14,8,0.14)] bg-transparent px-4 py-2.5 text-[13px] font-semibold text-[var(--nc-cream-muted)] hover:bg-[rgba(4,14,8,0.06)] hover:text-[var(--nc-cream-text)]"
            >
              Rollespill
            </Link>
          </div>
        </motion.div>

        {/* ── Write — Skrivejournal ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="nc-glass p-4"
        >
          <div className="nc-label mb-2 text-[var(--nc-text-dim)]">SKRIVEJOURNAL</div>
          <p className="text-[14px] italic text-[var(--nc-text-muted)] text-pretty">
            &ldquo;{promptTeaser}&rdquo;
          </p>
          <Link
            href="/journal"
            aria-label="Skriv i journalen i dag"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--nc-text)] hover:text-[var(--nc-text-muted)]"
          >
            Skriv i dag <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </motion.div>

        {/* ── Read — Lesestudio ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20 }}
          className="nc-glass p-4"
        >
          <div className="nc-label mb-2 text-[var(--nc-text-dim)]">LESESTUDIO</div>
          <p className="text-[14px] text-[var(--nc-text-muted)] text-pretty">
            {textsAtLevel > 0
              ? `${textsAtLevel} tekster på ditt ${levelLabel}-nivå`
              : 'Tekster tilgjengelig for lesing'}
          </p>
          <Link
            href="/reading"
            aria-label="Bla gjennom lesetekster"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--nc-text)] hover:text-[var(--nc-text-muted)]"
          >
            Bla gjennom <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </motion.div>

        {/* ── Daily Word Pack ── */}
        <DailyWordPack />

        {/* ── Progress Reassurance Strip ── */}
        <ProgressReassuranceStrip />

        {/* ── Stats — compact 4-column ── */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: 'streak',      value: String(streak),       color: 'var(--nc-red)' },
            { label: 'mins spoken', value: String(speakingMins), color: 'var(--nc-text)' },
            { label: 'accuracy',    value: attemptedMastery.length > 0 ? `${accuracy}%` : '—', color: 'var(--nc-green)' },
            { label: 'sessions',    value: String(fingerprint?.totalSessionsCompleted ?? 0), color: 'var(--nc-text-muted)' },
          ].map((s) => (
            <div
              key={s.label}
              className="nc-glass-stat px-2.5 py-2 text-center"
            >
              <div
                className="font-display tabular-nums text-[1.25rem] font-bold leading-none tracking-tight"
                style={{ color: s.color }}
              >
                {s.value}
              </div>
              <div className="mt-1.5 text-[9px] font-medium leading-tight text-[var(--nc-text-dim)]">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Concepts in focus ── */}
        {activeConcepts.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-2">
              <div
                className="size-2 shrink-0 rounded-full"
                style={{ background: activeConcepts[0]?.color ?? 'var(--nc-text-dim)' }}
                aria-hidden="true"
              />
              <span className="truncate text-[12px] text-[var(--nc-text-muted)]">
                {activeConcepts.length === 1 ? '1 concept in focus' : `${activeConcepts.length} concepts in focus`}
                {activeConcepts[0] &&
                  ` — ${activeConcepts[0].label}${activeConcepts.length > 1 ? ` +${activeConcepts.length - 1}` : ''}`}
              </span>
            </div>
            <Link
              href="/progress"
              aria-label="View all concepts"
              className="shrink-0 text-[11px] font-semibold text-[var(--nc-text-dim)] hover:text-[var(--nc-text)]"
            >
              View all →
            </Link>
          </div>
        )}

        {/* ── Recalibration banner ── */}
        <AnimatePresence>
          {showRecalibrationSuggestion && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="nc-glass border-l-4 border-l-[var(--nc-red)] flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-[13px] font-semibold text-[var(--nc-text)]">Been a while?</p>
                <p className="mt-0.5 text-[11px] text-[var(--nc-text-dim)] text-pretty">
                  Quick 7-question check to recalibrate your profile.
                </p>
              </div>
              <motion.button
                onClick={() => router.push('/recalibrate')}
                whileTap={{ scale: 0.97 }}
                aria-label="Start recalibration quiz"
                className="nc-button-primary shrink-0 px-3 py-2 text-[12px] font-bold"
              >
                Start
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
      <BottomNav active="home" />
    </div>
  )
}
