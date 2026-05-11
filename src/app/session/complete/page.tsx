'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  }, [session, results, router])

  const totalAnswered = results.length
  const correctCount = results.filter((r) => r.correct).length
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0
  const duration = session ? formatDuration(session.startedAt) : '0:00'
  const practicedConceptIds = [...new Set(results.map((r) => r.conceptId))]
  const conceptsCount = practicedConceptIds.length

  const primaryFocus = session?.primaryFocus ?? practicedConceptIds[0] ?? 'noun-gender'
  const primaryConceptNode = conceptGraph.concepts.find((c) => c.id === primaryFocus)
  const nextConceptNode = conceptGraph.concepts.find(
    (c) =>
      c.id !== primaryFocus &&
      c.prerequisites.every((p) => !!fingerprint?.conceptMastery[p])
  )

  function goToDashboard() {
    endSession()
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center gap-6 px-5 pb-4 pt-10">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-[22px] font-extrabold text-white">Flott jobb! 👏</h1>
          <p className="mt-1 text-[13px] text-white/35">Dagens økt fullført</p>
        </motion.div>

        {/* Score circle */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 180, damping: 18 }}
        >
          <ScoreCircle accuracy={accuracy} size={120} />
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex w-full justify-around"
        >
          {[
            { label: 'Nøyaktighet', value: `${accuracy}%` },
            { label: 'Tid', value: duration },
            { label: 'Konsepter', value: String(conceptsCount) },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <span className="text-[20px] font-extrabold text-white">{value}</span>
              <span className="text-[10px] text-white/30">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* Next session card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full rounded-2xl bg-nc-card border border-nc-green/20 p-4"
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-nc-green/60">
            🌱 Neste økt
          </div>
          <div className="mb-1 text-[15px] font-bold text-white">
            {nextConceptNode?.label ?? primaryConceptNode?.label ?? 'Fortsett med A1'}
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-white/45">
            {accuracy >= 80
              ? 'Bra jobbet! Vi fortsetter med neste konsept.'
              : 'Litt mer øvelse, så er du klar for neste steg.'}
          </p>
          <button
            onClick={goToDashboard}
            className="w-full rounded-xl bg-nc-green py-2.5 text-[13px] font-bold text-[#0d0d14]"
          >
            Gå til dashbord
          </button>
        </motion.div>

        {/* Practiced concepts */}
        {practicedConceptIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="w-full"
          >
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/30">
              Øvde på
            </div>
            <div className="flex flex-wrap gap-2">
              {practicedConceptIds.map((id) => {
                const node = conceptGraph.concepts.find((c) => c.id === id)
                return (
                  <span
                    key={id}
                    className="rounded-full bg-nc-card border border-nc-border px-3 py-1 text-[11px] font-semibold text-white/70"
                  >
                    {node?.label ?? id}
                  </span>
                )
              })}
            </div>
          </motion.div>
        )}
      </main>

      <BottomNav active="session" />
    </div>
  )
}
