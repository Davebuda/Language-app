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
      className="nc-panel-dark p-5"
    >
      <div className="absolute inset-0 opacity-45">
        <div className="nc-pattern-orbits absolute inset-0 bg-no-repeat" />
        <div className="nc-pattern-topography absolute inset-x-[48%] bottom-[-12%] h-[56%]" />
      </div>
      <div className="relative z-[1]">{renderExercise()}</div>
    </motion.div>
  )
}
