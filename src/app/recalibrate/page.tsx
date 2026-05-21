'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { useFingerprint } from '@/hooks/useFingerprint'
import { saveFingerprint } from '@/storage/indexeddb'
import { emitEvent } from '@/lib/events'
import { RecalibrationQuiz } from '@/components/onboarding/RecalibrationQuiz'
import { MAX_RECALIBRATION_QUESTIONS } from '@/lib/diagnostic/recalibration'
import type { RecalibrationResult } from '@/lib/diagnostic/recalibration'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph

export default function RecalibratePage() {
  const router = useRouter()
  const [showIntro, setShowIntro] = useState(true)
  useFingerprint()
  const { fingerprint, setFingerprint } = useFingerprintStore()

  if (!fingerprint) {
    return (
      <div className="nc-gradient-page flex min-h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--nc-border)] border-t-[var(--nc-red)]" />
      </div>
    )
  }

  if (showIntro) {
    return (
      <div className="nc-gradient-page flex flex-col min-h-dvh">
        <div className="relative z-10 mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-5">
          <button
            onClick={() => router.push('/dashboard')}
            className="nc-glass flex size-10 items-center justify-center text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
            aria-label="Tilbake"
          >
            <ArrowLeft size={14} />
          </button>
          <span className="text-[13px] font-medium text-[var(--nc-text-muted)]">Tilbake til oversikten</span>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 pb-10 pt-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-6"
          >
            <div>
              <div className="nc-label mb-3">Sjekk-inn</div>
              <h1 className="text-balance text-[2rem] font-bold leading-tight text-nc-text">
                Tid for en liten repetisjon
              </h1>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-nc-text-muted">
                Noen konsepter har ikke blitt øvd på en stund. En rask sjekk hjelper oss å oppdatere profilen din.
              </p>
            </div>

            <div className="nc-glass p-4">
              <p className="text-sm text-nc-text-muted">
                <span className="font-medium text-nc-text">{MAX_RECALIBRATION_QUESTIONS} spørsmål</span>
                {' '}· tar omtrent 2–3 minutter
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowIntro(false)}
                className="nc-button-primary w-full px-5 py-3.5 text-sm font-medium"
              >
                Start
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full px-5 py-3 text-sm font-medium text-nc-text-dim transition-colors hover:text-nc-text"
              >
                Hopp over
              </button>
            </div>
          </motion.div>
        </div>
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
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <div className="relative z-10 mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-5">
        <button
          onClick={() => router.push('/dashboard')}
          className="nc-glass flex size-10 items-center justify-center text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
          aria-label="Back"
        >
          <ArrowLeft size={14} />
        </button>
        <span className="text-[13px] font-medium text-[var(--nc-text-muted)]">Back to dashboard</span>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-10 pt-6">
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
