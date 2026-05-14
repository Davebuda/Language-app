'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useFingerprint } from '@/hooks/useFingerprint'
import { saveFingerprint } from '@/storage/indexeddb'
import { emitEvent } from '@/lib/events'
import { RecalibrationQuiz } from '@/components/onboarding/RecalibrationQuiz'
import type { RecalibrationResult } from '@/lib/diagnostic/recalibration'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph

export default function RecalibratePage() {
  const router = useRouter()
  useFingerprint()
  const { fingerprint, setFingerprint } = useFingerprintStore()

  if (!fingerprint) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-nc-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-nc-border border-t-nc-violet" />
      </div>
    )
  }

  const graph = fingerprint.currentLevel === 'A2' ? a2Graph : a1Graph

  function handleComplete(result: RecalibrationResult) {
    setFingerprint(result.fingerprint)
    saveFingerprint(result.fingerprint).catch(console.warn)

    emitEvent({
      eventType: 'session_completed',
      mode: 'recalibration',
      conceptIds: result.updatedConceptIds,
      payload: {
        questionCount: result.fingerprint.askedDiagnosticQuestionIds.length,
        updatedConcepts: result.updatedConceptIds,
      },
    })

    router.push('/dashboard?recalibrated=1')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-transparent">
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-5">
        <button
          onClick={() => router.push('/dashboard')}
          className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-nc-border bg-white text-nc-text-dim transition-colors hover:text-nc-text"
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-[13px] font-medium text-nc-text-muted">Back to dashboard</span>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col"
        >
          <RecalibrationQuiz
            fingerprint={fingerprint}
            graph={graph}
            onComplete={handleComplete}
            onSkip={() => router.push('/dashboard')}
          />
        </motion.div>
      </div>
    </div>
  )
}
