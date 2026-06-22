'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionItem, ExerciseResult } from '@/types/session'
import type { ResolvedContent } from '@/types/content'
import { gradeAnswer } from '@/app/session/actions'
import { resolveSeedAudioUrl } from '@/lib/audio-utils'

interface ListeningExerciseProps {
  item: SessionItem
  sentence: ResolvedContent
  sessionId: string
  onResult: (result: ExerciseResult) => void
}

interface HowlInstance {
  play: () => void
  rate: (r: number) => void
  unload: () => void
}

function useHowlerAudio(audioUrl: string) {
  const howlRef = useRef<HowlInstance | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  // Set when the MP3 fails to load/play (e.g. a file missing on the server).
  // The component falls back to TTS rather than leaving a dead "Spill av"
  // button (Operating Rule 6).
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    if (!audioUrl) return
    setIsLoaded(false)
    setLoadFailed(false)
    import('howler').then(({ Howl }) => {
      howlRef.current = new Howl({
        src: [audioUrl],
        format: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'webm'],
        html5: true,
        onload: () => setIsLoaded(true),
        onplay: () => setIsPlaying(true),
        onend: () => setIsPlaying(false),
        onloaderror: () => setLoadFailed(true),
        onplayerror: () => setLoadFailed(true),
      }) as unknown as HowlInstance
    })
    return () => {
      howlRef.current?.unload()
    }
  }, [audioUrl])

  const play = () => howlRef.current?.play()
  const setRate = (r: number) => howlRef.current?.rate(r)
  return { play, setRate, isLoaded, isPlaying, loadFailed }
}

function useTTS(text: string) {
  const [isPlaying, setIsPlaying] = useState(false)

  const speak = useCallback(
    (rate = 1) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = 'nb-NO'
      utt.rate = rate
      utt.onstart = () => setIsPlaying(true)
      utt.onend = () => setIsPlaying(false)
      utt.onerror = () => setIsPlaying(false)
      window.speechSynthesis.speak(utt)
    },
    [text],
  )

  useEffect(() => () => {
    window.speechSynthesis?.cancel()
  }, [])

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window
  return { speak, isPlaying, isSupported }
}

export function ListeningExercise({ item, sentence, sessionId, onResult }: ListeningExerciseProps) {
  const [userInput, setUserInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [resultAnnouncement, setResultAnnouncement] = useState('')
  const startRef = useRef(Date.now())

  // Use the real pre-generated MP3 for seed sentences (100% coverage); TTS is
  // only a fallback for generated content or a missing file (Rule 6), not the
  // default. Previously audioUrl was always empty, so every learner heard
  // robotic browser TTS instead of the nb-NO-PernilleNeural recordings.
  const resolvedAudioUrl = resolveSeedAudioUrl(sentence.audioUrl, sentence.id, sentence.source)
  const howler = useHowlerAudio(resolvedAudioUrl ?? '')
  const tts = useTTS(sentence.norwegian)
  const useMp3 = !!resolvedAudioUrl && !howler.loadFailed

  async function submit() {
    if (submitted || !userInput.trim()) return
    setSubmitted(true)
    // S-01: pass the resolved content for AI-generated items (id resolves nowhere).
    const fallback = sentence.source === 'generated'
      ? { norwegian: sentence.norwegian, english: sentence.english, notes: sentence.notes, errorTagsDetectable: sentence.errorTagsDetectable, acceptedAnswers: sentence.acceptedAnswers }
      : undefined
    const graded = await gradeAnswer(sentence.id, item.exerciseType, userInput, fallback)
    if (!graded) {
      console.warn(`[ListeningExercise] gradeAnswer returned null for sentence ${sentence.id}`)
      setSubmitted(false)
      return
    }
    const { correct, correctAnswer, errorTag } = graded
    setResultAnnouncement(correct ? 'Riktig svar.' : 'Feil svar.')
    onResult({
      sessionId,
      itemId: item.id,
      correct,
      userAnswer: userInput,
      correctAnswer,
      timeTakenSeconds: (Date.now() - startRef.current) / 1000,
      errorTag: correct ? undefined : (errorTag ?? 'listening-recognition'),
      conceptId: item.conceptIds[0] ?? '',
    })
  }

  // Audio buttons use dark surface so they read on cream card background
  const audioButtonClass =
    'min-h-[48px] rounded-[0.65rem] border border-[rgba(17,21,24,0.12)] bg-[rgba(17,21,24,0.06)] px-5 py-3 text-[0.88rem] font-semibold text-[var(--nc-cream-text)] transition-colors hover:bg-[rgba(17,21,24,0.10)] disabled:opacity-40'

  return (
    <div className="space-y-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
        Lytt og skriv hva du hørte
      </p>

      {useMp3 ? (
        <div className="flex gap-2.5">
          <button
            onClick={() => howler.play()}
            disabled={!howler.isLoaded || submitted}
            className={`flex-1 ${audioButtonClass}`}
            aria-label={howler.isPlaying ? 'Spiller av lyd' : 'Spill av lyd'}
          >
            {howler.isPlaying ? 'Spiller…' : 'Spill av'}
          </button>
          <button
            onClick={() => howler.setRate(0.75)}
            disabled={!howler.isLoaded || submitted}
            className={audioButtonClass}
            aria-label="Spill av sakte"
          >
            0.75×
          </button>
        </div>
      ) : tts.isSupported ? (
        <div className="flex gap-2.5">
          <button
            onClick={() => tts.speak(1)}
            disabled={submitted}
            className={`flex-1 ${audioButtonClass}`}
            aria-label={tts.isPlaying ? 'Spiller av lyd' : 'Spill av lyd'}
          >
            {tts.isPlaying ? 'Spiller…' : 'Spill av'}
          </button>
          <button
            onClick={() => tts.speak(0.75)}
            disabled={submitted}
            className={audioButtonClass}
            aria-label="Spill av sakte"
          >
            0.75×
          </button>
        </div>
      ) : (
        <div className="rounded-[0.65rem] border border-[rgba(17,21,24,0.10)] bg-[rgba(17,21,24,0.04)] px-4 py-3.5 text-[0.84rem] text-[var(--nc-cream-muted)]">
          Lyd er ikke tilgjengelig i denne nettleseren.
        </div>
      )}

      <input
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit()
        }}
        disabled={submitted}
        placeholder="Skriv hva du hørte…"
        className="nc-input-cream"
      />
      <button
        onClick={() => void submit()}
        disabled={submitted || !userInput.trim()}
        className="nc-button-primary min-h-[52px] w-full px-6 py-3 text-[0.9375rem] font-bold disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
      >
        Sjekk svar
      </button>
      <div aria-live="polite" className="sr-only">{resultAnnouncement}</div>
    </div>
  )
}
