'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ExerciseResult, SessionItem } from '@/types/session'
import { isNotYetAvailableType } from '@/types/session'
import type { ResolvedContent } from '@/types/content'
import type { RepairPlan } from '@/engine/repair-loop'
import { TranslationExercise } from './exercises/TranslationExercise'
import { FillInBlankExercise } from './exercises/FillInBlankExercise'
import { SpeedRound } from './exercises/SpeedRound'
import { ListeningExercise } from './exercises/ListeningExercise'
import WordOrderExerciseLazy from './exercises/WordOrderExerciseLazy'
import { ClozePassageExercise } from './exercises/ClozePassageExercise'
import { SpeakingProductionExercise } from './exercises/SpeakingProductionExercise'
import type { ResolvedClozePassage } from '@/types/content'

interface ExerciseCardProps {
  item: SessionItem
  sentence?: ResolvedContent
  sessionId: string
  onResult: (result: ExerciseResult) => void
  repairPlan?: RepairPlan | null
  clozePassage?: ResolvedClozePassage | null
  onClozeResults?: (results: ExerciseResult[]) => void
  onSpeakingResult?: (outcome: { produced: boolean; conceptId: string; itemId: string }) => void
}

// Display labels for the phantom/not-yet-available types. The canonical SET of
// such types lives in @/types/session (NOT_YET_AVAILABLE_TYPES) and is shared
// with the scheduler so it never schedules a type it cannot render. This map
// only supplies the Norwegian label for the honest "kommer snart" banner
// (Operating Rule 6).
const NOT_YET_LABELS: Record<string, string> = {
  'reading-comprehension': 'Leseforståelse',
  'free-writing': 'Fri skriving',
  'sentence-transformation': 'Setningsomforming',
  dictation: 'Diktat',
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
  sessionId: string
}) {
  return (
    <div className="space-y-4">
      <p className="nc-label text-[var(--nc-cream-dim)]">
        Øvelsestype
      </p>
      <p className="font-display text-[1.45rem] font-bold leading-snug text-[var(--nc-cream-text)]">
        {NOT_YET_LABELS[type] ?? 'Denne øvelsen'} kommer snart.
      </p>
      <p className="text-pretty text-sm leading-6 text-[var(--nc-cream-muted)]">
        Denne øvelsestypen er ikke tilgjengelig ennå. Trykk for å hoppe over.
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
        Fortsett
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
  clozePassage,
  onClozeResults,
  onSpeakingResult,
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
    // Cloze passage uses clozePassage, not a single sentence.
    if (item.exerciseType === 'cloze-passage') {
      if (clozePassage && onClozeResults) {
        return (
          <ClozePassageExercise
            passage={clozePassage}
            sessionId={sessionId}
            itemId={item.id}
            onClozeResults={onClozeResults}
          />
        )
      }
      // Unresolved cloze (no authored passage): honest banner, never a silent
      // substitution to another exercise (Operating Rule 6).
      return <NotYetAvailable type={item.exerciseType} onResult={onResult} item={item} sessionId={sessionId} />
    }

    // Every other exercise type requires a resolved sentence.
    if (!sentence) {
      return <NotYetAvailable type={item.exerciseType} onResult={onResult} item={item} sessionId={sessionId} />
    }

    // Defensive fallback (Operating Rule 6): the scheduler now excludes phantom
    // types (NOT_YET_AVAILABLE_TYPES) so one should never reach here — but if it
    // ever does, show the honest "kommer snart" banner instead of silently
    // rendering as a different exercise.
    if (isNotYetAvailableType(item.exerciseType)) {
      return <NotYetAvailable type={item.exerciseType} onResult={onResult} item={item} sessionId={sessionId} />
    }

    const props = { item, sentence, sessionId, onResult: handleResult }

    switch (item.exerciseType) {
      case 'translation-to-norwegian':
      case 'translation-to-english':
        return <TranslationExercise {...props} />
      case 'fill-in-blank':
        return <FillInBlankExercise {...props} />
      case 'word-order':
        return <WordOrderExerciseLazy {...props} />
      case 'listening-comprehension':
        return <ListeningExercise {...props} />
      case 'speed-round':
        return <SpeedRound {...props} />
      case 'speaking-production':
        return (
          <SpeakingProductionExercise
            sentence={sentence}
            onComplete={(produced) =>
              onSpeakingResult?.({
                produced,
                conceptId: item.conceptIds[0] ?? '',
                itemId: item.id,
              })
            }
          />
        )
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
      className="overflow-hidden rounded-[0.75rem] bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)] shadow-[0_18px_48px_rgba(0,0,0,0.22)]"
    >
      {/* Lime accent top-bar — single lime focal element on the card */}
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,var(--nc-signal)_0%,#B8EF10_100%)]" />
      <div className="relative z-[1] p-3.5">{renderExercise()}</div>
    </motion.div>
  )
}
