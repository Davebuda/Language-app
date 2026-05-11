'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useSessionStore } from '@/stores/session-store'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { ScoreCircle } from '@/components/session/ScoreCircle'
import { BottomNav } from '@/components/layout/BottomNav'
import type { ConceptGraph } from '@/types/concepts'
import conceptGraphJson from '@content/concepts/a1-graph.json'

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
  const { fingerprint } = useFingerprintStore()

  useEffect(() => {
    if (!session && results.length === 0) {
      router.replace('/dashboard')
    }
  }, [results, router, session])

  const totalAnswered = results.length
  const correctCount = results.filter((result) => result.correct).length
  const accuracy =
    totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
  const duration = session ? formatDuration(session.startedAt) : '0:00'
  const practicedConceptIds = [...new Set(results.map((result) => result.conceptId))]
  const conceptsCount = practicedConceptIds.length

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

  function goToDashboard() {
    endSession()
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-transparent">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pb-6 pt-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToDashboard}
            className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-nc-border bg-white text-nc-text"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-nc-border bg-white text-nc-text"
          >
            <Share2 size={17} />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-[2.35rem] font-display font-semibold text-nc-text">
            Flott jobb! 👋
          </h1>
          <p className="mt-2 text-sm text-nc-text-muted">
            {"You're getting better every day."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="nc-panel-soft p-5"
        >
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_20%,rgba(185,176,255,0.14),transparent_60%)]" />
          <div className="absolute left-10 top-28 h-2 w-2 rounded-full bg-nc-green" />
          <div className="absolute right-12 top-20 h-2.5 w-2.5 rounded-full bg-nc-violet" />
          <div className="absolute left-20 top-36 h-1.5 w-1.5 rounded-full bg-nc-apricot" />
          <div className="absolute right-20 top-38 h-1.5 w-1.5 rounded-full bg-nc-apricot" />

          <div className="relative z-[1] flex flex-col items-center gap-4">
            <ScoreCircle accuracy={accuracy} size={164} />

            <div className="grid w-full grid-cols-3 gap-3">
              {[
                { label: 'Correct answers', value: `${correctCount} / ${totalAnswered}` },
                { label: 'Time spent', value: duration },
                { label: 'New concepts', value: String(conceptsCount) },
              ].map((stat) => (
                <div key={stat.label} className="nc-panel px-3 py-3 text-center">
                  <div className="text-[18px] font-display font-semibold text-nc-text">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-[10px] font-medium text-nc-text-dim">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="nc-panel-dark p-5">
          <div className="relative z-[1]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[15px] font-medium text-white">What you mastered</div>
                <div className="mt-3 space-y-3 text-sm text-white/72">
                  {practicedConceptIds.slice(0, 3).map((id) => {
                    const node = conceptGraph.concepts.find((concept) => concept.id === id)
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <span className="text-white/75">◌</span>
                        <span>{node?.label ?? id}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <span className="rounded-[0.8rem] border border-[rgba(214,255,90,0.18)] bg-[rgba(214,255,90,0.10)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-nc-green">
                New
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[1rem] border border-[rgba(214,255,90,0.30)] bg-[linear-gradient(135deg,rgba(214,255,90,0.42)_0%,rgba(251,247,241,0.94)_78%)] px-4 py-4">
          <div className="text-[15px] font-medium text-nc-text">Keep going!</div>
          <p className="mt-1 text-sm text-nc-text-muted">
            Your next session is ready.
          </p>
          <div className="mt-3 text-[14px] font-medium text-nc-text">
            {nextConceptNode?.label ?? primaryConceptNode?.label ?? 'Continue with A1'}
          </div>
          <button
            onClick={goToDashboard}
            className="nc-button-lime mt-4 px-4 py-3 text-sm font-medium"
          >
            Continue learning
          </button>
        </div>
      </main>

      <BottomNav active="session" />
    </div>
  )
}
