'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal browser typings for the Web Speech API
// (not in @types/react — browser vendor types only)
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: { readonly transcript: string }
}

interface SpeechRecognitionEvent {
  readonly results: {
    readonly length: number
    readonly [index: number]: SpeechRecognitionResult
  }
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface UseSpeechRecognitionReturn {
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  start: () => void
  stop: () => void
  reset: () => void
}

export interface UseSpeechRecognitionOptions {
  /**
   * When true, recognition keeps listening through natural pauses instead of
   * ending on the first finalized utterance — the caller decides when to stop()
   * (e.g. a "done" button or a countdown). Gives learners time to think mid-answer.
   * Default false preserves the one-shot behaviour every other consumer relies on.
   */
  continuous?: boolean
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const { continuous = false } = options
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionCtor() !== null

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    // Abort any active session before starting a fresh one
    recognitionRef.current?.abort()

    const rec = new Ctor()
    recognitionRef.current = rec
    rec.lang = 'nb-NO'
    rec.continuous = continuous
    rec.interimResults = true

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      // In continuous mode e.results is cumulative, so this rebuilds the full
      // finalized transcript across every pause — not just the latest utterance.
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          finalText += text
        } else {
          interimText += text
        }
      }

      if (finalText) {
        setTranscript(finalText)
        setInterimTranscript('')
        // One-shot: a finalized utterance ends the turn. Continuous: keep listening
        // through the pause so the learner isn't cut off — the caller stops it.
        if (!continuous) setIsListening(false)
      } else {
        setInterimTranscript(interimText)
      }
    }

    rec.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    rec.onerror = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    rec.start()
    setIsListening(true)
    setTranscript('')
    setInterimTranscript('')
  }, [continuous])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const reset = useCallback(() => {
    recognitionRef.current?.abort()
    setIsListening(false)
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return { transcript, interimTranscript, isListening, isSupported, start, stop, reset }
}
