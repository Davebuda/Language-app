'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ExerciseResult, SessionItem } from '@/types/session'
import type { ResolvedContent } from '@/types/content'
import type { RepairPlan } from '@/engine/repair-loop'
import { TranslationExercise } from './exercises/TranslationExercise'
import { FillInBlankExercise } from './exercises/FillInBlankExercise'
import { SpeedRound } from './exercises/SpeedRound'
import { ListeningExercise } from './exercises/ListeningExercise'
import WordOrderExerciseLazy from './exercises/WordOrderExerciseLazy'

interface ExerciseCardProps {
  item: SessionItem
  sentence: ResolvedContent
  sessionId: string
  onResult: (result: ExerciseResult) => void
  repairPlan?: RepairPlan | null
}

function NotYetAvailable({
  type,
  onResult,
  item,
  sessionId,
}: {
  type: string
  onResult: (result: ExerciseResult) => void
  item: SessionItem
  sentence: ResolvedContent
  sessionId: string
}) {
  return (
    <div className="space-y-5">
      <p className="nc-label">
        Exercise type
      </p>
      <p className="text-[18px] font-bold leading-snug text-nc-text">
        {type === 'reading-comprehension' ? 'Reading comprehension' : 'Free writing'} is coming soon.
      </p>
      <p className="text-sm text-nc-text-muted">
        This exercise type is not available yet. Tap continue to skip.
      </p>
      <button
        onClick={() =>
          onResult({
            sessionId,
            itemId: item.id,
            correct: true,
            userAnswer: '[skipped]',
            correctAnswer: '[skipped]',
            timeTakenSeconds: 0,
            conceptId: item.conceptIds[0] ?? '',
          })
        }
        className="nc-button-dark min-h-[48px] w-full px-6 py-3 transition-colors"
      >
        Continue
      </button>
    </div>
  )
}

export function ExerciseCard({
  item,
  sentence,
  sessionId,
  onResult,
  repairPlan: _,
}: ExerciseCardProps) {
  const [shakeKey, setShakeKey] = useState(0)
  const [wasWrong, setWasWrong] = useState(false)

  function handleResult(result: ExerciseResult) {
    if (!result.correct) {
      setShakeKey((current) => current + 1)
      setWasWrong(true)
    }
    onResult(result)
  }

  function renderExercise() {
    const props = { item, sentence, sessionId, onResult: handleResult }

    switch (item.exerciseType) {
      case 'translation-to-norwegian':
      case 'translation-to-english':
      case 'sentence-transformation':
        return <TranslationExercise {...props} />
      case 'fill-in-blank':
        return <FillInBlankExercise {...props} />
      case 'word-order':
        return <WordOrderExerciseLazy {...props} />
      case 'listening-comprehension':
      case 'dictation':
        return <ListeningExercise {...props} />
      case 'speed-round':
        return <SpeedRound {...props} />
      case 'reading-comprehension':
      case 'free-writing':
        return <NotYetAvailable type={item.exerciseType} onResult={onResult} item={item} sentence={sentence} sessionId={sessionId} />
      default:
        return <TranslationExercise {...props} />
    }
  }

  return (
    <motion.div
      key={shakeKey}
      animate={wasWrong && shakeKey > 0 ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
      transition={{ duration: 0.4 }}
      onAnimationComplete={() => setWasWrong(false)}
      className="nc-glass-cream-strong p-6"
    >
      <div className="relative z-[1]">{renderExercise()}</div>
    </motion.div>
  )
}
